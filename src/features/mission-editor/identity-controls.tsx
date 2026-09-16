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
    async (corner?: "top-left" | "top-right" | "bottom-left") => {
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
          setPlacedStatus(`✓ Badge pinned to ${corner.replace("-", " ")} on map canvas!`);
        } else {
          setPlacedStatus("✓ Existing badge updated on map canvas!");
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
      className={`identity-controls-panel ${compact ? "compact" : ""}`}
      aria-label="Operative Identity & GTA VI Badge Controls"
    >
      {/* Header: Establish your operative identity */}
      <div className="identity-controls-header">
        <div className="flex items-center gap-2">
          <span className="gta-neon-badge">★ GTA VI RECORD</span>
          <span className="identity-secure-tag">🔒 LOCAL ENCRYPTED</span>
        </div>
        <h2 className="identity-panel-title">Establish your operative identity</h2>
        <p className="gta-subtitle">
          Configure your street callsign, select a silhouette archetype or upload a photo,
          and customize your live tactical badge on the map canvas.
        </p>
      </div>

      {/* Badge Style Selector — shown prominently before the preview */}
      <div className="badge-style-selector-section">
        <div className="badge-style-section-header">
          <span className="badge-style-label">🎨 Badge Style</span>
          <span className="badge-style-current">{BADGE_STYLES.find(s => s.id === badgeStyle)?.name}</span>
        </div>
        <div className="badge-style-cards">
          {BADGE_STYLES.map((style) => {
            const isActive = badgeStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                className={`badge-style-card ${isActive ? "active" : ""}`}
                onClick={() => setBadgeStyle(style.id)}
                title={style.description}
                aria-pressed={isActive}
              >
                <div
                  className="badge-style-card-preview"
                  style={{ background: style.previewGradient }}
                >
                  <span className="badge-style-card-accent" style={{ color: style.accent }}>VI</span>
                </div>
                <div className="badge-style-card-info">
                  <strong className="badge-style-card-name">{style.name}</strong>
                  <small className="badge-style-card-tag">{style.tagline}</small>
                </div>
                {isActive && <span className="badge-style-active-dot" aria-hidden="true">✦</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Badge Preview Box */}
      <div className="gta-badge-live-preview-box">
        {previewDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewDataUrl}
            alt="GTA VI Identity Badge Live Preview"
            className="gta-badge-preview-img"
          />
        ) : (
          <div className="badge-loading-placeholder">Rendering GTA VI badge…</div>
        )}
      </div>

      {/* Quick Canvas Actions Strip */}
      <div className="gta-badge-actions-strip">
        {/* Badge presence status pill */}
        <div className="flex items-center justify-between px-0.5 py-0.5">
          {isBadgeOnCanvas ? (
            <span className="gta-on-canvas-badge">
              ✓ Active on Canvas — Editing Existing Badge
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 font-mono">
              Not placed on canvas yet
            </span>
          )}
        </div>

        <button
          type="button"
          className={`action-button primary gta-pin-btn ${isBadgeOnCanvas ? "active-update" : ""}`}
          onClick={() => void handlePlaceOnCanvas(isBadgeOnCanvas ? undefined : "top-left")}
          disabled={isUpdatingCanvas}
          title={
            isBadgeOnCanvas
              ? "Update the existing badge on map canvas"
              : "Place badge on the map canvas"
          }
        >
          {isUpdatingCanvas
            ? "Updating…"
            : isBadgeOnCanvas
              ? "✓ Update Existing Badge on Canvas"
              : "⚡ Add Badge to Canvas (Top-Left)"}
        </button>

        <div className="flex gap-1.5">
          <button
            type="button"
            className="action-button secondary gta-sub-pin-btn"
            onClick={() => void handlePlaceOnCanvas("top-right")}
            title="Place or move to Top-Right"
          >
            Top-Right
          </button>
          <button
            type="button"
            className="action-button secondary gta-sub-pin-btn"
            onClick={() => void handlePlaceOnCanvas("bottom-left")}
            title="Place or move to Bottom-Left"
          >
            Bottom-Left
          </button>
          <button
            type="button"
            className="action-button tertiary gta-remove-btn"
            onClick={handleRemoveFromCanvas}
            title="Remove badge from map canvas"
          >
            ✕
          </button>
        </div>
      </div>

      {placedStatus && (
        <div className="gta-placed-toast" role="status">
          {placedStatus}
        </div>
      )}

      {/* Scrollable Configuration Sections */}
      <div className="gta-fields-scroll">
        {/* Section 1: Callsign / Alias */}
        <div className="gta-field-group">
          <div className="flex justify-between items-center">
            <label htmlFor="gta-alias-input" className="gta-field-label">
              Operative Callsign / Alias
            </label>
            <button
              type="button"
              className="gta-rand-btn"
              onClick={() => setAlias(getRandomCallsign(alias))}
            >
              🎲 Random Callsign
            </button>
          </div>
          <input
            id="gta-alias-input"
            type="text"
            className={`gta-text-input gta-pricedown-text ${
              !aliasValidation.valid && alias.length > 0 ? "has-error" : ""
            }`}
            value={alias}
            onChange={(e) => setAlias(e.target.value.toUpperCase())}
            maxLength={24}
            placeholder="e.g. CIPHER"
          />
          <div className="alias-feedback-row">
            {!aliasValidation.valid && alias.length > 0 ? (
              <span className="alias-error">{aliasValidation.error}</span>
            ) : (
              <span className="alias-valid">
                ✓ Callsign ready ({aliasValidation.sanitized || "CIPHER"})
              </span>
            )}
            <span className="char-count">{alias.length} / 24</span>
          </div>
        </div>

        {/* Section 2: Operational Portrait (Silhouettes vs Photo) */}
        <div className="gta-field-group">
          <label className="gta-field-label">Operational Portrait</label>
          <div className="portrait-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={portraitSource === "silhouette"}
              className={`portrait-tab-btn ${
                portraitSource === "silhouette" ? "active" : ""
              }`}
              onClick={() => setPortraitSource("silhouette")}
            >
              <span className="tab-icon">👤</span>
              <span>Authored Silhouettes</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portraitSource === "custom"}
              className={`portrait-tab-btn ${
                portraitSource === "custom" ? "active" : ""
              }`}
              onClick={() => {
                setPortraitSource("custom");
                if (!uploadedImage) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <span className="tab-icon">📷</span>
              <span>Upload Photo</span>
            </button>
          </div>

          {/* Mode A: Silhouette Grid */}
          {portraitSource === "silhouette" && (
            <div className="silhouette-grid compact" role="radiogroup">
              {SILHOUETTE_ARCHETYPES.map((arch) => {
                const isSelected = silhouetteId === arch.id;
                return (
                  <div
                    key={arch.id}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Archetype: ${arch.name}, Role: ${arch.role}`}
                    tabIndex={0}
                    className={`silhouette-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSilhouetteId(arch.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSilhouetteId(arch.id);
                      }
                    }}
                  >
                    <div className="silhouette-avatar-frame">
                      <svg
                        viewBox="0 0 24 24"
                        className="silhouette-svg"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d={arch.svgPath} />
                      </svg>
                      {isSelected && <span className="selected-indicator">✓</span>}
                    </div>
                    <div className="silhouette-meta">
                      <div className="silhouette-name-row">
                        <strong className="silhouette-name">{arch.name}</strong>
                        <span className="silhouette-role-badge">{arch.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode B: Photo Upload & Cropper */}
          {portraitSource === "custom" && (
            <div className="photo-upload-area compact">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                aria-label="Upload operative portrait photo (PNG, JPEG, WebP up to 5MB)"
                onChange={handleFileInputChange}
              />

              {uploadError && (
                <div className="upload-error-alert" role="alert">
                  <span>⚠️ {uploadError}</span>
                  <button
                    type="button"
                    className="clear-error-btn"
                    onClick={() => setUploadError(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {!uploadedImage ? (
                <div
                  className={`upload-dropzone ${isDraggingOver ? "drag-over" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="dropzone-icon">📷</span>
                  <strong className="dropzone-title">Click or drag photo here</strong>
                  <span className="dropzone-sub">
                    PNG, JPEG, or WebP up to 5MB. Processed locally in browser.
                  </span>
                </div>
              ) : (
                <div className="photo-controls-container">
                  <div className="photo-actions-bar">
                    <span className="photo-status">
                      {isProcessing ? "Rendering filter…" : "✓ Photo framed"}
                    </span>
                    <button
                      type="button"
                      className="replace-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </button>
                  </div>

                  {/* Zoom & Pan Sliders */}
                  <div className="crop-sliders-row">
                    <label className="crop-slider-label">
                      <span>Zoom: {zoom.toFixed(1)}x</span>
                      <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="crop-range-slider"
                      />
                    </label>
                    <label className="crop-slider-label">
                      <span>Pan X</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={offsetX}
                        onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                        className="crop-range-slider"
                      />
                    </label>
                    <label className="crop-slider-label">
                      <span>Pan Y</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={offsetY}
                        onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                        className="crop-range-slider"
                      />
                    </label>
                  </div>

                  {/* Surveillance Filters */}
                  <div className="filter-presets-section">
                    <span className="filter-label">Surveillance Filter:</span>
                    <div className="filter-chips">
                      {PORTRAIT_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`filter-chip ${
                            portraitFilter === f.id ? "active" : ""
                          }`}
                          onClick={() => setPortraitFilter(f.id)}
                          aria-label={`${f.name} filter: ${f.tagline}`}
                          aria-pressed={portraitFilter === f.id}
                        >
                          <strong className="chip-name">{f.name}</strong>
                          <small className="chip-tag">{f.tagline}</small>
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
        <div className="gta-field-group">
          <label htmlFor="gta-role-select" className="gta-field-label">
            Operative Role &amp; Specialization
          </label>
          <select
            id="gta-role-select"
            className="gta-select-input"
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
        <div className="gta-field-group">
          <label className="gta-field-label">Wanted Level: {wantedStars} / 5 Stars</label>
          <div className="gta-stars-picker" role="radiogroup" aria-label="Wanted stars">
            {[1, 2, 3, 4, 5].map((s) => {
              const isFilled = wantedStars >= s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={wantedStars === s}
                  className={`gta-star-btn ${isFilled ? "filled" : ""}`}
                  onClick={() => setWantedStars(s)}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Visual Theme Presets */}
        <div className="gta-field-group">
          <label className="gta-field-label">GTA VI Visual Theme</label>
          <div className="gta-themes-grid">
            {THEMES.map((th) => {
              const isSelected = theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  className={`gta-theme-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => setTheme(th.id)}
                >
                  <div className="theme-color-swatch">
                    <span style={{ background: th.colors[0] }} />
                    <span style={{ background: th.colors[1] }} />
                  </div>
                  <span className="theme-btn-name">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: Bounty & Crew Cut */}
        <div className="gta-dual-row">
          <div className="gta-field-group">
            <label htmlFor="gta-bounty-input" className="gta-field-label">
              Bounty Amount
            </label>
            <input
              id="gta-bounty-input"
              type="text"
              className="gta-text-input"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              placeholder="$1,250,000"
            />
          </div>
          <div className="gta-field-group">
            <label htmlFor="gta-cut-input" className="gta-field-label">
              Crew Cut %
            </label>
            <input
              id="gta-cut-input"
              type="text"
              className="gta-text-input"
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
