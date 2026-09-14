import {
  type MapLayerMode,
  SATELLITE_TILE_URL,
} from "@/domain/territory";

// Structural interface for MapLibre map methods needed for layer configuration
export interface ConfigurableMap {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): unknown;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): unknown;
  setPaintProperty(layerId: string, name: string, value: unknown): unknown;
  setLayoutProperty(layerId: string, name: string, value: unknown): unknown;
  setLight?(light: unknown): unknown;
  setSky?(sky: unknown): unknown;
}

const REALISTIC_BUILDING_COLORS = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "render_height"], 0],
  0,
  "#e3dfd7", // Warm limestone / low residential
  25,
  "#cbcfcb", // Architectural concrete
  60,
  "#a2abb3", // Commercial steel & glass
  120,
  "#748796", // High-rise modern glass
];

const TACTICAL_BUILDING_COLORS = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "render_height"], 0],
  0,
  "#252d3a",
  40,
  "#374558",
  90,
  "#ef7866",
];

/**
 * Applies the specified layer mode (realistic satellite vs tactical vector)
 * to a MapLibre map instance, including high-res satellite photography,
 * 3D architectural extrusions, directional sun lighting, and sky atmosphere.
 */
export function applyMapLayers(map: ConfigurableMap, mode: MapLayerMode): void {
  // 1. Ensure satellite source exists
  if (!map.getSource("esri-satellite")) {
    try {
      map.addSource("esri-satellite", {
        type: "raster",
        tiles: [SATELLITE_TILE_URL],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      });
    } catch (e) {
      console.warn("Could not add satellite raster source:", e);
    }
  }

  // 2. Add or toggle satellite layer
  const beforeRoadsId = map.getLayer("tunnel_motorway_link_casing")
    ? "tunnel_motorway_link_casing"
    : map.getLayer("road_service_track_casing")
      ? "road_service_track_casing"
      : map.getLayer("road_motorway_link_casing")
        ? "road_motorway_link_casing"
        : undefined;

  if (!map.getLayer("heistboard-satellite-layer")) {
    try {
      map.addLayer(
        {
          id: "heistboard-satellite-layer",
          type: "raster",
          source: "esri-satellite",
          paint: {
            "raster-opacity": mode === "realistic" ? 1.0 : 0.0,
            "raster-fade-duration": 200,
          },
        },
        beforeRoadsId,
      );
    } catch (e) {
      console.warn("Could not add satellite raster layer:", e);
    }
  } else {
    try {
      map.setPaintProperty(
        "heistboard-satellite-layer",
        "raster-opacity",
        mode === "realistic" ? 1.0 : 0.0,
      );
    } catch (e) {
      console.warn("Could not update satellite opacity:", e);
    }
  }

  // 3. Prevent z-fighting with the default style's building-3d layer
  if (map.getLayer("building-3d")) {
    try {
      map.setLayoutProperty("building-3d", "visibility", "none");
    } catch {
      // Ignore if layout property cannot be set
    }
  }

  // 4. Add or update heistboard-3d-buildings extrusion layer
  const buildingColors =
    mode === "realistic" ? REALISTIC_BUILDING_COLORS : TACTICAL_BUILDING_COLORS;
  const buildingOpacity = mode === "realistic" ? 0.92 : 0.88;

  if (!map.getLayer("heistboard-3d-buildings")) {
    const hasOpenMapTiles = Boolean(map.getSource("openmaptiles"));
    if (hasOpenMapTiles) {
      try {
        map.addLayer({
          id: "heistboard-3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": buildingColors,
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
            "fill-extrusion-opacity": buildingOpacity,
          },
        });
      } catch (e) {
        console.warn("Could not inject 3d building extrusion layer:", e);
      }
    }
  } else {
    try {
      map.setPaintProperty(
        "heistboard-3d-buildings",
        "fill-extrusion-color",
        buildingColors,
      );
      map.setPaintProperty(
        "heistboard-3d-buildings",
        "fill-extrusion-opacity",
        buildingOpacity,
      );
    } catch (e) {
      console.warn("Could not update 3d building paint properties:", e);
    }
  }

  // 5. Apply realistic sun lighting
  if (typeof map.setLight === "function") {
    try {
      if (mode === "realistic") {
        map.setLight({
          anchor: "viewport",
          color: "#fff8ec",
          intensity: 0.65,
          position: [1.2, 215, 35],
        });
      } else {
        map.setLight({
          anchor: "viewport",
          color: "#ffffff",
          intensity: 0.35,
          position: [1.15, 210, 30],
        });
      }
    } catch {
      // Suppress if lighting cannot be initialized
    }
  }

  // 6. Apply realistic sky / atmospheric horizon fog
  if (typeof map.setSky === "function") {
    try {
      if (mode === "realistic") {
        map.setSky({
          "sky-color": "#8ec5fc",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#e0ecf8",
          "horizon-fog-blend": 0.7,
          "fog-color": "#e0ecf8",
          "fog-ground-blend": 0.5,
          "atmosphere-blend": 0.8,
        });
      } else {
        map.setSky({
          "sky-color": "#111516",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#171b1c",
          "horizon-fog-blend": 0.8,
          "fog-color": "#111516",
          "fog-ground-blend": 0.5,
          "atmosphere-blend": 0.5,
        });
      }
    } catch {
      // Suppress if sky cannot be initialized
    }
  }
}
