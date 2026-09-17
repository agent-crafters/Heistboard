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
  // User requested iconic landmarks & districts
  {
    id: "ocean-beach",
    name: "Ocean Beach",
    codename: "LEONIDA SECTOR · OCEAN BEACH",
    subtitle: "South Beach Shoreline & Art Deco Promenade",
    description: "Vibrant coastal strip lined with iconic neon hotels, convertible cruisers, and sandy beaches.",
    camera: {
      center: [-80.1308, 25.7725],
      zoom: 16.2,
      pitch: 55,
      bearing: 18,
    },
    category: "neighborhood",
  },
  {
    id: "little-cuba",
    name: "Little Cuba",
    codename: "LEONIDA SECTOR · LITTLE CUBA",
    subtitle: "Calle Ocho Latin Quarter & Domino Park, Little Cuba",
    description: "Vibrant cultural hub with cigar lounges, food trucks, street art, and covert safehouses.",
    camera: {
      center: [-80.2185, 25.7655],
      zoom: 16.0,
      pitch: 52,
      bearing: -12,
    },
    category: "neighborhood",
  },
  {
    id: "tisha-wocka",
    name: "Tisha-Wocka",
    codename: "LEONIDA SECTOR · TISHA-WOCKA",
    subtitle: "Freshwater Springs & Rural Creek Basin, Tisha-Wocka",
    description: "Dense pine flatwoods, mud buggy tracks, hunting cabins, and hidden backcountry trails.",
    camera: {
      center: [-81.498, 28.71],
      zoom: 14.5,
      pitch: 48,
      bearing: 30,
    },
    category: "landmark",
  },
  {
    id: "vc-port",
    name: "VC Port",
    codename: "LEONIDA SECTOR · VC PORT",
    subtitle: "Commercial Shipping Terminal & Maritime Slips, VC Port",
    description: "High-security container gantry cranes, customs compounds, and maritime freight berths.",
    camera: {
      center: [-80.165, 25.7745],
      zoom: 15.4,
      pitch: 58,
      bearing: -40,
    },
    category: "district",
  },
  {
    id: "southside",
    name: "Southside",
    codename: "LEONIDA SECTOR · SOUTHSIDE",
    subtitle: "Industrial Warehouses & Southside Urban Enclave",
    description: "Gritty rail sidings, underground chop shops, elevated highway ramps, and warehouse compounds.",
    camera: {
      center: [-80.205, 25.752],
      zoom: 15.8,
      pitch: 54,
      bearing: 22,
    },
    category: "district",
  },
  {
    id: "vice-beach",
    name: "Vice Beach",
    codename: "LEONIDA SECTOR · VICE BEACH",
    subtitle: "Lummus Park Boardwalk & Ocean Promenade",
    description: "World-famous turquoise water coastline, muscle beach gym, lifeguard towers, and sunbathers.",
    camera: {
      center: [-80.13, 25.7815],
      zoom: 16.3,
      pitch: 56,
      bearing: -5,
    },
    category: "landmark",
  },
  // Individual iconic businesses & venues
  {
    id: "malibu-club",
    name: "The Malibu Club",
    codename: "LEONIDA VENUE · THE MALIBU CLUB",
    subtitle: "Neon Dancehall & VIP Lounge, Ocean Drive Strip",
    description: "Legendary Vice City nightlife hotspot with synthwave neon lighting, valet parking, and private VIP suites.",
    camera: {
      center: [-80.1292, 25.7938],
      zoom: 17.0,
      pitch: 60,
      bearing: 35,
    },
    category: "landmark",
  },
  {
    id: "ocean-view-hotel",
    name: "Ocean View Hotel",
    codename: "LEONIDA LANDMARK · OCEAN VIEW",
    subtitle: "Art Deco Landmark & Safehouse Suites, Ocean Drive",
    description: "Pastel green art deco hotel front facing the palms, famous safehouse with ocean terrace views.",
    camera: {
      center: [-80.131, 25.7795],
      zoom: 17.2,
      pitch: 58,
      bearing: 15,
    },
    category: "landmark",
  },
  {
    id: "jack-of-hearts",
    name: "Jack of Hearts Strip Club",
    codename: "LEONIDA VENUE · JACK OF HEARTS",
    subtitle: "Neon Strip Club & Back-Alley Drop Point, Vice City",
    description: "High-octane neon establishment featured in trailer 1 with rooftop security and underground dealings.",
    camera: {
      center: [-80.208, 25.789],
      zoom: 16.8,
      pitch: 55,
      bearing: -28,
    },
    category: "landmark",
  },
  {
    id: "leaf-links",
    name: "Leaf Links Country Club",
    codename: "LEONIDA RESORT · LEAF LINKS",
    subtitle: "Championship Fairways & Luxury Marina Island",
    description: "Manicured green fairways, tennis courts, clubhouse estates, and private golf cart bridges.",
    camera: {
      center: [-80.162, 25.845],
      zoom: 15.6,
      pitch: 50,
      bearing: 45,
    },
    category: "landmark",
  },
  {
    id: "kelly-county",
    name: "Kelly County Mud Club",
    codename: "LEONIDA ARENA · KELLY COUNTY",
    subtitle: "Monster Truck Mud Bogging & Dirt Speedway Arena",
    description: "Thronging crowd dirt arena with jacked-up 4x4s, swamp buggies, and fireworks.",
    camera: {
      center: [-81.35, 27.28],
      zoom: 15.0,
      pitch: 52,
      bearing: 20,
    },
    category: "landmark",
  },
  {
    id: "washington-beach",
    name: "Washington Beach",
    codename: "LEONIDA SECTOR · WASHINGTON BEACH",
    subtitle: "Washington Avenue Shopping Strip & Nightclubs",
    description: "Bustling retail strip, outdoor dining terraces, palm-fringed medians, and boutique hotels.",
    camera: {
      center: [-80.133, 25.786],
      zoom: 16.5,
      pitch: 54,
      bearing: -15,
    },
    category: "neighborhood",
  },
  {
    id: "starfish-island",
    name: "Starfish Island Estates",
    codename: "LEONIDA ENCLAVE · STARFISH ISLAND",
    subtitle: "Waterfront Mansions & Gated Canals, Biscayne",
    description: "Palatial mansions surrounded by moat canals, yacht berths, and private gated security.",
    camera: {
      center: [-80.175, 25.778],
      zoom: 16.4,
      pitch: 56,
      bearing: 30,
    },
    category: "neighborhood",
  },
  {
    id: "hamlet-township",
    name: "Hamlet Rural Township",
    codename: "LEONIDA SECTOR · HAMLET",
    subtitle: "Agricultural Rail Crossing & Grain Silos, Hamlet",
    description: "Classic southern crossroads with red clay dirt roads, roadside diners, and grain elevators.",
    camera: {
      center: [-80.98, 26.65],
      zoom: 15.2,
      pitch: 48,
      bearing: -10,
    },
    category: "district",
  },
  // Core Metropolitan & Regional Sectors
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
  {
    id: "port-gellhorn-motocross",
    name: "Port Gellhorn Motocross Park",
    codename: "LEONIDA VENUE · PG DIRT TRACK",
    subtitle: "Red Dirt Jumps & Coastal Industrial Outskirts",
    description: "Intense dirt bike circuit nestled right behind Port Gellhorn shipping yards.",
    camera: {
      center: [-82.42, 27.91],
      zoom: 15.8,
      pitch: 52,
      bearing: 18,
    },
    category: "landmark",
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
