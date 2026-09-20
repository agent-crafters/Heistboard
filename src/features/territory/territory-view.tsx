"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  OPENFREEMAP_LIBERTY_STYLE,
  REALISTIC_TERRITORY_ATTRIBUTION,
  STANDARD_TERRITORY_ATTRIBUTION,
  getCategoryLabel,
  type MapLayerMode,
  type PlaceCandidate,
  type PlaceCategory,
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";
import {
  getRandomGtaLocation,
  type GtaLocationHotspot,
} from "@/domain/gta-locations";
import { defaultPlaceSearchService } from "@/lib/place-search";
import {
  captureTerritoryShot,
  type CapturePhase,
} from "@/lib/territory-capture";
import {
  applyMapLayers,
  updateTargetLocationMarker,
} from "@/lib/territory-layers";

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

function hotspotToCandidate(hotspot: GtaLocationHotspot): PlaceCandidate {
  const category: PlaceCategory =
    hotspot.category === "city"
      ? "city"
      : hotspot.category === "neighborhood"
        ? "neighborhood"
        : "landmark";

  return {
    id: `gta-${hotspot.id}`,
    name: hotspot.name,
    displayName: `${hotspot.name}, ${hotspot.subtitle}`,
    subtitle: `${hotspot.codename} • ${hotspot.subtitle}`,
    category,
    lon: hotspot.camera.center[0],
    lat: hotspot.camera.center[1],
  };
}

