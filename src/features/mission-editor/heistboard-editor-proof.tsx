"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ImageEditorSaveResult } from "@unlayer/react-image-editor";

import {
  editorWorkflowReducer,
  initialEditorWorkflow,
  initialJourneyState,
  operationJourneyReducer,
  OPERATION_STAGES,
  type EditorWorkflowPhase,
  type OperationStage,
} from "@/domain/editor-workflow";
import {
  SAMPLE_MAP_ATTRIBUTION,
  SAMPLE_MAP_BASE_URL,
  STANDARD_TERRITORY_ATTRIBUTION,
  formatAttributionString,
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";
import {
  AnnotatedMapResourceOwner,
  type AnnotatedMapResource,
} from "@/lib/annotated-map-resource";
import { TerritoryView, type TerritoryLockedResult } from "@/features/territory/territory-view";
import {
  type IdentityState,
  DEFAULT_IDENTITY_STATE,
} from "@/domain/identity";
import {
  type GtaBadgeOptions,
  DEFAULT_GTA_BADGE_OPTIONS,
  placeOrUpdateBadgeOnFabricCanvas,
} from "@/lib/gta-identity-badge";
import {
  type BgLayerConfig,
  DEFAULT_BG_LAYER_CONFIG,
  applyBgLayerToFabricCanvas,
} from "@/lib/bg-layer-processor";
import {
  findFabricCanvas,
  importStickerToCanvas,
  type FabricCanvasLike,
} from "@/lib/sticker-canvas-importer";
import { composeDossierCanvas } from "@/lib/dossier-composer";
import type { CustomEditorTool } from "./mission-editor";
import { CinematicReveal } from "./cinematic-reveal";

const BANNER_SLIDES = [
  "/banner/1.jpg",
  "/banner/2.jpg",
  "/banner/3.jpg",
  "/banner/4.jpg",
  "/banner/5.jpg",
  "/banner/6.jpg",
  "/banner/7.jpg",
  "/banner/8.jpg",
  "/banner/9.jpg",
  "/banner/10.jpg",
] as const;

const EDITOR_LOAD_TIMEOUT_MS = 20_000;

export type HeistStage = OperationStage;

async function normalizeSaveResultToPng(
  result: ImageEditorSaveResult,
): Promise<ImageEditorSaveResult> {
  if (
    /^data:image\/png;base64,/i.test(result.dataUrl) &&
    result.blob.type.toLowerCase() === "image/png"
  ) {
    return result;
  }

  return new Promise<ImageEditorSaveResult>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(result);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ dataUrl, blob });
        } else {
          resolve(result);
        }
      }, "image/png");
    };
    img.onerror = () => resolve(result);
    img.src = result.dataUrl;
  });
}

const MissionEditor = dynamic(() => loadMissionEditor(), {
  ssr: false,
  loading: () => <EditorLoading label="Loading the authoring tools…" />,
});

