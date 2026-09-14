export type StickerCategory = "all" | "tactical" | "tools" | "waypoints";

export interface GtaSticker {
  id: string;
  name: string;
  fileName: string;
  url: string;
  category: "tactical" | "tools" | "waypoints";
}

export const GTA_STICKERS: GtaSticker[] = [
  // Waypoints & Numbers
  { id: "waypoint-1", name: "Waypoint 1", fileName: "1.png", url: "/gta-stickers/1.png", category: "waypoints" },
  { id: "waypoint-2", name: "Waypoint 2", fileName: "2.png", url: "/gta-stickers/2.png", category: "waypoints" },
  { id: "waypoint-3", name: "Waypoint 3", fileName: "3.png", url: "/gta-stickers/3.png", category: "waypoints" },
  { id: "waypoint-4", name: "Waypoint 4", fileName: "4.png", url: "/gta-stickers/4.png", category: "waypoints" },
  { id: "waypoint-5", name: "Waypoint 5", fileName: "5.png", url: "/gta-stickers/5.png", category: "waypoints" },
  { id: "waypoint-6", name: "Waypoint 6", fileName: "6.png", url: "/gta-stickers/6.png", category: "waypoints" },

  // Tactical & Surveillance
  { id: "car", name: "Getaway Car", fileName: "Car.png", url: "/gta-stickers/Car.png", category: "tactical" },
  { id: "highway", name: "Highway Route", fileName: "Highway.png", url: "/gta-stickers/Highway.png", category: "tactical" },
  { id: "house", name: "Safehouse", fileName: "House.png", url: "/gta-stickers/House.png", category: "tactical" },
  { id: "camera", name: "Security Camera", fileName: "Camera.png", url: "/gta-stickers/Camera.png", category: "tactical" },
  { id: "doorbin", name: "Surveillance Binoculars", fileName: "Doorbin.png", url: "/gta-stickers/Doorbin.png", category: "tactical" },
  { id: "compass", name: "Tactical Compass", fileName: "Campass.png", url: "/gta-stickers/Campass.png", category: "tactical" },
  { id: "map", name: "Tactical Map", fileName: "Map.png", url: "/gta-stickers/Map.png", category: "tactical" },
  { id: "money", name: "Cash / Bounty", fileName: "Money.png", url: "/gta-stickers/Money.png", category: "tactical" },
  { id: "lock", name: "Vault Lock", fileName: "Lock.png", url: "/gta-stickers/Lock.png", category: "tactical" },
  { id: "siren", name: "Police Siren", fileName: "Siren.png", url: "/gta-stickers/Siren.png", category: "tactical" },
  { id: "danger", name: "Hazard Warning", fileName: "Danger.png", url: "/gta-stickers/Danger.png", category: "tactical" },
  { id: "danger-sign", name: "Danger Sign", fileName: "Danger sign.png", url: "/gta-stickers/Danger sign.png", category: "tactical" },
  { id: "flag", name: "Checkpoint Flag", fileName: "Flag.png", url: "/gta-stickers/Flag.png", category: "tactical" },
  { id: "pin-drop", name: "Target Pin", fileName: "Pin drop.png", url: "/gta-stickers/Pin drop.png", category: "tactical" },
  { id: "pointer", name: "Tactical Pointer", fileName: "Pointor.png", url: "/gta-stickers/Pointor.png", category: "tactical" },

  // Tools & Actions
  { id: "cutter", name: "Wire Cutter", fileName: "Cutter.png", url: "/gta-stickers/Cutter.png", category: "tools" },
  { id: "pen", name: "Intel Pen", fileName: "Pen.png", url: "/gta-stickers/Pen.png", category: "tools" },
  { id: "paint", name: "Marker Paint", fileName: "Paint.png", url: "/gta-stickers/Paint.png", category: "tools" },
  { id: "spray", name: "Spray Tag", fileName: "Spray.png", url: "/gta-stickers/Spray.png", category: "tools" },
  { id: "shapes", name: "Perimeter Shapes", fileName: "Shapes.png", url: "/gta-stickers/Shapes.png", category: "tools" },
  { id: "text", name: "Coded Text", fileName: "Text.png", url: "/gta-stickers/Text.png", category: "tools" },
  { id: "save", name: "Secure Cache", fileName: "Save.png", url: "/gta-stickers/Save.png", category: "tools" },
  { id: "image", name: "Surveillance Photo", fileName: "Image.png", url: "/gta-stickers/Image.png", category: "tools" },
  { id: "gallery", name: "Intel Gallery", fileName: "Gallary.png", url: "/gta-stickers/Gallary.png", category: "tools" },
];

export function getStickersByCategory(
  category: StickerCategory,
  searchQuery = "",
): GtaSticker[] {
  let list = GTA_STICKERS;
  if (category !== "all") {
    list = list.filter((s) => s.category === category);
  }
  const query = searchQuery.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.fileName.toLowerCase().includes(query),
    );
  }
  return list;
}
