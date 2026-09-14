export type PlaceCategory =
  | "city"
  | "neighborhood"
  | "street"
  | "landmark"
  | "address"
  | "other";

export interface TerritoryCameraState {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface PlaceCandidate {
  id: string;
  name: string;
  displayName: string;
  subtitle: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

export interface TerritoryAttributionLink {
  label: string;
  href: string;
}

export interface TerritoryAttribution {
  noticeText: string;
  printedUrl: string;
  links: TerritoryAttributionLink[];
}

export const OPENFREEMAP_LIBERTY_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";

export const CAPTURE_ASPECT_RATIO = 3 / 2;
export const STANDARD_MAP_BASE_WIDTH = 1200;
export const STANDARD_MAP_BASE_HEIGHT = 800;

export const DEFAULT_TERRITORY_CAMERA: TerritoryCameraState = {
  center: [-0.1195, 51.5033], // Southbank district default
  zoom: 15.8,
  pitch: 55,
  bearing: -25,
};

export type MapLayerMode = "realistic" | "tactical";

export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const REALISTIC_TERRITORY_ATTRIBUTION: TerritoryAttribution = {
  noticeText: "Esri World Imagery · OpenFreeMap 3D · Data from OpenStreetMap",
  printedUrl: "openstreetmap.org/copyright",
  links: [
    { label: "Esri", href: "https://www.esri.com" },
    { label: "OpenFreeMap", href: "https://openfreemap.org" },
    { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
  ],
};

export const STANDARD_TERRITORY_ATTRIBUTION: TerritoryAttribution = {
  noticeText: "OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap",
  printedUrl: "openstreetmap.org/copyright",
  links: [
    { label: "OpenFreeMap", href: "https://openfreemap.org" },
    { label: "OpenMapTiles", href: "https://openmaptiles.org" },
    { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
  ],
};

export const SAMPLE_MAP_BASE_URL = "/maps/sample-territory.svg";

export const SAMPLE_MAP_ATTRIBUTION: TerritoryAttribution = {
  noticeText: "Original Fictional Map · Heistboard Project",
  printedUrl: "heistboard.local",
  links: [{ label: "Original Sample Map", href: SAMPLE_MAP_BASE_URL }],
};

export function formatAttributionString(attribution: TerritoryAttribution): string {
  return `${attribution.noticeText} · ${attribution.printedUrl}`;
}

export function classifyPlaceCategory(
  type?: string,
  placeClass?: string,
): PlaceCategory {
  const t = (type || "").toLowerCase();
  const c = (placeClass || "").toLowerCase();

  if (
    c === "place" &&
    ["city", "town", "village", "municipality", "state", "country"].includes(t)
  ) {
    return "city";
  }

  if (
    ["suburb", "neighbourhood", "quarter", "borough", "district", "city_district"].includes(t)
  ) {
    return "neighborhood";
  }

  if (
    c === "highway" ||
    ["road", "street", "avenue", "boulevard", "lane", "way", "path"].includes(t)
  ) {
    return "street";
  }

  if (
    c === "tourism" ||
    c === "historic" ||
    c === "leisure" ||
    ["monument", "memorial", "castle", "attraction", "museum", "artwork", "park"].includes(t)
  ) {
    return "landmark";
  }

  if (c === "building" || t === "house" || t === "address" || c === "amenity") {
    return "address";
  }

  return "other";
}

export function getCategoryLabel(category: PlaceCategory): string {
  switch (category) {
    case "city":
      return "City";
    case "neighborhood":
      return "Neighborhood";
    case "street":
      return "Street";
    case "landmark":
      return "Landmark";
    case "address":
      return "Location";
    case "other":
    default:
      return "Territory";
  }
}
