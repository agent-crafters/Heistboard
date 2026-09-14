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
    };
  }

  it("configures realistic mode with satellite layer, house extrusions, and sun lighting", () => {
    const mockMap = createMockMap(true);
    applyMapLayers(mockMap, "realistic");

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
    // Hides flat 2D footprint layer
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "building",
      "visibility",
      "none",
    );
    // Makes 3D building layer visible and sets universal height expression
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

  it("creates custom 3d layer when style lacks building-3d", () => {
    const mockMap = createMockMap(false);
    applyMapLayers(mockMap, "realistic");

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
    applyMapLayers(mockMap, "realistic");

    // Now switch to tactical
    applyMapLayers(mockMap, "tactical");

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
