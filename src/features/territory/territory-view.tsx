"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  DEFAULT_TERRITORY_CAMERA,
  OPENFREEMAP_LIBERTY_STYLE,
  STANDARD_TERRITORY_ATTRIBUTION,
  type PlaceCandidate,
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";
import { defaultPlaceSearchService } from "@/lib/place-search";
import { captureTerritoryShot } from "@/lib/territory-capture";

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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre GL JS
  useEffect(() => {
    let active = true;
    let map: MapLibreMap | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (!active || !mapContainerRef.current) return;

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

      map.on("load", () => {
        if (!active) return;
        setMapLoaded(true);

        // Ensure 3D building extrusion layer is present
        try {
          const style = map?.getStyle();
          if (style && map && !map.getLayer("heistboard-3d-buildings")) {
            const hasOpenMapTiles = Boolean(map.getSource("openmaptiles"));
            if (hasOpenMapTiles) {
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
                    ["get", "render_height"],
                    0,
                    "#2a3342",
                    50,
                    "#3d4d63",
                    100,
                    "#ff0055",
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
                  "fill-extrusion-opacity": 0.9,
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

    try {
      const candidates = await defaultPlaceSearchService.search(query);
      setSearchResults(candidates);
      if (candidates.length === 0) {
        setSearchError(`No territories found matching "${query}". Try a city, street, or landmark.`);
      } else if (candidates.length === 1) {
        handleSelectCandidate(candidates[0]);
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "Search failed. Check your connection or use the sample map fallback.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = (candidate: PlaceCandidate) => {
    setSelectedPlace(candidate);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: [candidate.lon, candidate.lat],
        zoom: 16,
        pitch: 55,
        bearing: -20,
        essential: true,
      });
    }
  };

  const handleSetPresetPitch = (pitch: number, bearing = camera.bearing) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({ pitch, bearing, duration: 600 });
    }
  };

  const handleLockTerritory = async () => {
    setIsCapturing(true);
    setCaptureError(null);

    try {
      const result = await captureTerritoryShot(camera);
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
          : "Could not capture territory shot. You can retry or use the sample map.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="territory-workspace" aria-label="Territory composition workspace">
      <div className="territory-control-panel">
        <div className="territory-heading">
          <p className="section-label">Stage 01 / Territory</p>
          <h2>Find and compose your target area</h2>
          <p className="territory-lede">
            Search for a real-world neighborhood, adjust the 3D perspective, and lock your
            Territory Shot to generate the raster Map Base.
          </p>
        </div>

        <form className="territory-search-form" onSubmit={handleSearchSubmit}>
          <label htmlFor="territory-search-input" className="visually-hidden">
            Search neighborhood, street, or landmark
          </label>
          <div className="search-input-group">
            <input
              id="territory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Southbank London, Lower Manhattan, Shinjuku…"
              disabled={isSearching || isCapturing}
              autoComplete="off"
            />
            <button
              type="submit"
              className="action-button primary"
              disabled={isSearching || !searchQuery.trim() || isCapturing}
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </div>
          <small className="search-privacy-hint">
            Explicit-submit search only. In-memory throttled (1 req/sec). Coordinates are not saved.
          </small>
        </form>

        {searchError && (
          <div className="search-error-callout" role="alert">
            <p>{searchError}</p>
          </div>
        )}

        {searchResults.length > 1 && (
          <div className="search-candidates-list" aria-label="Disambiguated search results">
            <p className="candidates-label">Select matching territory:</p>
            <ul>
              {searchResults.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className={`candidate-button ${
                      selectedPlace?.id === candidate.id ? "active" : ""
                    }`}
                    onClick={() => handleSelectCandidate(candidate)}
                  >
                    <strong>{candidate.name}</strong>
                    <span>{candidate.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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

          <div className="camera-presets">
            <span className="preset-label">3D Angles:</span>
            <button
              type="button"
              className="preset-button"
              onClick={() => handleSetPresetPitch(0)}
            >
              Planar (0°)
            </button>
            <button
              type="button"
              className="preset-button"
              onClick={() => handleSetPresetPitch(45)}
            >
              Isometric (45°)
            </button>
            <button
              type="button"
              className="preset-button"
              onClick={() => handleSetPresetPitch(60, -30)}
            >
              Cinematic (60°)
            </button>
          </div>
        </div>

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

        <div className="territory-actions">
          <button
            type="button"
            className="action-button primary-accent lock-button"
            onClick={handleLockTerritory}
            disabled={isCapturing || !mapLoaded}
          >
            {isCapturing ? "Rasterizing 3D Map Base…" : "Lock Territory Shot"}
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

      <div className="territory-map-column">
        <div
          ref={mapContainerRef}
          className="territory-map-canvas-container"
          aria-label="Interactive 3D vector map"
        />

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
