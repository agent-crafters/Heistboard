import { describe, expect, it } from "vitest";

import {
  editorWorkflowReducer,
  initialEditorWorkflow,
} from "./editor-workflow";

describe("Mission Plan editor workflow", () => {
  it("reaches editing only after the Map Base and editor are ready", () => {
    const loadingEditor = editorWorkflowReducer(initialEditorWorkflow, {
      type: "map-ready",
    });
    const editing = editorWorkflowReducer(loadingEditor, {
      type: "editor-ready",
    });

    expect(loadingEditor.phase).toBe("loading-editor");
    expect(editing).toMatchObject({ phase: "editing", failure: null });
  });

  it("preserves a valid Annotated Map through a later editor failure", () => {
    const preview = editorWorkflowReducer(
      { ...initialEditorWorkflow, phase: "saving" },
      { type: "save-succeeded" },
    );
    const loadingEditor = editorWorkflowReducer(preview, {
      type: "edit-again",
    });
    const failed = editorWorkflowReducer(loadingEditor, {
      type: "editor-failed",
      message: "The editor service could not load.",
    });

    expect(failed).toMatchObject({
      phase: "failure",
      hasAnnotatedMap: true,
      failure: { kind: "editor" },
    });
  });

  it("retries an image failure from Map Base verification", () => {
    const failed = editorWorkflowReducer(initialEditorWorkflow, {
      type: "image-failed",
      message: "The sample Map Base could not be decoded.",
    });
    const retried = editorWorkflowReducer(failed, { type: "retry" });

    expect(retried).toMatchObject({
      phase: "checking-map",
      failure: null,
      retryKey: 1,
    });
  });

  it("returns to a valid preview when editing is cancelled after a save", () => {
    const editing = {
      ...initialEditorWorkflow,
      phase: "editing" as const,
      hasAnnotatedMap: true,
    };

    expect(editorWorkflowReducer(editing, { type: "cancelled" })).toMatchObject({
      phase: "preview",
      hasAnnotatedMap: true,
      notice: "Editing cancelled. Your last saved Annotated Map is unchanged.",
    });
  });
});