export function TerritoryView({
  onLockTerritory,
  onSelectSampleFallback,
  initialCamera,
}: TerritoryViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  // Default to a random iconic GTA VI / Leonida hotspot when no custom camera is passed
  const [initialGtaHotspot] = useState<GtaLocationHotspot>(() => getRandomGtaLocation());
  const activeInitialCamera = initialCamera ?? initialGtaHotspot.camera;

  const [camera, setCamera] = useState<TerritoryCameraState>(activeInitialCamera);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(() => {
    if (initialCamera) return null;
    return hotspotToCandidate(initialGtaHotspot);
  });
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("initializing");
  const [captureError, setCaptureError] = useState<string | null>(null);

  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerMode, setLayerMode] = useState<MapLayerMode>("realistic");
  const layerModeRef = useRef(layerMode);
  const [show3dBuildings, setShow3dBuildings] = useState(false);
  const show3dBuildingsRef = useRef(show3dBuildings);
  const selectedPlaceRef = useRef(selectedPlace);

  // Keep map layers in sync when layerMode or show3dBuildings changes
  useEffect(() => {
    layerModeRef.current = layerMode;
    show3dBuildingsRef.current = show3dBuildings;
    if (mapInstanceRef.current && mapLoaded) {
      applyMapLayers(mapInstanceRef.current, layerMode, { show3dBuildings });
    }
  }, [layerMode, show3dBuildings, mapLoaded]);

  // Keep target location marker in sync with selectedPlace
  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
    if (mapInstanceRef.current && mapLoaded) {
      updateTargetLocationMarker(mapInstanceRef.current, selectedPlace);
    }
  }, [selectedPlace, mapLoaded]);

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
          center: activeInitialCamera.center,
          zoom: activeInitialCamera.zoom,
          pitch: activeInitialCamera.pitch,
          bearing: activeInitialCamera.bearing,
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

        // Consume provider errors without logging tile URLs or coordinate-bearing payloads.
        map.on("error", () => {});

        map.on("load", () => {
          if (!active || !map) return;
          setMapLoaded(true);
          applyMapLayers(map, layerModeRef.current, {
            show3dBuildings: show3dBuildingsRef.current,
          });
          if (selectedPlaceRef.current) {
            updateTargetLocationMarker(map, selectedPlaceRef.current);
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
      } catch {
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
  }, [activeInitialCamera]);

  const handleRandomizeGtaLocation = () => {
    const currentId = selectedPlace?.id?.startsWith("gta-")
      ? selectedPlace.id.replace(/^gta-/, "")
      : undefined;
    const nextHotspot = getRandomGtaLocation(currentId);
    setSelectedPlace(hotspotToCandidate(nextHotspot));
    setSearchResults([]);
    setSearchError(null);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: nextHotspot.camera.center,
        zoom: nextHotspot.camera.zoom,
        pitch: nextHotspot.camera.pitch,
        bearing: nextHotspot.camera.bearing,
        essential: true,
        duration: 1600,
      });
    }
  };

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

  const activeAttribution =
    layerMode === "realistic"
      ? REALISTIC_TERRITORY_ATTRIBUTION
      : STANDARD_TERRITORY_ATTRIBUTION;

  const handleLockTerritory = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    setCapturePhase("initializing");

    const container = mapContainerRef.current;
    const containerWidth = container?.clientWidth || 1200;

    // Use crisp 16:9 cinematic widescreen capture ratio so the map fills the full screen editor without side pillarboxing
    const scale = Math.min(2, Math.max(1, 1600 / containerWidth));
    const baseWidth = Math.max(1600, Math.round(containerWidth * scale));
    const captureWidth = Math.min(1920, baseWidth);
    const captureHeight = Math.round(captureWidth * (9 / 16));

    try {
      const result = await captureTerritoryShot(camera, {
        layerMode,
        show3dBuildings,
        targetPlace: selectedPlace,
        width: captureWidth,
        height: captureHeight,
        onProgress: (phase) => setCapturePhase(phase),
      });
      onLockTerritory({
        source: "custom-search",
        blob: result.blob,
        camera: result.camera,
        attribution: activeAttribution,
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
    encoding: "Encoding 16:9 widescreen raster PNG Blob…",
    verifying: "Verifying decoded Map Base…",
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-64px)] bg-ink text-paper select-none" aria-label="Territory composition workspace">
      {/* Left Control Panel */}
      <div className="w-full lg:w-[460px] p-4 sm:p-6 bg-charcoal-900/90 border-r border-coral/20 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-xl">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-coral font-bold">Stage 01 / Territory Search & Composition</p>
          <h2 className="text-xl font-bold font-display tracking-wide text-white uppercase">Find and lock your target area</h2>
          <p className="text-xs text-paper-muted leading-relaxed">
            Search for any city, neighborhood, street, or landmark. Compose your 3D
            camera angle inside the tactical framing reticle, then lock the shot.
          </p>
        </div>

        {/* GTA VI Random Location Bar */}
        <div className="p-3 rounded-lg bg-mustard/10 border border-mustard/30" role="region" aria-label="GTA VI Hotspots Quick Switcher">
          <div className="space-y-2">
            <button
              type="button"
              className="w-full py-2 px-3 rounded-md bg-mustard hover:bg-mustard-subtle text-ink font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between transition-colors shadow-sm cursor-pointer"
              onClick={handleRandomizeGtaLocation}
              disabled={isSearching || isCapturing}
              title="Shuffle to another iconic GTA VI / Leonida sector"
            >
              <span>🎲</span>
              <span>Random GTA VI Location</span>
              <span className="px-1.5 py-0.5 rounded bg-ink text-mustard text-[10px]">LEONIDA</span>
            </button>
            <div className="text-[11px] font-mono leading-tight block">
              <span className="text-mustard font-bold block">GTA VI • State of Leonida</span>
              <span className="text-paper-muted text-[10px] block">Defaulting to random hotspot • Pan, tilt, zoom, or search any world location below</span>
            </div>
          </div>
        </div>

        {/* Place Search */}
        <div className="space-y-2 relative" onKeyDown={handleKeyDown}>
          <form className="space-y-1.5" onSubmit={handleSearchSubmit}>
            <label htmlFor="territory-search-input" className="sr-only">
              Search neighborhood, street, city, or landmark
            </label>
            <div className="relative flex gap-2">
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
                className="flex-1 px-3 py-2 rounded-lg bg-charcoal-950 border border-coral/30 text-white placeholder:text-paper-muted/60 text-xs font-mono focus:outline-none focus:border-coral"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-24 top-2 text-paper-muted hover:text-white text-xs cursor-pointer"
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
                className="px-4 py-2 rounded-lg bg-coral hover:bg-coral-soft text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                disabled={isSearching || !searchQuery.trim() || isCapturing}
              >
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>
            <small className="text-[10px] font-mono text-paper-muted/70 block leading-tight">
              Explicit submit only (1 req/sec limit). Ephemeral session search; no queries or coordinates are stored.
            </small>
          </form>

          {searchError && (
            <div className="p-2 rounded-md bg-coral/20 border border-coral text-coral text-xs font-mono" role="alert">
              <p>{searchError}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div
              id="territory-candidates-list"
              className="p-2 rounded-lg bg-charcoal-950 border border-coral/40 space-y-1 max-h-48 overflow-y-auto"
              role="listbox"
              aria-label="Disambiguated search results"
            >
              <p className="text-[11px] font-mono text-paper-muted">
                Disambiguate ({searchResults.length} matches):
              </p>
              <ul className="space-y-1">
                {searchResults.map((candidate, idx) => (
                  <li key={candidate.id} role="option" aria-selected={focusedIndex === idx}>
                    <button
                      type="button"
                      className={`w-full text-left p-2 rounded-md transition-colors hover:bg-charcoal-800 text-xs cursor-pointer border ${
                        selectedPlace?.id === candidate.id ? "border-petrol bg-charcoal-800/80" : "border-transparent"
                      } ${focusedIndex === idx ? "ring-1 ring-coral" : ""}`}
                      onClick={() => handleSelectCandidate(candidate)}
                      aria-label={`Select candidate ${candidate.name}, ${candidate.subtitle} (${getCategoryLabel(candidate.category)})`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-white font-semibold block truncate">{candidate.name}</strong>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-petrol/20 text-petrol">
                          {getCategoryLabel(candidate.category)}
                        </span>
                      </div>
                      <span className="text-[10px] text-paper-muted block truncate">{candidate.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Selected Territory Indicator */}
        {selectedPlace && (
          <div className="p-3 rounded-lg bg-petrol/10 border border-petrol/40 flex items-center justify-between">
            <div className="min-w-0 flex-1 text-xs font-mono">
              <span className="text-petrol font-bold block text-[10px] uppercase">Target Locked:</span>
              <strong className="text-white block truncate">{selectedPlace.name}</strong>
              <small className="text-paper-muted block truncate">{selectedPlace.subtitle}</small>
            </div>
            <button
              type="button"
              className="px-2 py-1 rounded bg-charcoal-800 hover:bg-charcoal-700 text-mustard border border-mustard/30 text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer"
              onClick={handleRandomizeGtaLocation}
              title="Shuffle to another iconic GTA VI hotspot"
              disabled={isSearching || isCapturing}
            >
              🎲 Next GTA VI Sector
            </button>
          </div>
        )}

        {/* Camera Controls & Metrics */}
        <div className="space-y-3 p-3 rounded-lg bg-charcoal-950 border border-white/5">
          {/* Layer Style & 3D Building Controls */}
          <div className="space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-paper-muted block">Map Imagery:</span>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Map imagery switcher">
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded text-xs font-mono transition-all text-center cursor-pointer border ${
                    layerMode === "realistic" ? "bg-coral text-white font-bold border-coral" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
                  }`}
                  onClick={() => setLayerMode("realistic")}
                >
                  🛰️ Satellite Aerial
                </button>
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded text-xs font-mono transition-all text-center cursor-pointer border ${
                    layerMode === "tactical" ? "bg-coral text-white font-bold border-coral" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
                  }`}
                  onClick={() => setLayerMode("tactical")}
                >
                  🗺️ Tactical Blueprint
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-paper-muted block">3D Building Blocks:</span>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="3D building blocks toggle">
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded text-xs font-mono transition-all text-center cursor-pointer border ${
                    !show3dBuildings ? "bg-coral text-white font-bold border-coral" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
                  }`}
                  onClick={() => setShow3dBuildings(false)}
                >
                  🚫 Pure Flat (Off)
                </button>
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded text-xs font-mono transition-all text-center cursor-pointer border ${
                    show3dBuildings ? "bg-coral text-white font-bold border-coral" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
                  }`}
                  onClick={() => setShow3dBuildings(true)}
                >
                  🏢 3D Elevation (On)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-paper-muted">
            <span title="Longitude, Latitude">
              <strong className="text-white">Center:</strong> {camera.center[0]}, {camera.center[1]}
            </span>
            <span>
              <strong className="text-white">Zoom:</strong> {camera.zoom}
            </span>
            <span>
              <strong className="text-white">Pitch:</strong> {camera.pitch}°
            </span>
            <span>
              <strong className="text-white">Bearing:</strong> {camera.bearing}°
            </span>
          </div>

          {/* Quick Pitch Presets */}
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="3D camera pitch angle presets">
            <span className="text-[11px] font-mono text-paper-muted">3D Angle:</span>
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                camera.pitch <= 10 ? "bg-petrol text-ink font-bold border-petrol" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
              }`}
              onClick={() => handleSetPresetPitch(0)}
              aria-label="Set 3D camera pitch to Top-Down 0 degrees"
            >
              Top-Down (0°)
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                camera.pitch >= 25 && camera.pitch <= 35 ? "bg-petrol text-ink font-bold border-petrol" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
              }`}
              onClick={() => handleSetPresetPitch(30)}
              aria-label="Set 3D camera pitch to Street 30 degrees"
            >
              Street (30°)
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                camera.pitch >= 40 && camera.pitch <= 50 ? "bg-petrol text-ink font-bold border-petrol" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
              }`}
              onClick={() => handleSetPresetPitch(45)}
              aria-label="Set 3D camera pitch to Isometric 45 degrees"
            >
              Isometric (45°)
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                camera.pitch >= 55 ? "bg-petrol text-ink font-bold border-petrol" : "bg-charcoal-800 text-paper-muted border-white/10 hover:text-white"
              }`}
              onClick={() => handleSetPresetPitch(60)}
              aria-label="Set 3D camera pitch to Cinematic 60 degrees"
            >
              Cinematic (60°)
            </button>
          </div>

          {/* Pitch Slider */}
          <div className="space-y-1">
            <label htmlFor="pitch-slider" className="text-xs font-mono text-paper-muted">Fine Pitch Angle ({camera.pitch}°):</label>
            <input
              id="pitch-slider"
              type="range"
              min="0"
              max="70"
              value={camera.pitch}
              onChange={handlePitchSlider}
              disabled={isCapturing}
              aria-label="Fine pitch angle in degrees"
              aria-valuemin={0}
              aria-valuemax={70}
              aria-valuenow={camera.pitch}
              className="w-full accent-coral cursor-pointer"
            />
          </div>

          {/* Bearing & Zoom Helpers */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-xs border border-white/10 transition-colors cursor-pointer"
              onClick={handleResetBearing}
              title="Reset view to North"
              aria-label={`Reset map bearing to North (currently ${camera.bearing} degrees)`}
            >
              🧭 Reset North ({camera.bearing}°)
            </button>
            <div className="flex items-center rounded-lg bg-charcoal-800 border border-white/10 overflow-hidden" role="group" aria-label="Map zoom controls">
              <button
                type="button"
                className="px-2.5 py-1 text-white hover:bg-charcoal-700 font-mono text-sm cursor-pointer"
                onClick={() => handleZoomDelta(-0.5)}
                title="Zoom out"
                aria-label="Zoom out map by 0.5 levels"
              >
                −
              </button>
              <span className="px-2 text-xs font-mono text-paper-muted" aria-label={`Current zoom level ${camera.zoom}`}>{camera.zoom}z</span>
              <button
                type="button"
                className="px-2.5 py-1 text-white hover:bg-charcoal-700 font-mono text-sm cursor-pointer"
                onClick={() => handleZoomDelta(0.5)}
                title="Zoom in"
                aria-label="Zoom in map by 0.5 levels"
              >
                +
              </button>
            </div>
          </div>

          {/* Approximate 3D Geometry Disclaimer */}
          <p className="text-[10px] text-paper-muted/80 leading-tight pt-1">
            ℹ️ <strong className="text-paper">Stylized 3D Context:</strong> Building extrusions and heights are
            approximate models rendered from available OpenStreetMap data for fictional
            mission planning, not survey-accurate or navigation models.
          </p>
        </div>

        {/* WebGL Unavailability or Context Loss Recovery */}
        {(!webglSupported || contextLost) && (
          <div className="p-3 rounded-lg bg-coral/20 border border-coral text-xs space-y-2" role="alert">
            <h4 className="font-bold text-white">WebGL Hardware Acceleration Unavailable</h4>
            <p className="text-paper-muted">
              Your browser or environment could not initialize WebGL for interactive 3D
              rendering. You can continue seamlessly with the verified original sample map.
            </p>
            <button
              type="button"
              className="w-full py-2 px-4 rounded-lg bg-coral hover:bg-coral-soft text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
              onClick={onSelectSampleFallback}
            >
              Switch to Original Sample Map
            </button>
          </div>
        )}

        {captureError && (
          <div className="p-3 rounded-lg bg-coral/20 border border-coral text-xs space-y-2" role="alert">
            <p>{captureError}</p>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-xs cursor-pointer"
              onClick={handleLockTerritory}
            >
              Retry Capture
            </button>
          </div>
        )}

        {/* Capture Action Buttons */}
        <div className="space-y-2 mt-auto pt-2">
          <button
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-petrol hover:bg-petrol-bright text-ink font-mono text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-petrol/25 cursor-pointer disabled:opacity-50"
            onClick={handleLockTerritory}
            disabled={isCapturing || !mapLoaded || !webglSupported || contextLost}
            aria-label="Lock 3D Territory Shot and enter Mission Plan editor"
          >
            {isCapturing
              ? capturePhaseLabel[capturePhase]
              : "Lock Territory Shot (Full Ratio)"}
          </button>

          <button
            type="button"
            className="w-full py-2 px-4 rounded-lg bg-transparent hover:bg-white/5 text-paper-muted hover:text-white font-mono text-xs transition-colors cursor-pointer text-center"
            onClick={onSelectSampleFallback}
            disabled={isCapturing}
            aria-label="Switch to original fictional sample map fallback"
          >
            Use Fictional Sample Map Instead
          </button>
        </div>
      </div>

      {/* Right 3D Map Column with Full Ratio Framing Reticle */}
      <div className="flex-1 relative overflow-hidden bg-charcoal-950 flex items-center justify-center">
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          aria-label="Interactive 3D vector map"
        />

        {/* Full Ratio Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8" aria-hidden="true">
          <div className="relative w-full aspect-video max-w-5xl border border-coral/30 rounded-xl overflow-hidden shadow-2xl">
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-mustard" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-mustard" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-mustard" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-mustard" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-full before:h-px before:bg-coral/40 after:content-[''] after:absolute after:top-0 after:left-1/2 after:w-px after:h-full after:bg-coral/40" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-charcoal-900/80 border border-coral/40 text-coral font-mono text-[10px] font-bold uppercase tracking-wider">
              16:9 Widescreen Map Capture
            </div>
          </div>
        </div>

        {/* Attribution Overlay */}
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-charcoal-950/80 text-[10px] text-paper-muted/80 font-mono z-10 backdrop-blur-sm border border-white/5" aria-label="Map Data Attribution">
          <span>{activeAttribution.noticeText} · </span>
          <a
            href={`https://${activeAttribution.printedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-petrol"
          >
            {activeAttribution.printedUrl}
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
