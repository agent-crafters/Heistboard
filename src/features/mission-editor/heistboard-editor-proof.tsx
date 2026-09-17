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
import {
  composeDossierCanvas,
  type ComposedDossierResult,
} from "@/lib/dossier-composer";
import type { CustomEditorTool } from "./mission-editor";
import { CinematicReveal } from "./cinematic-reveal";

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

  // Composed 2400 × 1600 final Dossier artifact (HB-007)
  const [dossierArtifact, setDossierArtifact] = useState<{
    previewUrl: string;
    blob: Blob;
    downloadUrl: string;
    fileName: string;
  } | null>(null);
  const [isComposingDossier, setIsComposingDossier] = useState<boolean>(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const dossierBlobUrlRef = useRef<string | null>(null);

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
    setAnnotatedMap(null);
    setDossierArtifact(null);
    dispatch({ type: "retry" });
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
    dispatch({ type: "retry" });
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
    dispatch({ type: "retry" });
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
    dispatch({ type: "retry" });
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

  // Compose 2400 × 1600 final Dossier canvas when entering dossier stage (HB-007)
  useEffect(() => {
    if (stage !== "dossier" || !annotatedMap) return;

    let active = true;

    composeDossierCanvas({
      annotatedMapUrl: annotatedMap.previewUrl,
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
          fileName: "heistboard-edited-map.png",
        });
        setIsComposingDossier(false);
      })
      .catch((err) => {
        if (!active) return;
        setIsComposingDossier(false);
        setDossierError(
          err instanceof Error
            ? err.message
            : "Failed to compose the 2400 × 1600 final dossier.",
        );
      });

    return () => {
      active = false;
    };
  }, [stage, annotatedMap, identity, attribution, lockedCamera]);

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
        <div>
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
              <div className="preview-copy">
                <div>
                  <p className="section-label">Final Export / Full View</p>
                  <h2 id="preview-title">Mission Map Image</h2>
                  <p role="status">
                    {isComposingDossier
                      ? "Preparing high-resolution full-view image..."
                      : dossierError
                        ? `Composition warning: ${dossierError}`
                        : "Your edited map is ready in full view without any interface framing. Preview and download use this exact image."}
                  </p>
                </div>

                <div className="actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit mission plan again in editor"
                  >
                    Edit mission again
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      setRequestedEditorTool("identity");
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit operative identity callsign or portrait in editor"
                  >
                    Edit identity
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleReturnToTerritory}
                    aria-label="Select a new territory location"
                  >
                    New territory
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setIsRevealing(true)}
                    title="Replay cinematic reveal transition"
                    aria-label="Replay cinematic pullback reveal animation"
                  >
                    Replay reveal
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleRestartOperation}
                    aria-label="Restart operation from stage one"
                  >
                    Restart operation
                  </button>
                  <a
                    className={`button button-primary ${isComposingDossier ? "disabled" : ""}`}
                    href={dossierArtifact?.downloadUrl ?? annotatedMap.download.href}
                    download={dossierArtifact?.fileName ?? annotatedMap.download.fileName}
                    aria-disabled={isComposingDossier}
                    aria-label="Download verified full-view edited map image PNG"
                  >
                    {isComposingDossier ? "Preparing Full-View Image..." : "Download Edited Image PNG"}
                  </a>
                </div>
              </div>

              {/* Composed Dossier Viewport — displays the composed 2400 × 1600 Dossier artifact */}
              <div className="dossier-map-viewport">
                {isComposingDossier && !dossierArtifact ? (
                  <div className="dossier-composing-overlay" role="status">
                    <p>Composing 2400 × 1600 Dossier Artifact…</p>
                    <small>
                      Assembling locked Map Base, Operative Identity, and protected attribution
                    </small>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    className="annotated-map"
                    src={dossierArtifact?.previewUrl ?? annotatedMap.previewUrl}
                    alt="Deterministic 2400 × 1600 Operation Dossier composite saved from the mission editor"
                  />
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
