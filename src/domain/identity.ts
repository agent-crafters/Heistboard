/**
 * Identity Domain Model & Validation
 *
 * Defines the domain types, validation rules, silhouette archetypes,
 * and filter definitions for Heistboard Stage 02 (Identity).
 */

export type PortraitSource = "silhouette" | "custom";

export type SilhouetteId = "courier" | "infiltrator" | "ghost" | "specialist";

export type PortraitFilter = "surveillance" | "film-noir" | "duotone-petrol" | "raw";

export interface IdentityState {
  alias: string;
  portraitSource: PortraitSource;
  silhouetteId: SilhouetteId;
  portraitUrl?: string; // Client-side object URL or data URL
  portraitBlob?: Blob;
  portraitFilter: PortraitFilter;
}

export interface SilhouetteArchetype {
  id: SilhouetteId;
  name: string;
  callsign: string;
  role: string;
  description: string;
  svgPath: string;
}

export const SILHOUETTE_ARCHETYPES: readonly SilhouetteArchetype[] = [
  {
    id: "courier",
    name: "The Courier",
    callsign: "ROOK-4",
    role: "Urban Point",
    description: "Rapid neighborhood navigation in high-collar civilian streetwear.",
    svgPath:
      "M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 2 4.08V13a2 2 0 0 1-2 2H5a3 3 0 0 0-3 3v4h20v-4a3 3 0 0 0-3-3h-2a2 2 0 0 1-2-2v-.92A5 5 0 0 0 17 8V7a5 5 0 0 0-5-5zm-3 7a3 3 0 1 1 6 0v1a3 3 0 1 1-6 0V9z",
  },
  {
    id: "infiltrator",
    name: "The Infiltrator",
    callsign: "CIPHER",
    role: "Tactical Recon",
    description: "Low-light covert operative wearing a tactical balaclava and HUD visor.",
    svgPath:
      "M12 2C7.5 2 6 5.5 6 9c0 2.5 1 4.5 2 6 .5.7 1.5 1.2 2 1.6V18c-3 1-5 2.5-6 4.5V24h16v-1.5c-1-2-3-3.5-6-4.5v-1.4c.5-.4 1.5-.9 2-1.6 1-1.5 2-3.5 2-6 0-3.5-1.5-7-6-7zm-4 7.5h8v2H8v-2z",
  },
  {
    id: "ghost",
    name: "The Ghost",
    callsign: "PHANTOM",
    role: "Covert Surveillance",
    description: "Concealed operative hooded in deep shadows with minimal electronic trace.",
    svgPath:
      "M12 1.5C6.5 1.5 5 6 5 11c0 3 1.5 5 2.5 6.5 1 1.5 1.5 2 1.5 3v1.5c-3 1-5 2.5-6 4v1h18v-1c-1-1.5-3-3-6-4V20.5c0-1 .5-1.5 1.5-3 1-1.5 2.5-3.5 2.5-6.5 0-5-1.5-9.5-7-9.5zm0 4.5c2.5 0 4 2.5 4 5s-1.5 5-4 5-4-2.5-4-5 1.5-5 4-5z",
  },
  {
    id: "specialist",
    name: "The Specialist",
    callsign: "ECHO-7",
    role: "Tech & Signals",
    description: "Electronic warfare and communications operative with tactical headset.",
    svgPath:
      "M12 2a6 6 0 0 0-6 6v1H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v1c0 2 1 3.5 2.5 4.5L7 22h10l-1.5-1.5c1.5-1 2.5-2.5 2.5-4.5v-1h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2V8a6 6 0 0 0-6-6zm-4 7a4 4 0 1 1 8 0v2H8V9z",
  },
] as const;

export const DEFAULT_IDENTITY_STATE: IdentityState = {
  alias: "CIPHER",
  portraitSource: "silhouette",
  silhouetteId: "courier",
  portraitFilter: "surveillance",
};

export const PORTRAIT_FILTERS: readonly {
  id: PortraitFilter;
  name: string;
  tagline: string;
}[] = [
  { id: "surveillance", name: "Surveillance CCTV", tagline: "High-contrast pale cyan & scanlines" },
  { id: "film-noir", name: "Film Noir", tagline: "Deep monochrome contrast & rim shadow" },
  { id: "duotone-petrol", name: "Petrol Duotone", tagline: "Heistboard dark petrol & warm paper" },
  { id: "raw", name: "Clean Raw", tagline: "Natural balanced portrait tone" },
] as const;

export const TACTICAL_CALLSIGNS: readonly string[] = [
  "CIPHER",
  "NIGHTBIRD",
  "VAPOR-9",
  "ROOK",
  "ECHO-7",
  "KESTREL",
  "SPECTER",
  "ONYX",
  "CROSSBOW",
  "DRIFTER",
  "VALKYRIE",
  "MIRAGE",
];

export const MAX_PORTRAIT_FILE_BYTES = 5 * 1024 * 1024; // 5MB limit
export const ALLOWED_PORTRAIT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export interface AliasValidationResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Validates and sanitizes an operative alias:
 * - Must be between 2 and 32 characters (trimmed).
 * - Must contain only alphanumeric characters, spaces, hyphens, and underscores.
 * - Must contain at least one alphanumeric character (not punctuation-only).
 */
export function validateAlias(raw: string): AliasValidationResult {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { valid: false, sanitized: "", error: "Operative alias is required." };
  }

  if (trimmed.length < 2) {
    return {
      valid: false,
      sanitized: trimmed,
      error: "Alias must be at least 2 characters.",
    };
  }

  if (trimmed.length > 32) {
    return {
      valid: false,
      sanitized: trimmed.slice(0, 32),
      error: "Alias cannot exceed 32 characters.",
    };
  }

  // Check character whitelist
  const allowedPattern = /^[a-zA-Z0-9 _-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed.replace(/[^a-zA-Z0-9 _-]/g, ""),
      error: "Alias can only contain letters, numbers, spaces, hyphens, and underscores.",
    };
  }

  // Must have at least one alphanumeric character
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed,
      error: "Alias must contain at least one letter or number.",
    };
  }

  return { valid: true, sanitized: trimmed };
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded portrait file by MIME type and size.
 */
export function validatePortraitFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: "No image file provided." };
  }

  const mimeType = file.type.toLowerCase();
  const isAllowedType = ALLOWED_PORTRAIT_MIME_TYPES.some((t) => t === mimeType);

  if (!isAllowedType) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || "unknown"}). Please upload a PNG, JPEG, or WebP image.`,
    };
  }

  if (file.size > MAX_PORTRAIT_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Returns a random tactical callsign from the authored catalog.
 */
export function getRandomCallsign(current?: string): string {
  const filtered = TACTICAL_CALLSIGNS.filter((c) => c !== current);
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index] ?? "CIPHER";
}

/**
 * Finds a silhouette archetype by ID.
 */
export function getSilhouetteArchetype(id: SilhouetteId): SilhouetteArchetype {
  return (
    SILHOUETTE_ARCHETYPES.find((s) => s.id === id) ?? SILHOUETTE_ARCHETYPES[0]
  );
}
