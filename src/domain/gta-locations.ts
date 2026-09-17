/**
 * GTA VI / State of Leonida Location Catalog & Randomizer
 *
 * Provides real-world coordinate hotspots corresponding to confirmed and iconic
 * GTA VI locations across Vice City, Port Gellhorn, Gator Keys, Lake Leonida,
 * and the surrounding wetlands. Used to seed random initial exploration cameras
 * while preserving full worldwide search freedom for the user.
 */

import type { TerritoryCameraState } from "./territory";

export interface GtaLocationHotspot {
  id: string;
  name: string;
  codename: string;
  subtitle: string;
  description: string;
  camera: TerritoryCameraState;
  category: "city" | "landmark" | "neighborhood" | "district";
}

export const GTA_LOCATIONS_POOL: readonly GtaLocationHotspot[] = [
  {
    id: "vice-city-downtown",
    name: "Vice City Downtown",
    codename: "LEONIDA SECTOR 01",
    subtitle: "Biscayne Bay & High-Rise Corridor, Vice City",
    description: "Towering glass skylines, urban flyovers, and deep harbor water channels.",
    camera: {
      center: [-80.1895, 25.7753],
      zoom: 15.6,
      pitch: 58,
      bearing: -25,
    },
    category: "city",
  },
  {
    id: "ocean-drive-strip",
    name: "Vice Beach · Ocean Drive",
    codename: "LEONIDA SECTOR 02",
    subtitle: "Ocean Drive Art Deco Strip & Pastel Promenade",
    description: "Sun-drenched neon beachfronts, palm silhouettes, and hotel terraces.",
    camera: {
      center: [-80.1305, 25.782],
      zoom: 16.0,
      pitch: 50,
      bearing: 12,
    },
    category: "neighborhood",
  },
  {
    id: "port-gellhorn-docks",
    name: "Port Gellhorn Industrial Docks",
    codename: "LEONIDA SECTOR 03",
    subtitle: "Commercial Freight Basins & Port Gellhorn Docks",
    description: "Industrial shipping yards, oil tanks, freight routes, and railyard corridors.",
    camera: {
      center: [-82.448, 27.94],
      zoom: 15.2,
      pitch: 54,
      bearing: 35,
    },
    category: "district",
  },
  {
    id: "gator-keys-viaduct",
    name: "Gator Keys · Overseas Viaduct",
    codename: "LEONIDA SECTOR 04",
    subtitle: "Overseas Viaduct Highway & Coral Reef Outposts",
    description: "Low-lying oceanic bridges, tropical shallows, and remote safehouses.",
    camera: {
      center: [-81.185, 24.7],
      zoom: 14.8,
      pitch: 60,
      bearing: -48,
    },
    category: "landmark",
  },
  {
    id: "lake-leonida-basin",
    name: "Lake Leonida Shores",
    codename: "LEONIDA SECTOR 05",
    subtitle: "Sugarland Basin & Inland Freshwater Shores",
    description: "Expansive inland waterways, levee dikes, and rural southern towns.",
    camera: {
      center: [-80.932, 26.753],
      zoom: 14.5,
      pitch: 45,
      bearing: 15,
    },
    category: "landmark",
  },
  {
    id: "vice-arts-wynwood",
    name: "Vice City Arts District",
    codename: "LEONIDA SECTOR 06",
    subtitle: "Warehouse Walls & Street Art District, Vice City",
    description: "Graffiti murals, repurposed industrial warehouses, and back-alley routes.",
    camera: {
      center: [-80.1985, 25.801],
      zoom: 16.2,
      pitch: 52,
      bearing: -10,
    },
    category: "neighborhood",
  },
  {
    id: "star-island-compounds",
    name: "Star Island VIP Compounds",
    codename: "LEONIDA SECTOR 07",
    subtitle: "Gated Enclave & Waterway Security, Biscayne Bay",
    description: "Billionaire estates, private docks, and gated security access checkpoints.",
    camera: {
      center: [-80.151, 25.778],
      zoom: 16.0,
      pitch: 55,
      bearing: 42,
    },
    category: "neighborhood",
  },
  {
    id: "port-miami-cargo",
    name: "Vice Marine Port & Cargo Terminal",
    codename: "LEONIDA SECTOR 08",
    subtitle: "High-Value Cargo Storage & Gantry Cranes",
    description: "Massive container yards, cargo ships, customs gates, and harbor basins.",
    camera: {
      center: [-80.17, 25.778],
      zoom: 15.2,
      pitch: 58,
      bearing: -65,
    },
    category: "district",
  },
  {
    id: "everglades-airboat-base",
    name: "Grass Rivers · Everglades Outpost",
    codename: "LEONIDA SECTOR 09",
    subtitle: "Swamp Canals & Smuggler Outposts, Grass Rivers",
    description: "Sawgrass marshlands, airboat paths, and dense cypress canopy clearings.",
    camera: {
      center: [-80.605, 25.76],
      zoom: 14.2,
      pitch: 48,
      bearing: 25,
    },
    category: "landmark",
  },
  {
    id: "brickell-financial",
    name: "Brickell Financial Corridor",
    codename: "LEONIDA SECTOR 10",
    subtitle: "Corporate Vaults & Banking District, Vice City",
    description: "Canyon-like avenues, elevated people movers, and bank headquarters.",
    camera: {
      center: [-80.1915, 25.76],
      zoom: 16.2,
      pitch: 62,
      bearing: -18,
    },
    category: "city",
  },
  {
    id: "little-haiti-commercial",
    name: "Little Haiti Urban Strip",
    codename: "LEONIDA SECTOR 11",
    subtitle: "Local Safehouses & Urban Alleyways, Vice City",
    description: "Colorful storefronts, narrow parking lots, and dense neighborhood blocks.",
    camera: {
      center: [-80.193, 25.828],
      zoom: 16.0,
      pitch: 48,
      bearing: 5,
    },
    category: "neighborhood",
  },
  {
    id: "vci-airport-hangars",
    name: "Vice City International (VCI)",
    codename: "LEONIDA SECTOR 12",
    subtitle: "Airfield Runways & Smuggler Hangars, VCI",
    description: "Dual jet runways, terminal aprons, and perimeter service roads.",
    camera: {
      center: [-80.287, 25.7959],
      zoom: 14.9,
      pitch: 55,
      bearing: 68,
    },
    category: "district",
  },
];

/**
 * Returns a random GTA VI location hotspot from the curated Leonida pool.
 */
export function getRandomGtaLocation(
  excludeId?: string,
): GtaLocationHotspot {
  const pool = excludeId
    ? GTA_LOCATIONS_POOL.filter((loc) => loc.id !== excludeId)
    : GTA_LOCATIONS_POOL;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? GTA_LOCATIONS_POOL[0]!;
}

/**
 * Looks up a GTA VI location by ID.
 */
export function getGtaLocationById(id: string): GtaLocationHotspot | undefined {
  return GTA_LOCATIONS_POOL.find((loc) => loc.id === id);
}
