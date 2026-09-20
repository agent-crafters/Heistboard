"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  type GtaBadgeOptions,
  type GtaBadgeTheme,
  type GtaBadgeStyle,
  BADGE_STYLES,
  DEFAULT_GTA_BADGE_OPTIONS,
  FABRIC_IDENTITY_BADGE_TAG,
  hasBadgeOnFabricCanvas,
  placeOrUpdateBadgeOnFabricCanvas,
  renderGtaIdentityBadgeToCanvas,
} from "@/lib/gta-identity-badge";
import {
  findFabricCanvas,
  type FabricCanvasLike,
  type FabricObjectLike,
} from "@/lib/sticker-canvas-importer";
import {
  type IdentityState,
  type PortraitFilter,
  type PortraitSource,
  type SilhouetteId,
  DEFAULT_IDENTITY_STATE,
  PORTRAIT_FILTERS,
  SILHOUETTE_ARCHETYPES,
  getRandomCallsign,
  validateAlias,
  validatePortraitFile,
} from "@/domain/identity";
import {
  cropAndFilterPortrait,
  decodeImageFromFile,
} from "@/lib/portrait-processor";

export interface IdentityControlsProps {
  initialOptions?: Partial<GtaBadgeOptions>;
  identityState?: IdentityState;
  onIdentityStateChange?: (state: IdentityState) => void;
  editorContainerRef?: React.RefObject<HTMLElement | null>;
  onChange?: (options: GtaBadgeOptions) => void;
  compact?: boolean;
}

const PRESET_ROLES = [
  "THE INFILTRATOR · TACTICAL RECON",
  "HEIST MASTERMIND · S-TIER",
  "GETAWAY DRIVER · WHEELMAN",
  "WEAPONS SPECIALIST · HEAVY",
  "THE GHOST · SURVEILLANCE",
  "SIGNALS & TECH SPECIALIST",
] as const;

const THEMES: readonly { id: GtaBadgeTheme; name: string; colors: string[] }[] = [
  { id: "vice-neon", name: "Vice Neon", colors: ["#ff007f", "#00f5d4"] },
  { id: "sunset-gold", name: "Sunset Gold", colors: ["#ffd000", "#ff6b35"] },
  { id: "miami-cyan", name: "Miami Cyan", colors: ["#00f5d4", "#9d4edd"] },
  { id: "vice-noir", name: "Vice Noir", colors: ["#ffffff", "#ffd000"] },
];

