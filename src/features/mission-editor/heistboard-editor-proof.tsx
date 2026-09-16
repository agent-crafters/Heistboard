"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ImageEditorSaveResult } from "@unlayer/react-image-editor";

import {
  editorWorkflowReducer,
  initialEditorWorkflow,
  type EditorWorkflowPhase,
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
  getSilhouetteArchetype,
} from "@/domain/identity";
import {
  type GtaBadgeOptions,
  DEFAULT_GTA_BADGE_OPTIONS,
} from "@/lib/gta-identity-badge";
import {
  type BgLayerConfig,
  DEFAULT_BG_LAYER_CONFIG,
  applyBgLayerToFabricCanvas,
} from "@/lib/bg-layer-processor";
import { findFabricCanvas, importStickerToCanvas } from "@/lib/sticker-canvas-importer";
import {
  composeDossierCanvas,
} from "@/lib/dossier-composer";
import type { CustomEditorTool } from "./mission-editor";

const EDITOR_LOAD_TIMEOUT_MS = 20_000;

export type HeistStage = "territory" | "identity" | "mission-plan" | "dossier";

/** Each step maps to a native editor tool button's data-testid, or null for save. */
const MISSION_STEPS: ReadonlyArray<{
  id: string;
  title: string;
  detail: string;
  nativeTool: string | null;
}> = [
  { id: "01", title: "Draw the route", detail: "Use Draw to trace a bold path across the neighborhood.", nativeTool: "native-tool-draw" },
  { id: "02", title: "Mark two locations", detail: "Use Shapes for the pickup point and the getaway.", nativeTool: "native-tool-shapes" },
  { id: "03", title: "Leave one note", detail: "Use Text to add a short courier instruction.", nativeTool: "native-tool-text" },
  { id: "04", title: "Save the plan", detail: "Use the editor's Save action when the route reads clearly.", nativeTool: null },
];

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
  const [stage, setStage] = useState<HeistStage>("territory");
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
    setStage("mission-plan");
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
    setStage("mission-plan");
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
      setDossierError(null);
      dispatch({ type: "save-succeeded" });
      setStage("dossier");
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
          fileName: "heistboard-dossier-the-last-delivery.png",
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
    if (e.dataTransfer.types.includes("application/x-heistboard-sticker")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
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

  const handleReturnToTerritory = () => {
    if (annotatedMap) {
      const confirmed = window.confirm(
        "Warning: Changing Territory resets your current Mission Plan. Continue?",
      );
      if (!confirmed) return;
    }
    setStage("territory");
  };

  /** Programmatically click the native editor tool button matching a mission step. */
  const activateNativeTool = useCallback((nativeTool: string | null) => {
    if (!editorFrameRef.current) return;
    if (nativeTool) {
      // Steps 01-03: click the native Draw / Shapes / Text tool button
      const btn = editorFrameRef.current.querySelector<HTMLButtonElement>(
        `button[data-testid="${nativeTool}"]`,
      );
      btn?.click();
    } else {
      // Step 04 (Save): click the editor's save button
      const saveBtn = editorFrameRef.current.querySelector<HTMLButtonElement>(
        'button[data-testid="save-button"]',
      );
      if (saveBtn) {
        saveBtn.click();
      } else {
        // Fallback: try finding a save button by accessible name
        const buttons = editorFrameRef.current.querySelectorAll<HTMLButtonElement>('button');
        for (const b of buttons) {
          if (/save/i.test(b.textContent ?? '') || /save/i.test(b.getAttribute('aria-label') ?? '')) {
            b.click();
            break;
          }
        }
      }
    }
  }, []);

  const editorVisible =
    stage !== "territory" &&
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
          <p className="eyebrow">Case file / HB-004 Territory Search &amp; Composition</p>
          <h1>Plan the heist. Mark the streets.</h1>
          <p className="lede">
            From zero-cost 3D place search and locked camera rasterization, to browser-based
            mission editing and legal dossier export.
          </p>
        </div>
        <div className="status-stamp" aria-label="Fictional scenario">
          <span>Operation</span>
          <strong>The Last Delivery</strong>
          <small>Fictional use only</small>
        </div>
      </header>

      {/* 3-Stage Progress Nav */}
      <nav className="stage-indicator" aria-label="Operation Stages">
        <span className={`stage-badge ${stage === "territory" ? "active" : "complete"}`}>
          01 / Territory
        </span>
        <span
          className={`stage-badge ${stage === "mission-plan" ? "active" : stage === "dossier" ? "complete" : ""}`}
        >
          02 / Mission Plan &amp; Identity
        </span>
        <span className={`stage-badge ${stage === "dossier" ? "active" : ""}`}>
          03 / Dossier Preview
        </span>
      </nav>

      {/* Stage 1: Territory Composition */}
      {stage === "territory" && (
        <TerritoryView
          onLockTerritory={handleTerritoryLocked}
          onSelectSampleFallback={handleSelectSampleFallback}
          initialCamera={lockedCamera}
        />
      )}

      {/* Stage 2: Mission Editor (preserved in DOM across preview to maintain active Fabric objects) */}
      {stage !== "territory" && (
        <section
          className="workspace"
          aria-labelledby="workspace-title"
          style={{ display: stage === "mission-plan" ? undefined : "none" }}
        >
          <aside className="briefing">
            <p className="section-label">Mission brief</p>
            <h2 id="workspace-title">Package before sunrise</h2>
            <p>
              The target area is locked. Trace your delivery route, mark safe locations,
              and record the primary rendezvous point.
            </p>

            {/* Operative Callsign & Identity Badge in Briefing */}
            <div className="brief-operative-card">
              <div className="brief-operative-avatar">
                {identity.portraitSource === "custom" && identity.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={identity.portraitUrl} alt={identity.alias} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d={getSilhouetteArchetype(identity.silhouetteId).svgPath} />
                  </svg>
                )}
              </div>
              <div className="brief-operative-meta">
                <span className="brief-operative-tag">OPERATIVE / CALLSIGN</span>
                <strong className="brief-operative-alias">{identity.alias}</strong>
                <small className="brief-operative-role">
                  {identity.portraitSource === "silhouette"
                    ? getSilhouetteArchetype(identity.silhouetteId).role
                    : "Field Agent"}
                </small>
              </div>
              <button
                type="button"
                className="brief-edit-identity-btn"
                onClick={() => setRequestedEditorTool("identity")}
                title="Open Operative Identity in Editor"
              >
                Edit
              </button>
            </div>

            <ol className="mission-steps">
              {MISSION_STEPS.map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    className="mission-step-btn"
                    onClick={() => activateNativeTool(step.nativeTool)}
                    title={step.nativeTool ? `Activate ${step.title}` : step.title}
                  >
                    <span className="mission-step-num">{step.id}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                    <span className="mission-step-arrow" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="territory-source-tag">
              <small>
                Map Source:{" "}
                <strong>
                  {isSampleMap ? "Fictional Sample Map" : "OpenFreeMap 3D Vector Shot"}
                </strong>
              </small>
            </div>
            <button
              type="button"
              className="action-button tertiary"
              onClick={handleReturnToTerritory}
            >
              ← Change Territory (resets plan)
            </button>
          </aside>

          <div className="editor-column">
            <div className="editor-heading">
              <div>
                <p className="section-label">
                  Map Base / {isSampleMap ? "Southbank District (Sample)" : "3D Territory"}
                </p>
                <h2>Mission Plan editor</h2>
              </div>
              <span className={`phase phase-${workflow.phase}`} aria-live="polite">
                {phaseLabel(workflow.phase)}
              </span>
            </div>

            {workflow.phase === "checking-map" && (
              <EditorLoading label="Preparing and validating raster Map Base…" />
            )}

            {editorVisible && (
              <div
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

      {/* Stage 4: Dossier Preview */}
      {stage === "dossier" && annotatedMap && (
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-copy">
            <div>
              <p className="section-label">Final Dossier / 2400 × 1600 Artifact</p>
              <h2 id="preview-title">Operation Dossier</h2>
              <p role="status">
                {isComposingDossier
                  ? "Composing deterministic 2400 × 1600 Canvas 2D Dossier..."
                  : dossierError
                    ? `Composition warning: ${dossierError}`
                    : "Your 2400 × 1600 final mission dossier is locked and verified. Preview and download use this exact artifact."}
              </p>
            </div>

            <div className="actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  dispatch({ type: "edit-again" });
                  setStage("mission-plan");
                }}
              >
                Edit mission again
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  dispatch({ type: "edit-again" });
                  setStage("mission-plan");
                  setRequestedEditorTool("identity");
                }}
              >
                Edit identity
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleReturnToTerritory}
              >
                New territory
              </button>
              <a
                className={`button button-primary ${isComposingDossier ? "disabled" : ""}`}
                href={dossierArtifact?.downloadUrl ?? annotatedMap.download.href}
                download={dossierArtifact?.fileName ?? annotatedMap.download.fileName}
                aria-disabled={isComposingDossier}
              >
                {isComposingDossier ? "Composing 2400 × 1600..." : "Download Dossier PNG"}
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
        </section>
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
