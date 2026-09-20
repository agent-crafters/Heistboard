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
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 bg-ink text-paper flex flex-col items-center justify-center" aria-label="Operative Identity Creation">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Stage Header */}
        <div className="border-b border-coral/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-coral/20 text-coral border border-coral/40">STAGE 02 / IDENTITY</span>
            <span className="font-mono text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-petrol/20 text-petrol border border-petrol/40">🔒 CLIENT-SIDE LOCAL ENCRYPTED</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-wider text-white uppercase mt-2">Establish your operative identity</h2>
          <p className="text-sm text-paper-muted leading-relaxed mt-1 max-w-2xl">
            Choose your street callsign and provide an operational portrait or select
            an authored silhouette. Identity data remains entirely local to your session.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Alias & Profile Config */}
          <div className="lg:col-span-7 bg-charcoal-900/80 border border-coral/30 rounded-xl p-6 backdrop-blur-md shadow-2xl space-y-6">
            {/* 1. Alias Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-b border-white/10 pb-2">
                <span className="font-mono text-sm font-bold text-coral">01</span>
                <div>
                  <h3 className="font-display text-base tracking-wide text-white uppercase">Operative Alias / Callsign</h3>
                  <p className="text-xs text-paper-muted leading-tight">
                    Your identifier across tactical logs, notes, and the final dossier.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id="identity-alias-input"
                    type="text"
                    className={`flex-1 px-4 py-2.5 rounded-lg bg-charcoal-950 border text-white placeholder:text-paper-muted/60 text-base font-mono font-display tracking-wider focus:outline-none ${
                      !aliasValidation.valid && alias.length > 0 ? "border-coral" : "border-coral/30 focus:border-coral"
                    }`}
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. CIPHER, ROOK-9, NIGHTBIRD"
                    maxLength={32}
                    autoComplete="off"
                    aria-describedby="alias-feedback"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-petrol border border-petrol/30 font-mono text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                    onClick={handleRandomCallsign}
                    title="Generate a random tactical callsign"
                  >
                    🎲 Random Callsign
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-mono" id="alias-feedback">
                  {!aliasValidation.valid && alias.length > 0 ? (
                    <span className="text-coral">{aliasValidation.error}</span>
                  ) : (
                    <span className="text-petrol">
                      ✓ Ready for mission brief ({aliasValidation.sanitized})
                    </span>
                  )}
                  <span className="text-paper-muted/60">{alias.length} / 32</span>
                </div>
              </div>
            </div>

            {/* 2. Portrait Selection Type Switcher */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-b border-white/10 pb-2">
                <span className="font-mono text-sm font-bold text-coral">02</span>
                <div>
                  <h3 className="font-display text-base tracking-wide text-white uppercase">Operational Portrait</h3>
                  <p className="text-xs text-paper-muted leading-tight">
                    Select an authored silhouette archetype or upload and filter a photo.
                  </p>
                </div>
              </div>

              <div className="flex rounded-lg bg-charcoal-950 p-1 border border-white/10 gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={portraitSource === "silhouette"}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    portraitSource === "silhouette" ? "bg-coral text-white shadow-sm" : "text-paper-muted hover:text-white"
                  }`}
                  onClick={() => {
                    setIsProcessing(false);
                    setPortraitSource("silhouette");
                  }}
                >
                  <span>👤</span>
                  <span>Authored Silhouettes</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={portraitSource === "custom"}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    portraitSource === "custom" ? "bg-coral text-white shadow-sm" : "text-paper-muted hover:text-white"
                  }`}
                  onClick={() => {
                    if (portraitSource === "custom") return;
                    if (uploadedImage) setIsProcessing(true);
                    setPortraitSource("custom");
                    if (!uploadedImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <span>📷</span>
                  <span>Upload &amp; Filter Photo</span>
                </button>
              </div>

              {/* Mode A: Silhouette Grid */}
              {portraitSource === "silhouette" && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-paper-muted">
                    Designed archetypes allow immediate continuation without uploading a personal photo:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Authored Silhouettes">
                    {SILHOUETTE_ARCHETYPES.map((arch) => {
                      const isSelected = silhouetteId === arch.id;
                      return (
                        <div
                          key={arch.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            isSelected
                              ? "bg-charcoal-800 border-coral shadow-lg shadow-coral/10"
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
                          <div className="w-14 h-14 rounded-full bg-charcoal-950 border border-white/10 flex items-center justify-center relative overflow-hidden text-coral">
                            <svg
                              viewBox="0 0 24 24"
                              className="w-8 h-8"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d={arch.svgPath} />
                            </svg>
                            {isSelected && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">✓</span>}
                          </div>
                          <div className="w-full text-center space-y-0.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <strong className="text-xs text-white block">{arch.name}</strong>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-paper-muted">{arch.role}</span>
                            </div>
                            <p className="text-[11px] text-paper-muted line-clamp-2">{arch.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode B: Photo Upload & Cropper */}
              {portraitSource === "custom" && (
                <div className="space-y-3 pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleFileInputChange}
                  />

                  {uploadError && (
                    <div className="p-2.5 rounded-lg bg-coral/20 border border-coral text-coral text-xs font-mono flex items-center justify-between" role="alert">
                      <span>⚠️ {uploadError}</span>
                      <button
                        type="button"
                        className="text-coral hover:text-white px-1 cursor-pointer"
                        onClick={() => setUploadError(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {!uploadedImage ? (
                    <div
                      className={`p-8 border-2 border-dashed rounded-xl bg-charcoal-950/60 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                        isDraggingOver ? "border-coral bg-coral/10" : "border-coral/30 hover:border-coral"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="text-3xl">📷</span>
                      <strong className="text-sm font-mono text-white block">
                        Click or drag a portrait photo here
                      </strong>
                      <span className="text-xs text-paper-muted block">
                        PNG, JPEG, or WebP up to 5MB. Photo is processed entirely in your browser.
                      </span>
                      <button
                        type="button"
                        className="mt-2 px-4 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-white font-mono text-xs font-semibold border border-white/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 rounded-lg bg-charcoal-950 border border-white/5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-petrol font-bold">
                          {isProcessing ? "Rendering filter…" : "✓ Portrait framed"}
                        </span>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded bg-charcoal-800 hover:bg-charcoal-700 text-white text-xs border border-white/10 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Photo
                        </button>
                      </div>

                      {/* Zoom & Offset Sliders */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <label className="text-[10px] font-mono text-paper-muted flex flex-col gap-1">
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
                            onChange={(e) => {
                              setIsProcessing(true);
                              setOffsetX(parseInt(e.target.value, 10));
                            }}
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
                            onChange={(e) => {
                              setIsProcessing(true);
                              setOffsetY(parseInt(e.target.value, 10));
                            }}
                            className="w-full accent-coral cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Filter Presets */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <span className="text-xs font-mono text-paper-muted uppercase tracking-wider block">Thriller Surveillance Filter:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {PORTRAIT_FILTERS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                portraitFilter === f.id
                                  ? "bg-charcoal-800 border-petrol text-white shadow-sm"
                                  : "bg-charcoal-800/60 border-white/5 text-paper-muted hover:border-white/20"
                              }`}
                              onClick={() => {
                                if (portraitFilter === f.id) return;
                                setIsProcessing(true);
                                setPortraitFilter(f.id);
                              }}
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
          </div>

          {/* Right Column: Live Dossier Identity Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-xl border-2 border-petrol/40 bg-charcoal-900/90 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-4">
              <div className="font-mono text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-petrol/20 text-petrol border border-petrol/40">OPERATIVE DOSSIER BADGE</div>

              <div className="relative w-40 h-40 rounded-full border-2 border-petrol overflow-hidden bg-charcoal-950 flex items-center justify-center shadow-lg shadow-petrol/20">
                {portraitSource === "custom" && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`${alias} operative portrait`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-petrol">
                    <svg viewBox="0 0 24 24" className="w-24 h-24" fill="currentColor">
                      <path d={activeSilhouette.svgPath} />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none border border-petrol/30 rounded-full" />
              </div>

              <div className="w-full space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-paper-muted block">CALLSIGN / ALIAS</span>
                  <span className="font-display text-2xl tracking-wider text-white block uppercase">
                    {aliasValidation.sanitized || "UNIDENTIFIED"}
                  </span>
                </div>

                <div className="w-full rounded-lg bg-charcoal-950/80 border border-white/5 p-3 space-y-2 text-left font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <span className="text-paper-muted text-[10px]">CLEARANCE</span>
                    <span className="text-white font-bold text-[11px]">LEVEL 4 SPECIAL ACCESS</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <span className="text-paper-muted text-[10px]">ARCHETYPE</span>
                    <span className="text-white font-bold text-[11px]">
                      {portraitSource === "silhouette"
                        ? `${activeSilhouette.name} (${activeSilhouette.role})`
                        : `FIELD AGENT (${portraitFilter.toUpperCase()})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-paper-muted text-[10px]">STORAGE</span>
                    <span className="text-petrol font-bold text-[11px]">LOCAL SESSION EPHEMERAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="space-y-2.5 w-full">
              <button
                type="button"
                className="w-full py-3 px-6 rounded-xl bg-coral hover:bg-coral-soft text-white font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-coral/25 cursor-pointer disabled:opacity-50"
                onClick={handleConfirm}
                disabled={!aliasValidation.valid || isProcessing}
              >
                Confirm Identity &amp; Plan Mission →
              </button>

              {onReturnToTerritory && (
                <button
                  type="button"
                  className="w-full py-2 px-4 rounded-lg bg-transparent hover:bg-white/5 text-paper-muted hover:text-white font-mono text-xs transition-colors cursor-pointer text-center"
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
