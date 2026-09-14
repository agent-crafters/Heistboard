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
  AnnotatedMapResourceOwner,
  type AnnotatedMapResource,
} from "@/lib/annotated-map-resource";

const MAP_BASE_URL = "/maps/sample-territory.svg";
const EDITOR_LOAD_TIMEOUT_MS = 20_000;

const MISSION_STEPS = [
  ["01", "Draw the route", "Use Draw to trace a bold path from west to east."],
  ["02", "Mark two locations", "Use Shapes for the pickup and meeting point."],
  ["03", "Leave one note", "Use Text to add a short instruction."],
  ["04", "Save the plan", "Use the editor's Save action when the route reads clearly."],
] as const;

const MissionEditor = dynamic(
  () => loadMissionEditor(),
  {
    ssr: false,
    loading: () => <EditorLoading label="Loading the authoring tools…" />,
  },
);

export function HeistboardEditorProof() {
  const [workflow, dispatch] = useReducer(
    editorWorkflowReducer,
    initialEditorWorkflow,
  );
  const [annotatedMap, setAnnotatedMap] = useState<AnnotatedMapResource | null>(null);
  const resourceOwner = useRef<AnnotatedMapResourceOwner | null>(null);

  if (resourceOwner.current === null) {
    resourceOwner.current = new AnnotatedMapResourceOwner();
  }

  useEffect(() => {
    const owner = resourceOwner.current;
    return () => owner?.dispose();
  }, []);

  useEffect(() => {
    if (workflow.phase !== "checking-map") return;

    let active = true;
    const mapBase = new Image();
    mapBase.onload = () => {
      if (active) dispatch({ type: "map-ready" });
    };
    mapBase.onerror = () => {
      if (active) {
        dispatch({
          type: "image-failed",
          message: "The original sample Map Base could not be decoded.",
        });
      }
    };
    mapBase.src = `${MAP_BASE_URL}?attempt=${workflow.retryKey}`;

    return () => {
      active = false;
      mapBase.onload = null;
      mapBase.onerror = null;
    };
  }, [workflow.phase, workflow.retryKey]);

  const editorSource = annotatedMap?.editorSource ?? MAP_BASE_URL;
  const editorVisible =
    workflow.phase === "loading-editor" ||
    workflow.phase === "editing" ||
    workflow.phase === "saving";

  const handleEditorLoad = useCallback(() => {
    dispatch({ type: "editor-ready" });
  }, []);

  const handleSave = useCallback(async (result: ImageEditorSaveResult) => {
    dispatch({ type: "save-started" });
    try {
      const resource = await resourceOwner.current?.replace(result);
      if (!resource) throw new Error("The image resource owner is unavailable.");
      setAnnotatedMap(resource);
      dispatch({ type: "save-succeeded" });
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

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Case file / HB-001</p>
          <h1>Mark the last delivery.</h1>
          <p className="lede">
            A local proof of Heistboard’s core interaction: author a fictional Mission Plan,
            save the exact result, then preview and download it.
          </p>
        </div>
        <div className="status-stamp" aria-label="Fictional scenario">
          <span>Operation</span>
          <strong>The Last Delivery</strong>
          <small>Fictional use only</small>
        </div>
      </header>

      <section className="workspace" aria-labelledby="workspace-title">
        <aside className="briefing">
          <p className="section-label">Mission brief</p>
          <h2 id="workspace-title">Package before sunrise</h2>
          <p>
            The handoff point moved. Read the streets, choose your path, and leave the
            courier one instruction.
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
          <p className="privacy-note">
            This proof uses an original fictional map. No address, portrait, or map-provider
            data is requested.
          </p>
        </aside>

        <div className="editor-column">
          <div className="editor-heading">
            <div>
              <p className="section-label">Map Base / Southbank District</p>
              <h2>Mission Plan editor</h2>
            </div>
            <span className={`phase phase-${workflow.phase}`} aria-live="polite">
              {phaseLabel(workflow.phase)}
            </span>
          </div>

          {workflow.phase === "checking-map" && (
            <EditorLoading label="Checking the original Map Base…" />
          )}

          {editorVisible && (
            <div className="editor-frame" aria-busy={workflow.phase !== "editing"}>
              {workflow.phase === "loading-editor" && (
                <div className="editor-overlay">
                  <EditorLoading label="Loading React Image Editor…" />
                </div>
              )}
              <MissionEditor
                image={editorSource}
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

          {workflow.phase === "preview" && annotatedMap && (
            <section className="preview-panel" aria-labelledby="preview-title">
              <div className="preview-copy">
                <div>
                  <p className="section-label">Annotated Map / saved</p>
                  <h2 id="preview-title">Your exact Mission Plan</h2>
                  <p role="status">{workflow.notice}</p>
                </div>
                <div className="actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => dispatch({ type: "edit-again" })}
                  >
                    Edit again
                  </button>
                  <a
                    className="button button-primary"
                    href={annotatedMap.download.href}
                    download={annotatedMap.download.fileName}
                  >
                    Download PNG
                  </a>
                </div>
              </div>
              {/* The same object URL backs this preview and the download above. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob URLs must bypass optimization so preview and download share the exact saved image. */}
              <img
                className="annotated-map"
                src={annotatedMap.previewUrl}
                alt="The exact Annotated Map saved from the mission editor"
              />
            </section>
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
              secondaryAction={
                workflow.hasAnnotatedMap
                  ? {
                      label: "Return to saved map",
                      onClick: () => dispatch({ type: "cancelled" }),
                    }
                  : undefined
              }
            />
          )}
        </div>
      </section>

      <footer className="footer-note">
        <span>Original sample map</span>
        <span>No route calculation</span>
        <span>React Image Editor is the authoring surface</span>
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
