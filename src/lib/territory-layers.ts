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
  setLayerZoomRange?(layerId: string, minzoom: number, maxzoom: number): unknown;
  setLight?(light: unknown): unknown;
  setSky?(sky: unknown): unknown;
}

/**
 * Height expression that guarantees every building and residential house
 * is extruded into a 3D block:
 * 1. Uses explicit render_height or height if > 0
 * 2. Or estimates height from levels (levels * 3.2m + 1.5m)
 * 3. Or provides a realistic 8-meter (~2.5 story) default height for unmeasured houses
 */
export const BUILDING_HEIGHT_EXPRESSION = [
  "case",
  [">", ["coalesce", ["get", "render_height"], ["get", "height"], 0], 0],
  ["coalesce", ["get", "render_height"], ["get", "height"]],
  [
    "case",
    [">", ["coalesce", ["get", "levels"], ["get", "building:levels"], 0], 0],
    [
      "+",
      ["*", ["coalesce", ["get", "levels"], ["get", "building:levels"]], 3.2],
      1.5,
    ],
    8,
  ],
];

export const BUILDING_BASE_EXPRESSION = [
  "coalesce",
  ["get", "render_min_height"],
  ["get", "min_height"],
  0,
];

export const REALISTIC_BUILDING_COLORS = [
  "interpolate",
  ["linear"],
  [
    "case",
    [">", ["coalesce", ["get", "render_height"], ["get", "height"], 0], 0],
    ["coalesce", ["get", "render_height"], ["get", "height"]],
    8,
  ],
  0,
  "#e3dfd7", // Houses & residential buildings (warm limestone / light architectural beige)
  12,
  "#d6d2ca", // Low-rise commercial & suburban blocks
  30,
  "#c4c0b7", // Mid-rise urban concrete
  60,
  "#a8b0b8", // Modern steel & glass commercial
  120,
  "#7a8e9e", // High-rise reflective glass towers
];

export const TACTICAL_BUILDING_COLORS = [
  "interpolate",
  ["linear"],
  [
    "case",
    [">", ["coalesce", ["get", "render_height"], ["get", "height"], 0], 0],
    ["coalesce", ["get", "render_height"], ["get", "height"]],
    8,
  ],
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

  // 2. Add or toggle satellite layer placed beneath road networks and labels
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

  // 3. Hide flat 2D building footprint layer to avoid z-fighting with 3D extrusions
  if (map.getLayer("building")) {
    try {
      map.setLayoutProperty("building", "visibility", "none");
    } catch {
      // Suppress if not set
    }
  }

  // 4. Configure 3D Building Extrusions for all houses & buildings
  const buildingColors =
    mode === "realistic" ? REALISTIC_BUILDING_COLORS : TACTICAL_BUILDING_COLORS;
  const buildingOpacity = mode === "realistic" ? 0.98 : 0.88;

  // Determine active 3D layer
  const hasBase3d = Boolean(map.getLayer("building-3d"));
  const hasCustom3d = Boolean(map.getLayer("heistboard-3d-buildings"));

  if (!hasBase3d && !hasCustom3d) {
    const hasOpenMapTiles = Boolean(map.getSource("openmaptiles"));
    if (hasOpenMapTiles) {
      const beforeLabelsId = map.getLayer("boundary_3")
        ? "boundary_3"
        : map.getLayer("waterway_line_label")
          ? "waterway_line_label"
          : undefined;

      try {
        map.addLayer(
          {
            id: "heistboard-3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": buildingColors,
              "fill-extrusion-height": BUILDING_HEIGHT_EXPRESSION,
              "fill-extrusion-base": BUILDING_BASE_EXPRESSION,
              "fill-extrusion-opacity": buildingOpacity,
            },
          },
          beforeLabelsId,
        );
      } catch (e) {
        console.warn("Could not inject 3d building extrusion layer:", e);
      }
    }
  } else {
    // If base building-3d exists, configure it and hide custom layer if both exist
    const primaryLayerId = hasBase3d ? "building-3d" : "heistboard-3d-buildings";
    if (hasBase3d && hasCustom3d) {
      try {
        map.setLayoutProperty("heistboard-3d-buildings", "visibility", "none");
      } catch {
        // Suppress
      }
    }

    try {
      map.setLayoutProperty(primaryLayerId, "visibility", "visible");
      if (typeof map.setLayerZoomRange === "function") {
        map.setLayerZoomRange(primaryLayerId, 13, 24);
      }
      map.setPaintProperty(
        primaryLayerId,
        "fill-extrusion-height",
        BUILDING_HEIGHT_EXPRESSION,
      );
      map.setPaintProperty(
        primaryLayerId,
        "fill-extrusion-base",
        BUILDING_BASE_EXPRESSION,
      );
      map.setPaintProperty(
        primaryLayerId,
        "fill-extrusion-color",
        buildingColors,
      );
      map.setPaintProperty(
        primaryLayerId,
        "fill-extrusion-opacity",
        buildingOpacity,
      );
    } catch (e) {
      console.warn("Could not update 3d building properties:", e);
    }
  }

  // 5. Apply realistic directional sun lighting
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
