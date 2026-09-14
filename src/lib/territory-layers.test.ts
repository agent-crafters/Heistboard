import { describe, expect, it, vi } from "vitest";
import {
  applyMapLayers,
  BUILDING_HEIGHT_EXPRESSION,
  type ConfigurableMap,
} from "./territory-layers";

describe("applyMapLayers", () => {
  function createMockMap(hasExistingBuilding3d = true): ConfigurableMap & {
    sources: Record<string, unknown>;
    layers: Record<string, unknown>;
    paintProps: Record<string, Record<string, unknown>>;
    layoutProps: Record<string, Record<string, unknown>>;
  } {
    const sources: Record<string, unknown> = { openmaptiles: {} };
    const layers: Record<string, unknown> = {
      tunnel_motorway_link_casing: {},
      building: {},
    };
    if (hasExistingBuilding3d) {
      layers["building-3d"] = {};
    }
    const paintProps: Record<string, Record<string, unknown>> = {};
    const layoutProps: Record<string, Record<string, unknown>> = {};

    return {
      sources,
      layers,
      paintProps,
      layoutProps,
      getSource: vi.fn((id: string) => sources[id]),
      addSource: vi.fn((id: string, source: unknown) => {
        sources[id] = source;
      }),
      getLayer: vi.fn((id: string) => layers[id]),
      addLayer: vi.fn((layer: { id: string }, beforeId?: string) => {
        layers[layer.id] = { ...layer, beforeId };
      }),
      setPaintProperty: vi.fn(
        (layerId: string, name: string, value: unknown) => {
          if (!paintProps[layerId]) paintProps[layerId] = {};
          paintProps[layerId][name] = value;
        },
      ),
      setLayoutProperty: vi.fn(
        (layerId: string, name: string, value: unknown) => {
          if (!layoutProps[layerId]) layoutProps[layerId] = {};
          layoutProps[layerId][name] = value;
        },
      ),
      setLayerZoomRange: vi.fn(),
      setLight: vi.fn(),
      setSky: vi.fn(),
      getStyle: vi.fn(() => ({
        layers: [
          { id: "road_motorway", type: "line" },
          { id: "park", type: "fill" },
          { id: "building", type: "fill" },
          { id: "building-3d", type: "fill-extrusion" },
          { id: "label_city", type: "symbol" },
          { id: "road_one_way_arrow", type: "symbol" },
        ],
      })),
    };
  }

  it("configures realistic mode with satellite layer, cleans road lines/fills, and keeps place name text", () => {
    const mockMap = createMockMap(true);
    applyMapLayers(mockMap, "realistic", { show3dBuildings: false });

    expect(mockMap.addSource).toHaveBeenCalledWith(
      "esri-satellite",
      expect.objectContaining({ type: "raster" }),
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "heistboard-satellite-layer",
        type: "raster",
        paint: expect.objectContaining({ "raster-opacity": 1.0 }),
      }),
      "tunnel_motorway_link_casing",
    );
    // Hides vector road lines and polygon fills
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "road_motorway",
      "visibility",
      "none",
    );
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "park",
      "visibility",
      "none",
    );
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "road_one_way_arrow",
      "visibility",
      "none",
    );
    // Preserves text labels and place names
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "label_city",
      "visibility",
      "visible",
    );
    // Hides flat 2D footprint layer
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "building",
      "visibility",
      "none",
    );
    // Hides 3D building layer when 3D toggle is off
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "building-3d",
      "visibility",
      "none",
    );
  });

  it("configures realistic mode with 3D buildings enabled when show3dBuildings is true", () => {
    const mockMap = createMockMap(true);
    applyMapLayers(mockMap, "realistic", { show3dBuildings: true });

    // Makes 3D building layer visible and sets height/opacity
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "building-3d",
      "visibility",
      "visible",
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "building-3d",
      "fill-extrusion-height",
      BUILDING_HEIGHT_EXPRESSION,
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "building-3d",
      "fill-extrusion-opacity",
      0.55,
    );
    expect(mockMap.setLight).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "#fffbf0",
      }),
    );
    expect(mockMap.setSky).toHaveBeenCalledWith(
      expect.objectContaining({
        "sky-color": "#8ec5fc",
      }),
    );
  });

  it("creates custom 3d layer when style lacks building-3d and show3dBuildings is true", () => {
    const mockMap = createMockMap(false);
    applyMapLayers(mockMap, "realistic", { show3dBuildings: true });

    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "heistboard-3d-buildings",
        type: "fill-extrusion",
        paint: expect.objectContaining({
          "fill-extrusion-height": BUILDING_HEIGHT_EXPRESSION,
        }),
      }),
      undefined,
    );
  });

  it("toggles to tactical mode with 0 opacity satellite and tactical styling", () => {
    const mockMap = createMockMap(true);
    // First apply realistic
    applyMapLayers(mockMap, "realistic", { show3dBuildings: false });

    // Now switch to tactical with 3D on
    applyMapLayers(mockMap, "tactical", { show3dBuildings: true });

    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "heistboard-satellite-layer",
      "raster-opacity",
      0.0,
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "building-3d",
      "fill-extrusion-color",
      expect.arrayContaining(["#252d3a"]),
    );
    expect(mockMap.setLight).toHaveBeenCalledWith(
      expect.objectContaining({
        intensity: 0.35,
      }),
    );
  });
});
