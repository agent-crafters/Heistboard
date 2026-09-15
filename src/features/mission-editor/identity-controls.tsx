"use client";

import { useEffect, useState } from "react";
import {
  type GtaBadgeOptions,
  type GtaBadgeTheme,
  DEFAULT_GTA_BADGE_OPTIONS,
  FABRIC_IDENTITY_BADGE_TAG,
  placeOrUpdateBadgeOnFabricCanvas,
  renderGtaIdentityBadgeToCanvas,
} from "@/lib/gta-identity-badge";
import { findFabricCanvas, type FabricCanvasLike, type FabricObjectLike } from "@/lib/sticker-canvas-importer";
import { getRandomCallsign } from "@/domain/identity";

export interface IdentityControlsProps {
  initialOptions?: Partial<GtaBadgeOptions>;
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
  editorContainerRef,
  onChange,
  compact = false,
}: IdentityControlsProps) {
  const [badgeOptions, setBadgeOptions] = useState<GtaBadgeOptions>({
    ...DEFAULT_GTA_BADGE_OPTIONS,
    ...initialOptions,
  });

  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [isUpdatingCanvas, setIsUpdatingCanvas] = useState(false);
  const [placedStatus, setPlacedStatus] = useState<string | null>(null);

  // Generate live preview whenever options change
  useEffect(() => {
    let active = true;
    void renderGtaIdentityBadgeToCanvas(badgeOptions).then((canvas) => {
      if (active) {
        setPreviewDataUrl(canvas.toDataURL("image/png"));
      }
    });

    if (onChange) {
      onChange(badgeOptions);
    }

    return () => {
      active = false;
    };
  }, [badgeOptions, onChange]);

  const updateOption = <K extends keyof GtaBadgeOptions>(
    key: K,
    value: GtaBadgeOptions[K],
  ) => {
    setBadgeOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handlePlaceOnCanvas = async (
    corner: "top-left" | "top-right" | "bottom-left" = "top-left",
  ) => {
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
    const success = await placeOrUpdateBadgeOnFabricCanvas(canvas, badgeOptions, corner);
    setIsUpdatingCanvas(false);

    if (success) {
      setPlacedStatus(`✓ Badge pinned to ${corner.replace("-", " ")} on map canvas!`);
    } else {
      setPlacedStatus("⚠️ Could not place badge on canvas.");
    }

    setTimeout(() => setPlacedStatus(null), 3000);
  };

  const handleRemoveFromCanvas = () => {
    const canvas =
      findFabricCanvas(editorContainerRef?.current) ??
      (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
        .__heistboardFabricCanvas;

    if (!canvas) return;

    const objects = canvas.getObjects();
    const existing = objects.find(
      (obj) => (obj as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true,
    );

    if (existing) {
      (canvas as unknown as { remove?(o: FabricObjectLike): void }).remove?.(existing);
      canvas.requestRenderAll();
      setPlacedStatus("✓ Removed badge from canvas.");
      setTimeout(() => setPlacedStatus(null), 3000);
    }
  };

  return (
    <div
      className={`identity-controls-panel ${compact ? "compact" : ""}`}
      aria-label="GTA VI Operative Identity Controls"
    >
      <div className="identity-controls-header">
        <div className="flex items-center gap-2">
          <span className="gta-neon-badge">★ GTA VI RECORD</span>
          <span className="gta-controls-title">Operative ID Badge</span>
        </div>
        <span className="gta-subtitle">
          Live editable on map canvas with drag &amp; scale controls.
        </span>
      </div>

      {/* Live Badge Preview */}
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

      {/* Quick Action Placement Buttons */}
      <div className="gta-badge-actions-strip">
        <button
          type="button"
          className="action-button primary gta-pin-btn"
          onClick={() => void handlePlaceOnCanvas("top-left")}
          disabled={isUpdatingCanvas}
          title="Place or update editable badge on the map canvas"
        >
          {isUpdatingCanvas ? "Updating…" : "⚡ Pin to Top-Left on Canvas"}
        </button>

        <div className="flex gap-1.5">
          <button
            type="button"
            className="action-button secondary gta-sub-pin-btn"
            onClick={() => void handlePlaceOnCanvas("top-right")}
            title="Place at Top-Right"
          >
            Top-Right
          </button>
          <button
            type="button"
            className="action-button secondary gta-sub-pin-btn"
            onClick={() => void handlePlaceOnCanvas("bottom-left")}
            title="Place at Bottom-Left"
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

      {/* Editable Fields */}
      <div className="gta-fields-scroll">
        {/* Callsign Input */}
        <div className="gta-field-group">
          <div className="flex justify-between items-center">
            <label htmlFor="gta-alias-input" className="gta-field-label">
              Operative Callsign
            </label>
            <button
              type="button"
              className="gta-rand-btn"
              onClick={() => updateOption("alias", getRandomCallsign(badgeOptions.alias))}
            >
              🎲 Randomize
            </button>
          </div>
          <input
            id="gta-alias-input"
            type="text"
            className="gta-text-input gta-pricedown-text"
            value={badgeOptions.alias}
            onChange={(e) => updateOption("alias", e.target.value.toUpperCase())}
            maxLength={24}
            placeholder="CIPHER"
          />
        </div>

        {/* Role Selector */}
        <div className="gta-field-group">
          <label htmlFor="gta-role-select" className="gta-field-label">
            Operative Role &amp; Specialization
          </label>
          <select
            id="gta-role-select"
            className="gta-select-input"
            value={badgeOptions.role}
            onChange={(e) => updateOption("role", e.target.value)}
          >
            {PRESET_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Wanted Stars Rating */}
        <div className="gta-field-group">
          <label className="gta-field-label">
            Wanted Level: {badgeOptions.wantedStars} / 5 Stars
          </label>
          <div className="gta-stars-picker" role="radiogroup" aria-label="Wanted stars">
            {[1, 2, 3, 4, 5].map((s) => {
              const isFilled = (badgeOptions.wantedStars ?? 5) >= s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={badgeOptions.wantedStars === s}
                  className={`gta-star-btn ${isFilled ? "filled" : ""}`}
                  onClick={() => updateOption("wantedStars", s)}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Preset Cards */}
        <div className="gta-field-group">
          <label className="gta-field-label">GTA VI Visual Theme</label>
          <div className="gta-themes-grid">
            {THEMES.map((th) => {
              const isSelected = badgeOptions.theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  className={`gta-theme-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => updateOption("theme", th.id)}
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

        {/* Financial Cut / Bounty */}
        <div className="gta-dual-row">
          <div className="gta-field-group">
            <label htmlFor="gta-bounty-input" className="gta-field-label">
              Bounty Amount
            </label>
            <input
              id="gta-bounty-input"
              type="text"
              className="gta-text-input"
              value={badgeOptions.bounty ?? "$1,250,000"}
              onChange={(e) => updateOption("bounty", e.target.value)}
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
              value={badgeOptions.crewCut ?? "40%"}
              onChange={(e) => updateOption("crewCut", e.target.value)}
              placeholder="40%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
