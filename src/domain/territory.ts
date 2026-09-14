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
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number];
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

export const DEFAULT_TERRITORY_CAMERA: TerritoryCameraState = {
  center: [-0.1195, 51.5033], // Southbank district default
  zoom: 15.8,
  pitch: 55,
  bearing: -25,
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
