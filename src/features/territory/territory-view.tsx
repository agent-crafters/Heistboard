"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  DEFAULT_TERRITORY_CAMERA,
  OPENFREEMAP_LIBERTY_STYLE,
  STANDARD_TERRITORY_ATTRIBUTION,
  getCategoryLabel,
  type PlaceCandidate,
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";
import { defaultPlaceSearchService } from "@/lib/place-search";
import {
  captureTerritoryShot,
  type CapturePhase,
} from "@/lib/territory-capture";

export interface TerritoryLockedResult {
  source: "custom-search" | "sample-fallback";
  blob?: Blob;
  camera?: TerritoryCameraState;
  attribution: TerritoryAttribution;
}

export interface TerritoryViewProps {
  onLockTerritory: (result: TerritoryLockedResult) => void;
  onSelectSampleFallback: () => void;
  initialCamera?: TerritoryCameraState;
}

export function TerritoryView({
  onLockTerritory,
  onSelectSampleFallback,
  initialCamera = DEFAULT_TERRITORY_CAMERA,
}: TerritoryViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const [camera, setCamera] = useState<TerritoryCameraState>(initialCamera);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("initializing");
  const [captureError, setCaptureError] = useState<string | null>(null);

  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre GL JS
  useEffect(() => {
    let active = true;
    let map: MapLibreMap | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (!active || !mapContainerRef.current) return;

      const hasWebGL = checkWebGLSupported();
      if (!hasWebGL) {
        setWebglSupported(false);
        return;
      }

      maplibregl.config.WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

      try {
        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: OPENFREEMAP_LIBERTY_STYLE,
          center: initialCamera.center,
          zoom: initialCamera.zoom,
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
          attributionControl: false,
          fadeDuration: 0,
        });

        map.addControl(
          new maplibregl.NavigationControl({
            visualizePitch: true,
            showCompass: true,
          }),
          "top-right",
        );

        map.on("webglcontextlost", () => {
          if (!active) return;
          setContextLost(true);
        });

        map.on("error", (e) => {
          console.warn("MapLibre map notice:", e);
        });

        map.on("load", () => {
          if (!active) return;
          setMapLoaded(true);

          // Add stylized 3D building extrusions if building data exists
          try {
            const style = map?.getStyle();
            if (style && map && !map.getLayer("heistboard-3d-buildings")) {
              const hasOpenMapTiles = Boolean(map.getSource("openmaptiles"));
              if (hasOpenMapTiles) {
                if (map.getLayer("building-3d")) {
                  map.setLayoutProperty("building-3d", "visibility", "none");
                }
                map.addLayer({
                  id: "heistboard-3d-buildings",
                  source: "openmaptiles",
                  "source-layer": "building",
                  type: "fill-extrusion",
                  minzoom: 14,
                  paint: {
                    "fill-extrusion-color": [
                      "interpolate",
                      ["linear"],
                      ["coalesce", ["get", "render_height"], 0],
                      0,
                      "#252d3a",
                      40,
                      "#374558",
                      90,
                      "#ef7866",
                    ],
                    "fill-extrusion-height": [
                      "coalesce",
                      ["get", "render_height"],
                      ["get", "height"],
                      15,
                    ],
                    "fill-extrusion-base": [
                      "coalesce",
                      ["get", "render_min_height"],
                      ["get", "min_height"],
                      0,
                    ],
                    "fill-extrusion-opacity": 0.88,
                  },
                });
              }
            }
          } catch (e) {
            console.warn("Could not inject 3d building extrusion layer:", e);
          }
        });

        const updateCamera = () => {
          if (!map) return;
          const center = map.getCenter();
          setCamera({
            center: [
              parseFloat(center.lng.toFixed(5)),
              parseFloat(center.lat.toFixed(5)),
            ],
            zoom: parseFloat(map.getZoom().toFixed(2)),
            pitch: Math.round(map.getPitch()),
            bearing: Math.round(map.getBearing()),
          });
        };

        map.on("move", updateCamera);
        mapInstanceRef.current = map;
      } catch (err) {
        console.error("MapLibre initialization error:", err);
        setWebglSupported(false);
      }
    }

    void initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initialCamera]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setFocusedIndex(-1);

    try {
      const candidates = await defaultPlaceSearchService.search(query);
      setSearchResults(candidates);
      if (candidates.length === 0) {
        setSearchError(
          `No territories found for "${query}". Try searching a city, neighborhood, street, or landmark.`,
        );
      } else if (candidates.length === 1) {
        handleSelectCandidate(candidates[0]);
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "Search failed. Check your network connection or use the sample map fallback.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = (candidate: PlaceCandidate) => {
    setSelectedPlace(candidate);
    setSearchResults([]);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (candidate.boundingBox) {
      // Bounding box order: [south, north, west, east]
      const [south, north, west, east] = candidate.boundingBox;
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          pitch: 55,
          bearing: -20,
          maxZoom: 16.5,
          duration: 1200,
        },
      );
    } else {
      map.flyTo({
        center: [candidate.lon, candidate.lat],
        zoom: 16,
        pitch: 55,
        bearing: -20,
        essential: true,
        duration: 1200,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleSelectCandidate(searchResults[focusedIndex]);
    } else if (e.key === "Escape") {
      setSearchResults([]);
      setFocusedIndex(-1);
    }
  };

  const handleSetPresetPitch = (pitch: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({ pitch, duration: 500 });
    }
  };

  const handlePitchSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = Number(e.target.value);
    const map = mapInstanceRef.current;
    if (map) {
      map.setPitch(newPitch);
    }
  };

  const handleResetBearing = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({ bearing: 0, duration: 400 });
    }
  };

  const handleZoomDelta = (delta: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({ zoom: map.getZoom() + delta, duration: 300 });
    }
  };

  const handleLockTerritory = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    setCapturePhase("initializing");

    try {
      const result = await captureTerritoryShot(camera, {
        onProgress: (phase) => setCapturePhase(phase),
      });
      onLockTerritory({
        source: "custom-search",
        blob: result.blob,
        camera: result.camera,
        attribution: STANDARD_TERRITORY_ATTRIBUTION,
      });
    } catch (err) {
      setCaptureError(
        err instanceof Error
          ? err.message
          : "Could not capture territory shot. You can retry or switch to the sample map.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const capturePhaseLabel: Record<CapturePhase, string> = {
    initializing: "Initializing WebGL capture surface…",
    "loading-tiles": "Fetching and loading vector tiles…",
    rendering: "Rendering 3D perspective & extrusions…",
    encoding: "Encoding 3:2 raster PNG Blob…",
    verifying: "Verifying decoded Map Base…",
  };

  return (
    <div className="territory-workspace" aria-label="Territory composition workspace">
      {/* Left Control Panel */}
      <div className="territory-control-panel">
        <div className="territory-heading">
          <p className="section-label">Stage 01 / Territory Search & Composition</p>
          <h2>Find and lock your target area</h2>
          <p className="territory-lede">
            Search for any city, neighborhood, street, or landmark. Compose your 3D
            camera angle inside the tactical framing reticle, then lock the shot.
          </p>
        </div>

        {/* Place Search */}
        <div className="search-container" onKeyDown={handleKeyDown}>
          <form className="territory-search-form" onSubmit={handleSearchSubmit}>
            <label htmlFor="territory-search-input" className="visually-hidden">
              Search neighborhood, street, city, or landmark
            </label>
            <div className="search-input-group">
              <input
                id="territory-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. SoHo Manhattan, Champs-Élysées, Shibuya…"
                disabled={isSearching || isCapturing}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="territory-candidates-list"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  aria-label="Clear search input"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="action-button primary search-btn"
                disabled={isSearching || !searchQuery.trim() || isCapturing}
              >
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>
            <small className="search-privacy-hint">
              Explicit submit only (1 req/sec limit). Ephemeral session search; no queries or coordinates are stored.
            </small>
          </form>

          {searchError && (
            <div className="search-error-callout" role="alert">
              <p>{searchError}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div
              id="territory-candidates-list"
              className="search-candidates-list"
              role="listbox"
              aria-label="Disambiguated search results"
            >
              <p className="candidates-label">
                Disambiguate ({searchResults.length} matches):
              </p>
              <ul>
                {searchResults.map((candidate, idx) => (
                  <li key={candidate.id} role="option" aria-selected={focusedIndex === idx}>
                    <button
                      type="button"
                      className={`candidate-button ${
                        selectedPlace?.id === candidate.id ? "active" : ""
                      } ${focusedIndex === idx ? "focused" : ""}`}
                      onClick={() => handleSelectCandidate(candidate)}
                    >
                      <div className="candidate-header">
                        <strong className="candidate-name">{candidate.name}</strong>
                        <span className={`category-pill category-${candidate.category}`}>
                          {getCategoryLabel(candidate.category)}
                        </span>
                      </div>
                      <span className="candidate-subtitle">{candidate.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Selected Territory Indicator */}
        {selectedPlace && (
          <div className="selected-territory-banner">
            <span className="territory-tag">Target Locked:</span>
            <strong>{selectedPlace.name}</strong>
            <small>{selectedPlace.subtitle}</small>
          </div>
        )}

        {/* Camera Controls & Metrics */}
        <div className="camera-inspector">
          <div className="camera-metrics">
            <span title="Longitude, Latitude">
              <strong>Center:</strong> {camera.center[0]}, {camera.center[1]}
            </span>
            <span>
              <strong>Zoom:</strong> {camera.zoom}
            </span>
            <span>
              <strong>Pitch:</strong> {camera.pitch}°
            </span>
            <span>
              <strong>Bearing:</strong> {camera.bearing}°
            </span>
          </div>

          {/* Quick Pitch Presets */}
          <div className="camera-presets">
            <span className="preset-label">3D Angle:</span>
            <button
              type="button"
              className={`preset-button ${camera.pitch <= 10 ? "active" : ""}`}
              onClick={() => handleSetPresetPitch(0)}
            >
              Top-Down (0°)
            </button>
            <button
              type="button"
              className={`preset-button ${camera.pitch >= 25 && camera.pitch <= 35 ? "active" : ""}`}
              onClick={() => handleSetPresetPitch(30)}
            >
              Street (30°)
            </button>
            <button
              type="button"
              className={`preset-button ${camera.pitch >= 40 && camera.pitch <= 50 ? "active" : ""}`}
              onClick={() => handleSetPresetPitch(45)}
            >
              Isometric (45°)
            </button>
            <button
              type="button"
              className={`preset-button ${camera.pitch >= 55 ? "active" : ""}`}
              onClick={() => handleSetPresetPitch(60)}
            >
              Cinematic (60°)
            </button>
          </div>

          {/* Pitch Slider */}
          <div className="pitch-slider-group">
            <label htmlFor="pitch-slider">Fine Pitch Angle ({camera.pitch}°):</label>
            <input
              id="pitch-slider"
              type="range"
              min="0"
              max="70"
              value={camera.pitch}
              onChange={handlePitchSlider}
              disabled={isCapturing}
            />
          </div>

          {/* Bearing & Zoom Helpers */}
          <div className="camera-helpers">
            <button
              type="button"
              className="helper-button compass-btn"
              onClick={handleResetBearing}
              title="Reset view to North"
            >
              🧭 Reset North ({camera.bearing}°)
            </button>
            <div className="zoom-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleZoomDelta(-0.5)}
                title="Zoom out"
              >
                −
              </button>
              <span className="stepper-val">{camera.zoom}z</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleZoomDelta(0.5)}
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          {/* Approximate 3D Geometry Disclaimer */}
          <p className="building-extrusion-disclaimer">
            ℹ️ <strong>Stylized 3D Context:</strong> Building extrusions and heights are
            approximate models rendered from available OpenStreetMap data for fictional
            mission planning, not survey-accurate or navigation models.
          </p>
        </div>

        {/* WebGL Unavailability or Context Loss Recovery */}
        {(!webglSupported || contextLost) && (
          <div className="webgl-recovery-callout" role="alert">
            <h4>WebGL Hardware Acceleration Unavailable</h4>
            <p>
              Your browser or environment could not initialize WebGL for interactive 3D
              rendering. You can continue seamlessly with the verified original sample map.
            </p>
            <button
              type="button"
              className="action-button primary"
              onClick={onSelectSampleFallback}
            >
              Switch to Original Sample Map
            </button>
          </div>
        )}

        {captureError && (
          <div className="capture-error-callout" role="alert">
            <p>{captureError}</p>
            <button
              type="button"
              className="action-button secondary"
              onClick={handleLockTerritory}
            >
              Retry Capture
            </button>
          </div>
        )}

        {/* Capture Action Buttons */}
        <div className="territory-actions">
          <button
            type="button"
            className="action-button primary-accent lock-button"
            onClick={handleLockTerritory}
            disabled={isCapturing || !mapLoaded || !webglSupported || contextLost}
          >
            {isCapturing
              ? capturePhaseLabel[capturePhase]
              : "Lock Territory Shot (3:2 Frame)"}
          </button>

          <button
            type="button"
            className="action-button tertiary fallback-button"
            onClick={onSelectSampleFallback}
            disabled={isCapturing}
          >
            Use Fictional Sample Map Instead
          </button>
        </div>
      </div>

      {/* Right 3D Map Column with Tactical 3:2 Framing Reticle */}
      <div className="territory-map-column">
        <div
          ref={mapContainerRef}
          className="territory-map-canvas-container"
          aria-label="Interactive 3D vector map"
        />

        {/* Tactical 3:2 Framing Overlay */}
        <div className="tactical-framing-overlay" aria-hidden="true">
          <div className="framing-reticle">
            <div className="reticle-corner top-left" />
            <div className="reticle-corner top-right" />
            <div className="reticle-corner bottom-left" />
            <div className="reticle-corner bottom-right" />
            <div className="reticle-crosshair" />
            <div className="reticle-badge">3:2 Map Base Frame (1200 × 800)</div>
          </div>
        </div>

        {/* Attribution Overlay */}
        <div className="map-attribution-overlay" aria-label="Map Data Attribution">
          <span>{STANDARD_TERRITORY_ATTRIBUTION.noticeText} · </span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            {STANDARD_TERRITORY_ATTRIBUTION.printedUrl}
          </a>
        </div>
      </div>
    </div>
  );
}

function checkWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

