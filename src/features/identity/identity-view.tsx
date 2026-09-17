"use client";

import { useEffect, useRef, useState } from "react";
import {
  type IdentityState,
  type PortraitFilter,
  type PortraitSource,
  type SilhouetteId,
  DEFAULT_IDENTITY_STATE,
  PORTRAIT_FILTERS,
  SILHOUETTE_ARCHETYPES,
  getRandomCallsign,
  getSilhouetteArchetype,
  validateAlias,
  validatePortraitFile,
} from "@/domain/identity";
import {
  cropAndFilterPortrait,
  decodeImageFromFile,
} from "@/lib/portrait-processor";

export interface IdentityViewProps {
  initialState?: IdentityState;
  onConfirmIdentity: (identity: IdentityState) => void;
  onReturnToTerritory?: () => void;
}

export function IdentityView({
  initialState = DEFAULT_IDENTITY_STATE,
  onConfirmIdentity,
  onReturnToTerritory,
}: IdentityViewProps) {
  const [alias, setAlias] = useState(initialState.alias);
  const [portraitSource, setPortraitSource] = useState<PortraitSource>(
    initialState.portraitSource,
  );
  const [silhouetteId, setSilhouetteId] = useState<SilhouetteId>(
    initialState.silhouetteId,
  );
  const [portraitFilter, setPortraitFilter] = useState<PortraitFilter>(
    initialState.portraitFilter,
  );

  // Uploaded photo state
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processed custom portrait outputs
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    initialState.portraitUrl,
  );
  const [processedBlob, setProcessedBlob] = useState<Blob | undefined>(
    initialState.portraitBlob,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Live alias validation
  const aliasValidation = validateAlias(alias);

  // Reprocess portrait when photo, zoom, offset, or filter changes
  useEffect(() => {
    if (!uploadedImage || portraitSource !== "custom") return;

    let active = true;

    const timer = setTimeout(async () => {
      try {
        const result = await cropAndFilterPortrait(uploadedImage, {
          zoom,
          offsetX,
          offsetY,
          filter: portraitFilter,
          targetSize: 400,
        });

        if (!active) return;
        setPreviewUrl(result.dataUrl);
        setProcessedBlob(result.blob);
      } catch (err) {
        if (!active) return;
        setUploadError(
          err instanceof Error ? err.message : "Failed to process the uploaded image.",
        );
      } finally {
        if (active) setIsProcessing(false);
      }
    }, 40);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [uploadedImage, zoom, offsetX, offsetY, portraitFilter, portraitSource]);

  const handleRandomCallsign = () => {
    const next = getRandomCallsign(alias);
    setAlias(next);
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
      setIsProcessing(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to decode the uploaded image.",
      );
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

  const handleConfirm = () => {
    if (!aliasValidation.valid) return;

    const finalState: IdentityState = {
      alias: aliasValidation.sanitized,
      portraitSource,
      silhouetteId,
      portraitUrl: portraitSource === "custom" ? previewUrl : undefined,
      portraitBlob: portraitSource === "custom" ? processedBlob : undefined,
      portraitFilter,
    };

    onConfirmIdentity(finalState);
  };

  const activeSilhouette = getSilhouetteArchetype(silhouetteId);

  return (
    <div className="identity-workspace" aria-label="Operative Identity Creation">
      <div className="identity-container">
        {/* Stage Header */}
        <div className="identity-header">
          <div className="flex items-center gap-3">
            <span className="identity-stage-badge">STAGE 02 / IDENTITY</span>
            <span className="identity-secure-tag">🔒 CLIENT-SIDE LOCAL ENCRYPTED</span>
          </div>
          <h2 className="identity-title">Establish your operative identity</h2>
          <p className="identity-lede">
            Choose your street callsign and provide an operational portrait or select
            an authored silhouette. Identity data remains entirely local to your session.
          </p>
        </div>

        <div className="identity-grid">
          {/* Left Column: Alias & Profile Config */}
          <div className="identity-panel">
            {/* 1. Alias Section */}
            <div className="identity-section">
              <div className="identity-section-header">
                <span className="section-number">01</span>
                <div>
                  <h3 className="section-title">Operative Alias / Callsign</h3>
                  <p className="section-desc">
                    Your identifier across tactical logs, notes, and the final dossier.
                  </p>
                </div>
              </div>

              <div className="alias-input-wrapper">
                <div className="alias-input-row">
                  <input
                    id="identity-alias-input"
                    type="text"
                    className={`alias-input ${!aliasValidation.valid && alias.length > 0 ? "has-error" : ""}`}
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. CIPHER, ROOK-9, NIGHTBIRD"
                    maxLength={32}
                    autoComplete="off"
                    aria-describedby="alias-feedback"
                  />
                  <button
                    type="button"
                    className="random-callsign-btn"
                    onClick={handleRandomCallsign}
                    title="Generate a random tactical callsign"
                  >
                    🎲 Random Callsign
                  </button>
                </div>

                <div className="alias-feedback-row" id="alias-feedback">
                  {!aliasValidation.valid && alias.length > 0 ? (
                    <span className="alias-error">{aliasValidation.error}</span>
                  ) : (
                    <span className="alias-valid">
                      ✓ Ready for mission brief ({aliasValidation.sanitized})
                    </span>
                  )}
                  <span className="char-count">{alias.length} / 32</span>
                </div>
              </div>
            </div>

            {/* 2. Portrait Selection Type Switcher */}
            <div className="identity-section">
              <div className="identity-section-header">
                <span className="section-number">02</span>
                <div>
                  <h3 className="section-title">Operational Portrait</h3>
                  <p className="section-desc">
                    Select an authored silhouette archetype or upload and filter a photo.
                  </p>
                </div>
              </div>

              <div className="portrait-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={portraitSource === "silhouette"}
                  className={`portrait-tab-btn ${portraitSource === "silhouette" ? "active" : ""}`}
                  onClick={() => {
                    setIsProcessing(false);
                    setPortraitSource("silhouette");
                  }}
                >
                  <span className="tab-icon">👤</span>
                  <span>Authored Silhouettes</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={portraitSource === "custom"}
                  className={`portrait-tab-btn ${portraitSource === "custom" ? "active" : ""}`}
                  onClick={() => {
                    if (portraitSource === "custom") return;
                    if (uploadedImage) setIsProcessing(true);
                    setPortraitSource("custom");
                    if (!uploadedImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <span className="tab-icon">📷</span>
                  <span>Upload &amp; Filter Photo</span>
                </button>
              </div>

              {/* Mode A: Silhouette Grid */}
              {portraitSource === "silhouette" && (
                <div className="silhouette-selection-area">
                  <p className="silhouette-hint">
                    Designed archetypes allow immediate continuation without uploading a personal photo:
                  </p>
                  <div className="silhouette-grid" role="radiogroup" aria-label="Authored Silhouettes">
                    {SILHOUETTE_ARCHETYPES.map((arch) => {
                      const isSelected = silhouetteId === arch.id;
                      return (
                        <div
                          key={arch.id}
                          role="radio"
                          aria-checked={isSelected}
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
                            <p className="silhouette-desc">{arch.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode B: Photo Upload & Cropper */}
              {portraitSource === "custom" && (
                <div className="photo-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="visually-hidden"
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
                      <strong className="dropzone-title">
                        Click or drag a portrait photo here
                      </strong>
                      <span className="dropzone-sub">
                        PNG, JPEG, or WebP up to 5MB. Photo is processed entirely in your browser.
                      </span>
                      <button
                        type="button"
                        className="button button-secondary upload-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    <div className="photo-controls-container">
                      <div className="photo-actions-bar">
                        <span className="photo-status">
                          {isProcessing ? "Rendering filter…" : "✓ Portrait framed"}
                        </span>
                        <button
                          type="button"
                          className="replace-photo-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Photo
                        </button>
                      </div>

                      {/* Zoom & Offset Sliders */}
                      <div className="crop-sliders-row">
                        <label className="crop-slider-label">
                          <span>Zoom: {zoom.toFixed(1)}x</span>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => {
                              setIsProcessing(true);
                              setZoom(parseFloat(e.target.value));
                            }}
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
                            onChange={(e) => {
                              setIsProcessing(true);
                              setOffsetX(parseInt(e.target.value, 10));
                            }}
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
                            onChange={(e) => {
                              setIsProcessing(true);
                              setOffsetY(parseInt(e.target.value, 10));
                            }}
                            className="crop-range-slider"
                          />
                        </label>
                      </div>

                      {/* Filter Presets */}
                      <div className="filter-presets-section">
                        <span className="filter-label">Thriller Surveillance Filter:</span>
                        <div className="filter-chips">
                          {PORTRAIT_FILTERS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={`filter-chip ${portraitFilter === f.id ? "active" : ""}`}
                              onClick={() => {
                                if (portraitFilter === f.id) return;
                                setIsProcessing(true);
                                setPortraitFilter(f.id);
                              }}
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
          </div>

          {/* Right Column: Live Dossier Identity Card Preview */}
          <div className="identity-preview-column">
            <div className="identity-dossier-card">
              <div className="dossier-card-badge">OPERATIVE DOSSIER BADGE</div>

              <div className="dossier-avatar-container">
                {portraitSource === "custom" && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`${alias} operative portrait`}
                    className="dossier-avatar-img"
                  />
                ) : (
                  <div className="dossier-silhouette-avatar">
                    <svg viewBox="0 0 24 24" className="dossier-svg" fill="currentColor">
                      <path d={activeSilhouette.svgPath} />
                    </svg>
                  </div>
                )}
                <div className="dossier-avatar-reticle" />
              </div>

              <div className="dossier-meta">
                <div className="dossier-alias-heading">
                  <span className="dossier-label">CALLSIGN / ALIAS</span>
                  <span className="dossier-alias-text">
                    {aliasValidation.sanitized || "UNIDENTIFIED"}
                  </span>
                </div>

                <div className="dossier-stats-table">
                  <div className="stat-row">
                    <span className="stat-key">CLEARANCE</span>
                    <span className="stat-val">LEVEL 4 SPECIAL ACCESS</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">ARCHETYPE</span>
                    <span className="stat-val">
                      {portraitSource === "silhouette"
                        ? `${activeSilhouette.name} (${activeSilhouette.role})`
                        : `FIELD AGENT (${portraitFilter.toUpperCase()})`}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">STORAGE</span>
                    <span className="stat-val text-cyan">LOCAL SESSION EPHEMERAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="identity-actions">
              <button
                type="button"
                className="action-button primary confirm-identity-btn"
                onClick={handleConfirm}
                disabled={!aliasValidation.valid || isProcessing}
              >
                Confirm Identity &amp; Plan Mission →
              </button>

              {onReturnToTerritory && (
                <button
                  type="button"
                  className="action-button tertiary return-btn"
                  onClick={onReturnToTerritory}
                >
                  ← Return to Territory Selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
