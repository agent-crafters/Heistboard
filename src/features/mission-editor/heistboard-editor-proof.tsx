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
import { StickerSidebar } from "@/features/mission-editor/sticker-sidebar";
import { findFabricCanvas, importStickerToCanvas } from "@/lib/sticker-canvas-importer";

const EDITOR_LOAD_TIMEOUT_MS = 20_000;

export type HeistStage = "territory" | "mission-plan" | "dossier";

const MISSION_STEPS = [
  ["01", "Draw the route", "Use Draw to trace a bold path across the neighborhood."],
  ["02", "Mark two locations", "Use Shapes for the pickup point and the getaway."],
  ["03", "Leave one note", "Use Text to add a short courier instruction."],
  ["04", "Save the plan", "Use the editor's Save action when the route reads clearly."],
] as const;

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
  const [sidebarTab, setSidebarTab] = useState<"brief" | "stickers">("stickers");

  const resourceOwner = useRef<AnnotatedMapResourceOwner | null>(null);
  const mapBaseBlobUrlRef = useRef<string | null>(null);
  const editorFrameRef = useRef<HTMLDivElement>(null);

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

  const editorVisible =
    stage === "mission-plan" &&
    (workflow.phase === "loading-editor" ||
      workflow.phase === "editing" ||
      workflow.phase === "saving");

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
        <span className={`stage-badge ${stage === "mission-plan" ? "active" : ""}`}>
          02 / Mission Plan
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

      {/* Stage 2: Mission Editor */}
      {stage === "mission-plan" && (
        <section className="workspace" aria-labelledby="workspace-title">
          <aside className="briefing">
            <div className="briefing-tabs" role="tablist">
              <button
                type="button"
                className={`briefing-tab-btn ${sidebarTab === "stickers" ? "active" : ""}`}
                onClick={() => setSidebarTab("stickers")}
              >
                Tactical Stickers (30)
              </button>
              <button
                type="button"
                className={`briefing-tab-btn ${sidebarTab === "brief" ? "active" : ""}`}
                onClick={() => setSidebarTab("brief")}
              >
                Mission Brief
              </button>
            </div>

            {sidebarTab === "stickers" ? (
              <StickerSidebar editorContainerRef={editorFrameRef} />
            ) : (
              <>
                <p className="section-label">Mission brief</p>
                <h2 id="workspace-title">Package before sunrise</h2>
                <p>
                  The target area is locked. Trace your delivery route, mark safe locations,
                  and record the primary rendezvous point.
                </p>
                <ol className="mission-steps">
                  {MISSION_STEPS.map(([number, title, detail]) => (
                    <li key={number}>
                      <span>{number}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

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
                  image={annotatedMap?.editorSource ?? mapBaseUrl}
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

      {/* Stage 3: Dossier Preview */}
      {stage === "dossier" && annotatedMap && (
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-copy">
            <div>
              <p className="section-label">Final Dossier / Annotated Map</p>
              <h2 id="preview-title">Operation Dossier</h2>
              <p role="status">
                Your mission plan is locked and verified. This exact image will be exported.
              </p>
            </div>
            <div className="actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setStage("mission-plan")}
              >
                Edit mission again
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleReturnToTerritory}
              >
                New territory
              </button>
              <a
                className="button button-primary"
                href={annotatedMap.download.href}
                download={annotatedMap.download.fileName}
              >
                Download Dossier PNG
              </a>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="annotated-map"
            src={annotatedMap.previewUrl}
            alt="The exact Annotated Map saved from the mission editor"
          />

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