export function IdentityControls({
  initialOptions = {},
  identityState = DEFAULT_IDENTITY_STATE,
  onIdentityStateChange,
  editorContainerRef,
  onChange,
  compact = false,
}: IdentityControlsProps) {
  // Alias & Portrait State
  const [alias, setAlias] = useState(identityState.alias || initialOptions.alias || "CIPHER");
  const [portraitSource, setPortraitSource] = useState<PortraitSource>(
    identityState.portraitSource ?? "silhouette",
  );
  const [silhouetteId, setSilhouetteId] = useState<SilhouetteId>(
    identityState.silhouetteId ?? (initialOptions.silhouetteId as SilhouetteId) ?? "infiltrator",
  );
  const [portraitFilter, setPortraitFilter] = useState<PortraitFilter>(
    identityState.portraitFilter ?? "cctv",
  );

  // Photo Upload & Crop/Filter State
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(
    identityState.portraitUrl ?? initialOptions.portraitUrl,
  );
  const [customPhotoBlob, setCustomPhotoBlob] = useState<Blob | undefined>(
    identityState.portraitBlob,
  );

  // Badge Customization State
  const [role, setRole] = useState(initialOptions.role ?? DEFAULT_GTA_BADGE_OPTIONS.role);
  const [theme, setTheme] = useState<GtaBadgeTheme>(
    initialOptions.theme ?? DEFAULT_GTA_BADGE_OPTIONS.theme ?? "vice-neon",
  );
  const [badgeStyle, setBadgeStyle] = useState<GtaBadgeStyle>(
    initialOptions.badgeStyle ?? DEFAULT_GTA_BADGE_OPTIONS.badgeStyle ?? "vice-sunset",
  );
  const [wantedStars, setWantedStars] = useState(
    initialOptions.wantedStars ?? DEFAULT_GTA_BADGE_OPTIONS.wantedStars ?? 5,
  );
  const [bounty, setBounty] = useState(
    initialOptions.bounty ?? DEFAULT_GTA_BADGE_OPTIONS.bounty ?? "$1,250,000",
  );
  const [crewCut, setCrewCut] = useState(
    initialOptions.crewCut ?? DEFAULT_GTA_BADGE_OPTIONS.crewCut ?? "40%",
  );

  // Live Canvas Preview & Status
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [isUpdatingCanvas, setIsUpdatingCanvas] = useState(false);
  const [placedStatus, setPlacedStatus] = useState<string | null>(null);
  const [isBadgeOnCanvas, setIsBadgeOnCanvas] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Active portrait URL (custom crop vs silhouette)
  const activePortraitUrl = portraitSource === "custom" ? customPhotoUrl : undefined;

  // Build current badge options
  const currentBadgeOptions: GtaBadgeOptions = useMemo(
    () => ({
      alias: alias || "CIPHER",
      role,
      silhouetteId,
      portraitUrl: activePortraitUrl,
      theme,
      badgeStyle,
      wantedStars,
      bounty,
      crewCut,
    }),
    [
      alias,
      role,
      silhouetteId,
      activePortraitUrl,
      theme,
      badgeStyle,
      wantedStars,
      bounty,
      crewCut,
    ],
  );

  const aliasValidation = validateAlias(alias);

  // Check whether an identity badge is currently on the Fabric canvas
  const checkCanvasForBadge = useCallback(() => {
    const canvas =
      findFabricCanvas(editorContainerRef?.current) ??
      (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
        .__heistboardFabricCanvas;
    if (!canvas) return;
    const onCanvas = hasBadgeOnFabricCanvas(canvas);
    setIsBadgeOnCanvas(onCanvas);
  }, [editorContainerRef]);

  useEffect(() => {
    checkCanvasForBadge();
    const interval = setInterval(checkCanvasForBadge, 600);
    return () => clearInterval(interval);
  }, [checkCanvasForBadge]);

  // When an existing badge is already on canvas, live-sync changes immediately to the canvas!
  useEffect(() => {
    if (!isBadgeOnCanvas) return;

    const timer = setTimeout(async () => {
      const canvas =
        findFabricCanvas(editorContainerRef?.current) ??
        (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
          .__heistboardFabricCanvas;
      if (canvas && hasBadgeOnFabricCanvas(canvas)) {
        await placeOrUpdateBadgeOnFabricCanvas(canvas, currentBadgeOptions);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isBadgeOnCanvas, currentBadgeOptions, editorContainerRef]);

  // Reprocess uploaded photo when zoom, offset, or filter changes
  useEffect(() => {
    if (!uploadedImage || portraitSource !== "custom") return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsProcessing(true);
        const result = await cropAndFilterPortrait(uploadedImage, {
          zoom,
          offsetX,
          offsetY,
          filter: portraitFilter,
          targetSize: 400,
        });

        if (!active) return;
        setCustomPhotoUrl(result.dataUrl);
        setCustomPhotoBlob(result.blob);
      } catch (err) {
        if (!active) return;
        console.error("Portrait processing error:", err);
      } finally {
        if (active) setIsProcessing(false);
      }
    }, 40);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [uploadedImage, zoom, offsetX, offsetY, portraitFilter, portraitSource]);

  // Generate live badge preview and notify parent
  useEffect(() => {
    let active = true;
    void renderGtaIdentityBadgeToCanvas(currentBadgeOptions).then((canvas) => {
      if (active) {
        setPreviewDataUrl(canvas.toDataURL("image/png"));
      }
    });

    if (onChange) {
      onChange(currentBadgeOptions);
    }

    if (onIdentityStateChange) {
      onIdentityStateChange({
        alias,
        portraitSource,
        silhouetteId,
        portraitUrl: activePortraitUrl,
        portraitBlob: customPhotoBlob,
        portraitFilter,
      });
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    alias,
    role,
    silhouetteId,
    activePortraitUrl,
    theme,
    badgeStyle,
    wantedStars,
    bounty,
    crewCut,
    portraitSource,
    portraitFilter,
  ]);

  const handlePlaceOnCanvas = useCallback(
    async (corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center") => {
      const canvas =
        findFabricCanvas(editorContainerRef?.current) ??
        (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
          .__heistboardFabricCanvas;

      if (!canvas) {
        setPlacedStatus("⚠️ Map canvas not ready yet.");
        setTimeout(() => setPlacedStatus(null), 3000);
        return;
      }

      setIsUpdatingCanvas(true);
      const success = await placeOrUpdateBadgeOnFabricCanvas(
        canvas,
        currentBadgeOptions,
        corner,
      );
      setIsUpdatingCanvas(false);

      if (success) {
        setIsBadgeOnCanvas(true);
        if (corner) {
          setPlacedStatus(`✓ Badge placed at ${corner.replace("-", " ")} on map canvas! You can drag it anywhere.`);
        } else {
          setPlacedStatus("✓ Badge updated on map canvas! You can drag it anywhere.");
        }
      } else {
        setPlacedStatus("⚠️ Could not place badge on canvas.");
      }

      setTimeout(() => setPlacedStatus(null), 3000);
    },
    [currentBadgeOptions, editorContainerRef],
  );

  const handleRemoveFromCanvas = () => {
    const canvas =
      findFabricCanvas(editorContainerRef?.current) ??
      (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
        .__heistboardFabricCanvas;

    if (!canvas) return;

    const objects = canvas.getObjects();
    const existing = objects.find(
      (obj) =>
        (obj as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true,
    );

    if (existing) {
      (canvas as unknown as { remove?(o: FabricObjectLike): void }).remove?.(existing);
      canvas.requestRenderAll();
      setIsBadgeOnCanvas(false);
      setPlacedStatus("✓ Removed badge from canvas.");
      setTimeout(() => setPlacedStatus(null), 3000);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    const validation = validatePortraitFile(file);
    if (!validation.valid) {
      setUploadError(validation.error ?? "Invalid image file.");
      return;
    }

    try {
      setIsProcessing(true);
      const img = await decodeImageFromFile(file);
      setUploadedImage(img);
      setPortraitSource("custom");
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to decode uploaded image.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    isDraggingRef.current = false;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    isDraggingRef.current = false;
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-charcoal-900/95 border-l border-coral/30 text-paper overflow-hidden select-none ${compact ? "w-full" : ""}`}
      aria-label="Operative Identity & GTA VI Badge Controls"
    >
      {/* Header: Establish your operative identity */}
      <div className="p-4 border-b border-coral/20 bg-charcoal-850/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-coral/20 text-coral border border-coral/40">★ GTA VI RECORD</span>
          <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-petrol/20 text-petrol border border-petrol/40">🔒 LOCAL ENCRYPTED</span>
        </div>
        <h2 className="font-display text-lg tracking-wider text-white uppercase mt-2">Establish your operative identity</h2>
        <p className="text-xs text-paper-muted leading-tight mt-1">
          Configure your street callsign, select a silhouette archetype or upload a photo,
          and customize your live tactical badge on the map canvas.
        </p>
      </div>

      {/* Badge Style Selector — shown prominently before the preview */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between text-xs font-mono text-paper-muted mb-2">
          <span className="font-bold text-white">🎨 Badge Style</span>
          <span className="text-petrol font-bold">{BADGE_STYLES.find(s => s.id === badgeStyle)?.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BADGE_STYLES.map((style) => {
            const isActive = badgeStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer relative ${
                  isActive
                    ? "bg-charcoal-800 border-petrol shadow-lg shadow-petrol/10"
                    : "bg-charcoal-800/60 border-white/5 hover:border-white/20"
                }`}
                onClick={() => setBadgeStyle(style.id)}
                title={style.description}
                aria-pressed={isActive}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shadow-inner shrink-0"
                  style={{ background: style.previewGradient }}
                >
                  <span style={{ color: style.accent }}>VI</span>
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="text-xs text-white block truncate">{style.name}</strong>
                  <small className="text-[10px] text-paper-muted block truncate">{style.tagline}</small>
                </div>
                {isActive && <span className="absolute top-1 right-1.5 text-petrol text-xs" aria-hidden="true">✦</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Badge Preview Box — Draggable directly onto map */}
      <div className="p-4 bg-charcoal-950 border-b border-white/10 flex items-center justify-center min-h-[140px] shrink-0">
        {previewDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewDataUrl}
            alt="GTA VI Identity Badge Live Preview"
            className="max-h-36 max-w-full object-contain filter drop-shadow-lg"
            style={{ cursor: "grab" }}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-heistboard-badge", JSON.stringify(currentBadgeOptions));
              e.dataTransfer.effectAllowed = "copy";
            }}
            title="Drag and drop this badge directly onto any spot on the map!"
          />
        ) : (
          <div className="font-mono text-xs text-paper-muted animate-pulse">Rendering GTA VI badge…</div>
        )}
      </div>

      {/* Quick Canvas Actions Strip */}
      <div className="p-3 bg-charcoal-850 border-b border-coral/20 flex flex-col gap-2 shrink-0">
        {/* Badge presence status pill */}
        <div className="flex items-center justify-between px-0.5 py-0.5">
          {isBadgeOnCanvas ? (
            <span className="font-mono text-[11px] text-petrol font-bold flex items-center gap-1">
              ✓ Active on Map Canvas — Drag Anywhere to Reposition
            </span>
          ) : (
            <span className="text-[11px] text-paper-muted font-mono">
              Not placed on map yet
            </span>
          )}
        </div>

        <button
          type="button"
          className="w-full py-2.5 px-4 rounded-lg bg-coral hover:bg-coral-soft text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-coral/25 cursor-pointer disabled:opacity-50"
          onClick={() => void handlePlaceOnCanvas(isBadgeOnCanvas ? undefined : "center")}
          disabled={isUpdatingCanvas}
          title={
            isBadgeOnCanvas
              ? "Update badge and keep its position"
              : "Place badge on the map canvas"
          }
        >
          {isUpdatingCanvas
            ? "Updating…"
            : isBadgeOnCanvas
              ? "✓ Update Badge on Map"
              : "⚡ Add Badge to Map"}
        </button>

        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="flex-1 py-1.5 px-2 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-[10px] font-bold border border-white/10 transition-colors text-center cursor-pointer"
            onClick={() => void handlePlaceOnCanvas("top-left")}
            title="Move to Top-Left"
          >
            Top-Left
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 px-2 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-[10px] font-bold border border-white/10 transition-colors text-center cursor-pointer"
            onClick={() => void handlePlaceOnCanvas("top-right")}
            title="Move to Top-Right"
          >
            Top-Right
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 px-2 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-[10px] font-bold border border-white/10 transition-colors text-center cursor-pointer"
            onClick={() => void handlePlaceOnCanvas("center")}
            title="Move to Center"
          >
            Center
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 px-2 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-[10px] font-bold border border-white/10 transition-colors text-center cursor-pointer"
            onClick={() => void handlePlaceOnCanvas("bottom-left")}
            title="Move to Bottom-Left"
          >
            Bottom-Left
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 px-2 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-[10px] font-bold border border-white/10 transition-colors text-center cursor-pointer"
            onClick={() => void handlePlaceOnCanvas("bottom-right")}
            title="Move to Bottom-Right"
          >
            Bottom-Right
          </button>
          <button
            type="button"
            className="py-1.5 px-3 rounded-md bg-charcoal-800 hover:bg-coral/20 text-coral font-mono text-[10px] font-bold border border-coral/30 transition-colors cursor-pointer"
            onClick={handleRemoveFromCanvas}
            title="Remove badge from map canvas"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-paper-muted mt-1 font-mono text-center">
          💡 Drag badge directly onto map, or click above to place &amp; drag anywhere
        </p>
      </div>

      {placedStatus && (
        <div className="mx-4 my-2 px-3 py-1.5 rounded-md bg-petrol/20 text-petrol font-mono text-xs font-bold border border-petrol/40 text-center animate-pulse" role="status">
          {placedStatus}
        </div>
      )}

      {/* Scrollable Configuration Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section 1: Callsign / Alias */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="gta-alias-input" className="text-xs font-mono font-bold uppercase text-paper-muted block">
              Operative Callsign / Alias
            </label>
            <button
              type="button"
              className="font-mono text-[10px] px-2 py-0.5 rounded bg-charcoal-800 hover:bg-charcoal-700 text-petrol border border-petrol/30 transition-colors cursor-pointer"
              onClick={() => setAlias(getRandomCallsign(alias))}
            >
              🎲 Random Callsign
            </button>
          </div>
          <input
            id="gta-alias-input"
            type="text"
            className={`w-full px-3 py-2 rounded-lg bg-charcoal-950 border text-white placeholder:text-paper-muted/60 text-sm font-mono font-display tracking-wider focus:outline-none ${
              !aliasValidation.valid && alias.length > 0 ? "border-coral" : "border-coral/30 focus:border-coral"
            }`}
            value={alias}
            onChange={(e) => setAlias(e.target.value.toUpperCase())}
            maxLength={24}
            placeholder="e.g. CIPHER"
          />
          <div className="flex items-center justify-between text-[11px] font-mono">
            {!aliasValidation.valid && alias.length > 0 ? (
              <span className="text-coral">{aliasValidation.error}</span>
            ) : (
              <span className="text-petrol">
                ✓ Callsign ready ({aliasValidation.sanitized || "CIPHER"})
              </span>
            )}
            <span className="text-paper-muted/60">{alias.length} / 24</span>
          </div>
        </div>

        {/* Section 2: Operational Portrait (Silhouettes vs Photo) */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-paper-muted block">Operational Portrait</label>
          <div className="flex rounded-lg bg-charcoal-950 p-1 border border-white/10 gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={portraitSource === "silhouette"}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portraitSource === "silhouette" ? "bg-coral text-white shadow-sm" : "text-paper-muted hover:text-white"
              }`}
              onClick={() => setPortraitSource("silhouette")}
            >
              <span>👤</span>
              <span>Authored Silhouettes</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portraitSource === "custom"}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portraitSource === "custom" ? "bg-coral text-white shadow-sm" : "text-paper-muted hover:text-white"
              }`}
              onClick={() => {
                setPortraitSource("custom");
                if (!uploadedImage) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <span>📷</span>
              <span>Upload Photo</span>
            </button>
          </div>

          {/* Mode A: Silhouette Grid */}
          {portraitSource === "silhouette" && (
            <div className="grid grid-cols-3 gap-2 mt-2" role="radiogroup">
              {SILHOUETTE_ARCHETYPES.map((arch) => {
                const isSelected = silhouetteId === arch.id;
                return (
                  <div
                    key={arch.id}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Archetype: ${arch.name}, Role: ${arch.role}`}
                    tabIndex={0}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? "bg-charcoal-800 border-coral shadow-md shadow-coral/10"
                        : "bg-charcoal-800/60 border-white/5 hover:border-white/20"
                    }`}
                    onClick={() => setSilhouetteId(arch.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSilhouetteId(arch.id);
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-charcoal-950 border border-white/10 flex items-center justify-center relative overflow-hidden text-coral">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-7 h-7"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d={arch.svgPath} />
                      </svg>
                      {isSelected && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">✓</span>}
                    </div>
                    <div className="min-w-0 w-full text-center">
                      <strong className="text-xs text-white block truncate">{arch.name}</strong>
                      <span className="text-[10px] text-paper-muted block truncate">{arch.role}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode B: Photo Upload & Cropper */}
          {portraitSource === "custom" && (
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label="Upload operative portrait photo (PNG, JPEG, WebP up to 5MB)"
                onChange={handleFileInputChange}
              />

              {uploadError && (
                <div className="p-2 rounded-lg bg-coral/20 border border-coral text-coral text-xs font-mono flex items-center justify-between mb-2" role="alert">
                  <span>⚠️ {uploadError}</span>
                  <button
                    type="button"
                    className="text-coral hover:text-white cursor-pointer px-1"
                    onClick={() => setUploadError(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {!uploadedImage ? (
                <div
                  className={`p-6 border-2 border-dashed rounded-xl bg-charcoal-950/60 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isDraggingOver ? "border-coral bg-coral/10" : "border-coral/30 hover:border-coral"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-2xl">📷</span>
                  <strong className="text-xs font-mono text-white block">Click or drag photo here</strong>
                  <span className="text-[10px] text-paper-muted block">
                    PNG, JPEG, or WebP up to 5MB. Processed locally in browser.
                  </span>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-charcoal-950 border border-white/5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-petrol font-bold">
                      {isProcessing ? "Rendering filter…" : "✓ Photo framed"}
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-charcoal-800 hover:bg-charcoal-700 text-white text-[11px] border border-white/10 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </button>
                  </div>

                  {/* Zoom & Pan Sliders */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-[10px] font-mono text-paper-muted flex flex-col gap-1">
                      <span>Zoom: {zoom.toFixed(1)}x</span>
                      <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-coral cursor-pointer"
                      />
                    </label>
                    <label className="text-[10px] font-mono text-paper-muted flex flex-col gap-1">
                      <span>Pan X</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={offsetX}
                        onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                        className="w-full accent-coral cursor-pointer"
                      />
                    </label>
                    <label className="text-[10px] font-mono text-paper-muted flex flex-col gap-1">
                      <span>Pan Y</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={offsetY}
                        onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                        className="w-full accent-coral cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Surveillance Filters */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <span className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">Surveillance Filter:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PORTRAIT_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            portraitFilter === f.id
                              ? "bg-charcoal-800 border-petrol text-white shadow-sm"
                              : "bg-charcoal-800/60 border-white/5 text-paper-muted hover:border-white/20"
                          }`}
                          onClick={() => setPortraitFilter(f.id)}
                          aria-label={`${f.name} filter: ${f.tagline}`}
                          aria-pressed={portraitFilter === f.id}
                        >
                          <strong className="text-xs font-bold block text-white">{f.name}</strong>
                          <small className="text-[10px] text-paper-muted block">{f.tagline}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Operative Role */}
        <div className="space-y-1.5">
          <label htmlFor="gta-role-select" className="text-xs font-mono font-bold uppercase text-paper-muted block">
            Operative Role &amp; Specialization
          </label>
          <select
            id="gta-role-select"
            className="w-full px-3 py-2 rounded-lg bg-charcoal-950 border border-coral/30 text-white text-xs font-mono focus:outline-none focus:border-coral"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {PRESET_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Section 4: Wanted Level Stars */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-paper-muted block">Wanted Level: {wantedStars} / 5 Stars</label>
          <div className="flex gap-2 text-xl" role="radiogroup" aria-label="Wanted stars">
            {[1, 2, 3, 4, 5].map((s) => {
              const isFilled = wantedStars >= s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={wantedStars === s}
                  className={`p-1 text-2xl transition-transform hover:scale-125 cursor-pointer ${
                    isFilled ? "text-mustard drop-shadow-[0_0_8px_rgba(255,170,0,0.6)]" : "text-white/20"
                  }`}
                  onClick={() => setWantedStars(s)}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Visual Theme Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-paper-muted block">GTA VI Visual Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((th) => {
              const isSelected = theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-charcoal-800 border-coral shadow-md shadow-coral/10"
                      : "bg-charcoal-800/60 border-white/5 hover:border-white/20"
                  }`}
                  onClick={() => setTheme(th.id)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden flex shrink-0 border border-white/20">
                    <span className="w-3 h-full" style={{ background: th.colors[0] }} />
                    <span className="w-3 h-full" style={{ background: th.colors[1] }} />
                  </div>
                  <span className="text-xs text-white font-mono">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: Bounty & Crew Cut */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="gta-bounty-input" className="text-xs font-mono font-bold uppercase text-paper-muted block">
              Bounty Amount
            </label>
            <input
              id="gta-bounty-input"
              type="text"
              className="w-full px-3 py-2 rounded-lg bg-charcoal-950 border border-coral/30 text-white placeholder:text-paper-muted/60 text-sm font-mono focus:outline-none focus:border-coral"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              placeholder="$1,250,000"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="gta-cut-input" className="text-xs font-mono font-bold uppercase text-paper-muted block">
              Crew Cut %
            </label>
            <input
              id="gta-cut-input"
              type="text"
              className="w-full px-3 py-2 rounded-lg bg-charcoal-950 border border-coral/30 text-white placeholder:text-paper-muted/60 text-sm font-mono focus:outline-none focus:border-coral"
              value={crewCut}
              onChange={(e) => setCrewCut(e.target.value)}
              placeholder="40%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