export function HeistboardEditorProof() {
  const [journey, journeyDispatch] = useReducer(
    operationJourneyReducer,
    initialJourneyState,
  );
  const stage = journey.stage;

  const [mapBaseUrl, setMapBaseUrl] = useState<string>(SAMPLE_MAP_BASE_URL);
  const [attribution, setAttribution] = useState<TerritoryAttribution>(
    STANDARD_TERRITORY_ATTRIBUTION,
  );
  const [lockedCamera, setLockedCamera] = useState<TerritoryCameraState | undefined>(
    undefined,
  );
  const [isSampleMap, setIsSampleMap] = useState<boolean>(false);

  const [workflow, dispatch] = useReducer(
    editorWorkflowReducer,
    initialEditorWorkflow,
  );
  const [annotatedMap, setAnnotatedMap] = useState<AnnotatedMapResource | null>(null);
  const [identity, setIdentity] = useState<IdentityState>(DEFAULT_IDENTITY_STATE);
  const [gtaBadgeOptions, setGtaBadgeOptions] = useState<GtaBadgeOptions>({
    ...DEFAULT_GTA_BADGE_OPTIONS,
    alias: DEFAULT_IDENTITY_STATE.alias,
    silhouetteId: DEFAULT_IDENTITY_STATE.silhouetteId,
  });
  const [bgLayerConfig, setBgLayerConfig] = useState<BgLayerConfig>(DEFAULT_BG_LAYER_CONFIG);
  const [requestedEditorTool, setRequestedEditorTool] = useState<CustomEditorTool | null>(null);

  // Composed 16:9 final Dossier artifact (HB-007) with 4K UHD and 2K QHD support
  const [selectedResolution, setSelectedResolution] = useState<"4k" | "2k">("4k");
  const [dossierArtifact, setDossierArtifact] = useState<{
    previewUrl: string;
    blob: Blob;
    downloadUrl: string;
    fileName: string;
    width: number;
    height: number;
    resolution: "4k" | "2k";
  } | null>(null);
  const [isComposingDossier, setIsComposingDossier] = useState<boolean>(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);
  const dossierBlobUrlRef = useRef<string | null>(null);

  // 5-second random slideshow for the header banner
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        if (BANNER_SLIDES.length <= 1) return 0;
        let next = Math.floor(Math.random() * BANNER_SLIDES.length);
        while (next === prev) {
          next = Math.floor(Math.random() * BANNER_SLIDES.length);
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const resourceOwner = useRef<AnnotatedMapResourceOwner | null>(null);
  const mapBaseBlobUrlRef = useRef<string | null>(null);
  const editorFrameRef = useRef<HTMLDivElement>(null);

  const handleBgLayerChange = useCallback(
    (newConfig: BgLayerConfig) => {
      setBgLayerConfig(newConfig);
      const fabricCanvas = findFabricCanvas(editorFrameRef.current);
      if (fabricCanvas) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          applyBgLayerToFabricCanvas(fabricCanvas, newConfig, img);
        };
        img.src = mapBaseUrl;
      }
    },
    [mapBaseUrl],
  );

  if (resourceOwner.current === null) {
    resourceOwner.current = new AnnotatedMapResourceOwner();
  }

  useEffect(() => {
    const owner = resourceOwner.current;
    return () => {
      owner?.dispose();
      if (mapBaseBlobUrlRef.current) {
        URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      }
      if (dossierBlobUrlRef.current) {
        URL.revokeObjectURL(dossierBlobUrlRef.current);
      }
    };
  }, []);

  // Check map base when in mission-plan stage and checking-map phase
  useEffect(() => {
    if (stage !== "mission-plan" || workflow.phase !== "checking-map") return;

    let active = true;
    const mapBase = new Image();
    mapBase.onload = () => {
      if (active) dispatch({ type: "map-ready" });
    };
    mapBase.onerror = () => {
      if (active) {
        dispatch({
          type: "image-failed",
          message: "The raster Map Base could not be loaded or decoded.",
        });
      }
    };
    mapBase.src = mapBaseUrl;

    return () => {
      active = false;
      mapBase.onload = null;
      mapBase.onerror = null;
    };
  }, [stage, workflow.phase, workflow.retryKey, mapBaseUrl]);

  const handleStartOperation = useCallback(() => {
    journeyDispatch({ type: "start-operation" });
  }, []);


  const handleConfirmChangeTerritory = useCallback(() => {
    if (dossierBlobUrlRef.current) {
      URL.revokeObjectURL(dossierBlobUrlRef.current);
      dossierBlobUrlRef.current = null;
    }
    resourceOwner.current?.dispose();
    setAnnotatedMap(null);
    setDossierArtifact(null);
    journeyDispatch({ type: "confirm-change-territory" });
  }, []);

  const handleRestartOperation = useCallback(() => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }
    if (dossierBlobUrlRef.current) {
      URL.revokeObjectURL(dossierBlobUrlRef.current);
      dossierBlobUrlRef.current = null;
    }
    if (identity.portraitUrl && identity.portraitUrl.startsWith("blob:")) {
      URL.revokeObjectURL(identity.portraitUrl);
    }
    resourceOwner.current?.dispose();
    resourceOwner.current = new AnnotatedMapResourceOwner();

    setAnnotatedMap(null);
    setDossierArtifact(null);
    setIdentity(DEFAULT_IDENTITY_STATE);
    setMapBaseUrl(SAMPLE_MAP_BASE_URL);
    setLockedCamera(undefined);
    setIsSampleMap(false);
    setAttribution(STANDARD_TERRITORY_ATTRIBUTION);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "restart-operation" });
  }, [identity.portraitUrl]);

  const handleTerritoryLocked = useCallback((result: TerritoryLockedResult) => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }

    if (result.blob) {
      const blobUrl = URL.createObjectURL(result.blob);
      mapBaseBlobUrlRef.current = blobUrl;
      setMapBaseUrl(blobUrl);
      setIsSampleMap(false);
    } else {
      setMapBaseUrl(SAMPLE_MAP_BASE_URL);
      setIsSampleMap(true);
    }

    setAttribution(result.attribution);
    setLockedCamera(result.camera);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "lock-territory" });
  }, []);

  const handleSelectSampleFallback = useCallback(() => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }
    setMapBaseUrl(SAMPLE_MAP_BASE_URL);
    setAttribution(SAMPLE_MAP_ATTRIBUTION);
    setIsSampleMap(true);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "lock-territory" });
  }, []);

  const handleEditorLoad = useCallback(() => {
    dispatch({ type: "editor-ready" });
  }, []);

  const handleSave = useCallback(async (result: ImageEditorSaveResult) => {
    dispatch({ type: "save-started" });
    try {
      const pngPayload = await normalizeSaveResultToPng(result);
      const resource = await resourceOwner.current?.replace(pngPayload);
      if (!resource) throw new Error("The image resource owner is unavailable.");
      setAnnotatedMap(resource);
      setIsComposingDossier(true);
      setIsRevealing(true);
      setDossierError(null);
      dispatch({ type: "save-succeeded" });
      journeyDispatch({ type: "save-succeeded" });
    } catch (error) {
      dispatch({
        type: "save-failed",
        message:
          error instanceof Error
            ? error.message
            : "The Annotated Map could not be prepared.",
      });
    }
  }, []);

  // Compose 16:9 final Dossier canvas when entering dossier stage (HB-007)
  useEffect(() => {
    if (stage !== "dossier" || !annotatedMap) return;

    let active = true;
    composeDossierCanvas({
      annotatedMapUrl: annotatedMap.previewUrl,
      resolution: selectedResolution,
      identity,
      attribution,
      cameraState: lockedCamera,
      operationTitle: "OPERATION: THE LAST DELIVERY",
      operationSubtitle: "Package before sunrise",
    })
      .then((result) => {
        if (!active) return;
        if (dossierBlobUrlRef.current) {
          URL.revokeObjectURL(dossierBlobUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(result.blob);
        dossierBlobUrlRef.current = objectUrl;

        setDossierArtifact({
          previewUrl: objectUrl,
          blob: result.blob,
          downloadUrl: objectUrl,
          fileName: `heistboard-mission-map-${selectedResolution.toUpperCase()}-${result.width}x${result.height}.png`,
          width: result.width,
          height: result.height,
          resolution: selectedResolution,
        });
        setIsComposingDossier(false);
      })
      .catch((err) => {
        if (!active) return;
        setIsComposingDossier(false);
        setDossierError(
          err instanceof Error
            ? err.message
            : "Failed to compose the 16:9 high-resolution final dossier.",
        );
      });

    return () => {
      active = false;
    };
  }, [stage, annotatedMap, identity, attribution, lockedCamera, selectedResolution]);

  const handleDragOver = (e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes("application/x-heistboard-sticker") ||
      e.dataTransfer.types.includes("application/x-heistboard-badge")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    journeyDispatch({ type: "record-mission-edit" });

    // 1. Direct drag-and-drop of the Operative Identity Badge onto the map
    if (e.dataTransfer.types.includes("application/x-heistboard-badge")) {
      e.preventDefault();
      const fabricCanvas =
        findFabricCanvas(editorFrameRef.current) ??
        (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
          .__heistboardFabricCanvas;
      if (!fabricCanvas) return;

      let position: { x: number; y: number } | undefined;
      if (typeof fabricCanvas.getPointer === "function") {
        position = fabricCanvas.getPointer(e.nativeEvent);
      }

      await placeOrUpdateBadgeOnFabricCanvas(
        fabricCanvas,
        gtaBadgeOptions,
        undefined,
        position,
      );
      return;
    }

    // 2. Direct drag-and-drop of Stickers onto the map
    const stickerUrl = e.dataTransfer.getData("application/x-heistboard-sticker");
    if (!stickerUrl) return;
    e.preventDefault();

    const fabricCanvas = findFabricCanvas(editorFrameRef.current);
    let position: { x: number; y: number } | undefined;
    if (fabricCanvas && typeof fabricCanvas.getPointer === "function") {
      position = fabricCanvas.getPointer(e.nativeEvent);
    }

    await importStickerToCanvas(stickerUrl, {
      rootElement: editorFrameRef.current,
      position,
    });
  };

  const handleReturnToTerritory = useCallback(() => {
    journeyDispatch({ type: "request-change-territory" });
  }, []);

  const editorVisible =
    (stage === "mission-plan" || stage === "dossier") &&
    (workflow.phase === "loading-editor" ||
      workflow.phase === "editing" ||
      workflow.phase === "saving" ||
      workflow.phase === "preview");

  // Re-calculate Fabric canvas offset when returning to mission-plan so mouse events work immediately
  useEffect(() => {
    if (stage === "mission-plan") {
      const canvas = findFabricCanvas(editorFrameRef.current);
      if (canvas) {
        canvas.calcOffset?.();
        canvas.requestRenderAll?.();
      }
    }
  }, [stage]);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="masthead-banner-backdrop" aria-hidden="true">
          {BANNER_SLIDES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`masthead-banner-image ${i === activeBannerIndex ? "active" : ""}`}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="masthead-banner-overlay" />
        </div>
        <div className="masthead-content">
          <div className="masthead-badge-row">
            <span className="eyebrow">VICE CITY // TACTICAL MISSION COMMAND · LEONIDA</span>
            <span className="unlayer-hackathon-badge">
              <span className="unlayer-pulse-dot" aria-hidden="true" />
              UNLAYER HACKATHON EDITION
            </span>
          </div>
          <h1 className="brand-heading">
            HEIST<span className="gta-roman-vi">VI</span>BOARD
          </h1>
          <p className="lede">
            Plan the heist. Mark the streets. Powered by Unlayer React Image Editor with real-world 3D
            satellite rasterization, tactical vector authoring, and instant full-view export.
          </p>
        </div>
        <div className="status-stamp" aria-label="Fictional scenario">
          <div className="stamp-radar-ring" aria-hidden="true" />
          <span>VICE CITY OPS</span>
          <strong>THE LAST DELIVERY</strong>
          <small>FICTIONAL USE ONLY · LEONIDA</small>
        </div>
      </header>

      {/* 4-Stage Nav Stepper */}
      <nav className="stage-indicator" aria-label="Operation Stages">
        {OPERATION_STAGES.map((s, idx) => {
          const isCurrent = stage === s.id;
          const stageOrder: OperationStage[] = ["file", "territory", "mission-plan", "dossier"];
          const currentIdx = stageOrder.indexOf(stage);
          const isPast = idx < currentIdx;
          const isAccessible =
            isPast ||
            isCurrent ||
            s.id === "file" ||
            s.id === "territory" ||
            (s.id === "mission-plan" && journey.isTerritoryLocked) ||
            (s.id === "dossier" && journey.hasAnnotatedMap);

          return (
            <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              {idx > 0 && <span className="stage-nav-divider" aria-hidden="true">›</span>}
              <button
                type="button"
                className={`stage-nav-btn ${isCurrent ? "active" : isPast ? "complete" : ""}`}
                onClick={() => {
                  if (isCurrent) return;
                  if (s.id === "territory" && (journey.hasMissionEdits || journey.hasAnnotatedMap)) {
                    journeyDispatch({ type: "request-change-territory" });
                  } else {
                    journeyDispatch({ type: "go-to-stage", target: s.id });
                  }
                }}
                disabled={!isAccessible}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Stage ${s.number}: ${s.label} - ${s.shortDescription}`}
                title={`${s.number} / ${s.label}: ${s.shortDescription}`}
              >
                <span className="stage-nav-num">{s.number}</span>
                <span>{s.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Stage 01: Case File Briefing */}
      {stage === "file" && (
        <section className="case-file-panel" aria-labelledby="case-file-title">
          <div className="case-file-header">
            <div>
              <span className="case-file-eyebrow">Operation Case File // 01</span>
              <h2 id="case-file-title" className="case-file-title">
                The Last Delivery
              </h2>
            </div>
            <span className="case-file-stamp-badge">Courier Directive // Eyes Only</span>
          </div>

          <div className="case-file-body">
            <p>
              A single high-priority courier package must be picked up and routed to a secure
              safehouse before first light. Search your neighborhood, lock your 3D Territory
              camera, author your tactical route, and produce the verified 2400 × 1600 final dossier.
            </p>
            <p>
              Your local streets become the operational theatre. All marks, routes, and callouts
              remain client-side in browser memory with full legal provider attribution.
            </p>
          </div>

          <div className="case-file-grid">
            <div>
              <span className="case-file-stat-label">Objective</span>
              <span className="case-file-stat-value">Package before sunrise</span>
            </div>
            <div>
              <span className="case-file-stat-label">Operational Duration</span>
              <span className="case-file-stat-value">2–5 Minutes</span>
            </div>
            <div>
              <span className="case-file-stat-label">Territory Engine</span>
              <span className="case-file-stat-value">OpenFreeMap 3D &amp; OSM</span>
            </div>
            <div>
              <span className="case-file-stat-label">Final Artifact</span>
              <span className="case-file-stat-value">2400 × 1600 Dossier PNG</span>
            </div>
          </div>

          <div className="case-file-actions">
            <button
              type="button"
              className="button button-primary case-file-cta"
              onClick={handleStartOperation}
            >
              Start Operation: Select Territory →
            </button>
            <span className="case-file-disclaimer">
              Fictional creative use only. Extruded 3D context is approximate and not intended
              for real navigation, surveillance, or safety claims.
            </span>
          </div>
        </section>
      )}

      {/* Stage 02: Territory Composition */}
      {stage === "territory" && (
        <div>
          <TerritoryView
            onLockTerritory={handleTerritoryLocked}
            onSelectSampleFallback={handleSelectSampleFallback}
            initialCamera={lockedCamera}
          />
        </div>
      )}

      {/* Stage 03: Mission Editor (preserved in DOM across preview to maintain active Fabric objects) */}
      {(stage === "mission-plan" || stage === "dossier") && (
        <section
          className="workspace workspace-editor-full"
          aria-labelledby="workspace-title"
          style={{ display: stage === "mission-plan" ? undefined : "none" }}
        >
          <a href="#editor-frame-container" className="skip-to-editor-link">
            Skip to Mission Plan Editor Canvas
          </a>

          <div className="editor-column">
            <div className="editor-heading">
              <div>
                <p className="section-label">
                  Map Base / {isSampleMap ? "Southbank District (Sample)" : "3D Territory"}
                </p>
                <h2 id="workspace-title">Mission Plan editor</h2>
              </div>
              <div className="editor-heading-actions">
                <button
                  type="button"
                  className="action-button tertiary change-territory-btn"
                  onClick={handleReturnToTerritory}
                  title="Return to 3D Territory selection (resets plan)"
                >
                  ← Change Territory (resets plan)
                </button>
                <span className={`phase phase-${workflow.phase}`} aria-live="polite">
                  {phaseLabel(workflow.phase)}
                </span>
              </div>
            </div>

            {workflow.phase === "checking-map" && (
              <EditorLoading label="Preparing and validating raster Map Base…" />
            )}

            {editorVisible && (
              <div
                id="editor-frame-container"
                ref={editorFrameRef}
                className="editor-frame"
                aria-busy={workflow.phase !== "editing"}
                onDragOver={handleDragOver}
                onDrop={(e) => void handleDrop(e)}
              >
                {workflow.phase === "loading-editor" && (
                  <div className="editor-overlay">
                    <EditorLoading label="Loading React Image Editor…" />
                  </div>
                )}
                <MissionEditor
                  image={mapBaseUrl}
                  retryKey={workflow.retryKey}
                  onLoad={handleEditorLoad}
                  onSave={(result) => void handleSave(result)}
                  onCancel={() => dispatch({ type: "cancelled" })}
                  onImageError={() =>
                    dispatch({
                      type: "image-failed",
                      message: "The Map Base could not be loaded into the editor.",
                    })
                  }
                  onEditorError={(error) =>
                    dispatch({
                      type: "editor-failed",
                      message: `React Image Editor could not start: ${error.message}`,
                    })
                  }
                  bgConfig={bgLayerConfig}
                  onBgConfigChange={handleBgLayerChange}
                  identityOptions={gtaBadgeOptions}
                  onIdentityChange={setGtaBadgeOptions}
                  identityState={identity}
                  onIdentityStateChange={setIdentity}
                  requestedTool={requestedEditorTool}
                  onToolHandled={() => setRequestedEditorTool(null)}
                />
              </div>
            )}

            {workflow.phase === "saving" && (
              <p className="inline-status" role="status">
                Verifying the saved image…
              </p>
            )}

            {workflow.phase === "cancelled" && (
              <RecoveryPanel
                title="Mission Plan paused"
                message={workflow.notice ?? "No changes were saved."}
                actionLabel="Resume editing"
                onAction={() => dispatch({ type: "edit-again" })}
              />
            )}

            {workflow.phase === "failure" && workflow.failure && (
              <RecoveryPanel
                title={
                  workflow.failure.kind === "image"
                    ? "Map Base unavailable"
                    : workflow.failure.kind === "editor"
                      ? "Editor unavailable"
                      : "Save could not be verified"
                }
                message={workflow.failure.message}
                actionLabel="Try again"
                onAction={() => dispatch({ type: "retry" })}
                secondaryAction={{
                  label: "Use sample map fallback",
                  onClick: handleSelectSampleFallback,
                }}
              />
            )}
          </div>
        </section>
      )}

      {/* Stage 5: Dossier Preview & Cinematic Reveal */}
      {stage === "dossier" && annotatedMap && (
        <section className="preview-panel" aria-labelledby="preview-title">
          {isRevealing ? (
            <CinematicReveal
              annotatedMapUrl={annotatedMap.previewUrl}
              dossierUrl={dossierArtifact?.previewUrl ?? annotatedMap.previewUrl}
              onComplete={() => setIsRevealing(false)}
              onSkip={() => setIsRevealing(false)}
            />
          ) : (
            <>
              {/* Clean 16:9 Dossier Command Header */}
              <div className="dossier-clean-header">
                <div className="dossier-title-col">
                  <div className="dossier-badge-row">
                    <span className="dossier-stage-pill">STAGE 04 / FINAL MISSION DOSSIER</span>
                    <span className="dossier-ratio-pill">16:9 CINEMATIC</span>
                    <span className={`dossier-res-pill res-${selectedResolution}`}>
                      {selectedResolution === "4k" ? "4K ULTRA-HD (3840×2160)" : "2K QUAD-HD (2560×1440)"}
                    </span>
                  </div>
                  <h2 id="preview-title" className="dossier-main-title">Tactical Mission Dossier</h2>
                  <p className="dossier-sub-text">
                    {isComposingDossier
                      ? "Rendering 16:9 high-resolution composite canvas…"
                      : dossierError
                        ? `Notice: ${dossierError}`
                        : "Your authored tactical plan is composed in crystal-clear 16:9 widescreen format, rendered in lossless high-definition ready for briefing and presentation."}
                  </p>
                </div>

                {/* Resolution Switcher & Primary 4K/2K Download Action */}
                <div className="dossier-export-card">
                  <div className="dossier-res-picker" role="group" aria-label="Select export resolution">
                    <span className="res-picker-label">Resolution:</span>
                    <button
                      type="button"
                      className={`res-btn ${selectedResolution === "4k" ? "active" : ""}`}
                      onClick={() => {
                        if (selectedResolution === "4k") return;
                        setIsComposingDossier(true);
                        setDossierError(null);
                        setSelectedResolution("4k");
                      }}
                      title="Switch to 4K Ultra-HD (3840 × 2160)"
                      disabled={isComposingDossier}
                    >
                      🌟 4K Ultra-HD <small>3840 × 2160</small>
                    </button>
                    <button
                      type="button"
                      className={`res-btn ${selectedResolution === "2k" ? "active" : ""}`}
                      onClick={() => {
                        if (selectedResolution === "2k") return;
                        setIsComposingDossier(true);
                        setDossierError(null);
                        setSelectedResolution("2k");
                      }}
                      title="Switch to 2K Quad-HD (2560 × 1440)"
                      disabled={isComposingDossier}
                    >
                      ⚡ 2K Quad-HD <small>2560 × 1440</small>
                    </button>
                  </div>

                  <a
                    className={`dossier-primary-download-btn ${isComposingDossier ? "disabled" : ""}`}
                    href={dossierArtifact?.downloadUrl ?? annotatedMap.download.href}
                    download={dossierArtifact?.fileName ?? `heistboard-mission-map-${selectedResolution.toUpperCase()}.png`}
                    aria-disabled={isComposingDossier}
                    aria-label={`Download verified ${selectedResolution.toUpperCase()} 16:9 High-Resolution Edited Map PNG`}
                  >
                    <span className="download-icon" aria-hidden="true">⬇️</span>
                    <div className="download-label-group">
                      <span className="download-title">
                        {isComposingDossier
                          ? "Encoding High-Res PNG…"
                          : `Download ${selectedResolution.toUpperCase()} High-Res PNG`}
                      </span>
                      <span className="download-subtitle">
                        {selectedResolution === "4k"
                          ? "3840 × 2160 • 16:9 Cinematic Widescreen • Lossless Quality"
                          : "2560 × 1440 • 16:9 High Definition • Lossless Quality"}
                      </span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Clean Secondary Tool Bar */}
              <div className="dossier-secondary-bar">
                <div className="secondary-left-actions">
                  <button
                    className="dossier-tool-btn"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit mission plan again in editor"
                  >
                    ✏️ Edit Mission Plan
                  </button>
                  <button
                    className="dossier-tool-btn"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      setRequestedEditorTool("identity");
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit operative identity callsign or portrait in editor"
                  >
                    🪪 Edit Operative ID
                  </button>
                  <button
                    className="dossier-tool-btn"
                    type="button"
                    onClick={handleReturnToTerritory}
                    aria-label="Select a new territory location"
                  >
                    🗺️ Change Territory
                  </button>
                  <button
                    className="dossier-tool-btn"
                    type="button"
                    onClick={() => setIsRevealing(true)}
                    title="Replay cinematic reveal transition"
                    aria-label="Replay cinematic pullback reveal animation"
                  >
                    🎬 Replay Reveal
                  </button>
                </div>
                <button
                  className="dossier-tool-btn restart-btn"
                  type="button"
                  onClick={handleRestartOperation}
                  aria-label="Restart operation from stage one"
                >
                  ↺ Restart Operation
                </button>
              </div>

              {/* Composed 16:9 Dossier Viewport */}
              <div className="dossier-map-viewport" role="region" aria-label="16:9 Final Dossier Viewport">
                {isComposingDossier && !dossierArtifact ? (
                  <div className="dossier-composing-overlay" role="status">
                    <span className="loading-mark" aria-hidden="true" />
                    <p>Composing {selectedResolution.toUpperCase()} (16:9) Tactical Dossier…</p>
                    <small>
                      Rendering high-fidelity map base, custom stickers, operative identity badge, and tactical routes
                    </small>
                  </div>
                ) : (
                  <div className="dossier-image-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="annotated-map-16-9"
                      src={dossierArtifact?.previewUrl ?? annotatedMap.previewUrl}
                      alt={`16:9 ${selectedResolution.toUpperCase()} Operation Dossier composite saved from mission editor`}
                    />
                    {/* Corner HUD Telemetry Reticles */}
                    <div className="dossier-hud-overlay" aria-hidden="true">
                      <div className="hud-corner top-left">
                        <span className="hud-reticle">⌜</span>
                        <span className="hud-tag">SECTOR // {selectedResolution.toUpperCase()} RECON</span>
                      </div>
                      <div className="hud-corner top-right">
                        <span className="hud-tag">{selectedResolution === "4k" ? "3840 × 2160 UHD" : "2560 × 1440 QHD"}</span>
                        <span className="hud-reticle">⌝</span>
                      </div>
                      <div className="hud-corner bottom-left">
                        <span className="hud-reticle">⌞</span>
                        <span className="hud-tag">16:9 WIDESCREEN</span>
                      </div>
                      <div className="hud-corner bottom-right">
                        <span className="hud-tag">LEONIDA SEC-INTEL</span>
                        <span className="hud-reticle">⌟</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legally required attribution line under the Annotated Map */}
              <div className="dossier-attribution-block">
                <span>
                  <strong>Map Base Attribution:</strong> {attribution.noticeText} ·{" "}
                  <span>{attribution.printedUrl}</span>
                </span>
                <div className="dossier-attribution-links">
                  {attribution.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Accessible Territory Reset Warning Dialog */}
      {journey.isConfirmingTerritoryReset && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="territory-dialog-title"
            aria-describedby="territory-dialog-desc"
          >
            <h3 id="territory-dialog-title" className="dialog-title">
              ⚠️ Reset Mission Plan?
            </h3>
            <p id="territory-dialog-desc" className="dialog-body">
              Changing Territory resets your current Mission Plan and Annotated Map. All
              routes, markers, notes, and custom stickers authored on this map base will be
              permanently discarded.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => journeyDispatch({ type: "cancel-change-territory" })}
                autoFocus
              >
                Keep Mission Plan
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={handleConfirmChangeTerritory}
              >
                Discard &amp; Change Territory
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-note">
        <span>{formatAttributionString(attribution)}</span>
        <span>No route calculation</span>
        <span>Fictional use only</span>
        <span>React Image Editor authoring</span>
      </footer>
    </main>
  );
}

function EditorLoading({ label }: { label: string }) {
  return (
    <div className="loading-panel" role="status">
      <span className="loading-mark" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

interface RecoveryPanelProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}

function RecoveryPanel({
  title,
  message,
  actionLabel,
  onAction,
  secondaryAction,
}: RecoveryPanelProps) {
  return (
    <section className="recovery-panel" role="alert">
      <p className="section-label">Recovery available</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="actions">
        <button className="button button-primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
        {secondaryAction && (
          <button
            className="button button-secondary"
            type="button"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </section>
  );
}

async function loadMissionEditor() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      import("./mission-editor").then((module) => module.MissionEditor),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("React Image Editor did not finish loading.")),
          EDITOR_LOAD_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function phaseLabel(phase: EditorWorkflowPhase): string {
  const labels: Record<EditorWorkflowPhase, string> = {
    "checking-map": "Checking map",
    "loading-editor": "Loading editor",
    editing: "Editing",
    saving: "Saving",
    preview: "Saved",
    cancelled: "Paused",
    failure: "Needs attention",
  };
  return labels[phase];
}
