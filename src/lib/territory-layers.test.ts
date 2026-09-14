import { describe, expect, it, vi } from "vitest";
import { applyMapLayers, type ConfigurableMap } from "./territory-layers";

describe("applyMapLayers", () => {
  function createMockMap(): ConfigurableMap & {
    sources: Record<string, unknown>;
    layers: Record<string, unknown>;
    paintProps: Record<string, Record<string, unknown>>;
    layoutProps: Record<string, Record<string, unknown>>;
    light: unknown;
    sky: unknown;
  } {
    const sources: Record<string, unknown> = { openmaptiles: {} };
    const layers: Record<string, unknown> = {
      tunnel_motorway_link_casing: {},
      "building-3d": {},
    };
    const paintProps: Record<string, Record<string, unknown>> = {};
    const layoutProps: Record<string, Record<string, unknown>> = {};

    return {
      sources,
      layers,
      paintProps,
      layoutProps,
      light: null,
      sky: null,
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
      setLight: vi.fn(),
      setSky: vi.fn(),
    };
  }

  it("configures realistic mode with satellite layer and sun lighting", () => {
    const mockMap = createMockMap();
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
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      "building-3d",
      "visibility",
      "none",
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "heistboard-3d-buildings",
        type: "fill-extrusion",
      }),
    );
    expect(mockMap.setLight).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "#fff8ec",
      }),
    );
    expect(mockMap.setSky).toHaveBeenCalledWith(
      expect.objectContaining({
        "sky-color": "#8ec5fc",
      }),
    );
  });

  it("toggles to tactical mode with 0 opacity satellite and tactical styling", () => {
    const mockMap = createMockMap();
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
      "heistboard-3d-buildings",
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
