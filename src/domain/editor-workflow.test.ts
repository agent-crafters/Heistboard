import { describe, expect, it } from "vitest";

import {
  editorWorkflowReducer,
  initialEditorWorkflow,
  initialJourneyState,
  operationJourneyReducer,
  type OperationJourneyState,
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

  it("discards saved editor state when a new Map Base is selected", () => {
    const preview = {
      ...initialEditorWorkflow,
      phase: "preview" as const,
      hasAnnotatedMap: true,
      notice: "Mission Plan saved.",
    };

    expect(
      editorWorkflowReducer(preview, { type: "reset-for-map-base" }),
    ).toEqual({
      ...initialEditorWorkflow,
      retryKey: 1,
    });
  });
});

describe("Operation Journey workflow", () => {
  it("progresses through stages in sequence without separate identity step", () => {
    let state = initialJourneyState;
    expect(state.stage).toBe("file");

    // Stage 1 -> Stage 2 (Territory)
    state = operationJourneyReducer(state, { type: "start-operation" });
    expect(state.stage).toBe("territory");

    // Stage 2 -> Stage 3 (Mission Plan directly on lock-territory)
    state = operationJourneyReducer(state, { type: "lock-territory" });
    expect(state.stage).toBe("mission-plan");
    expect(state.isTerritoryLocked).toBe(true);

    // Stage 3 -> Stage 4 (Dossier on save)
    state = operationJourneyReducer(state, { type: "save-succeeded" });
    expect(state.stage).toBe("dossier");
    expect(state.hasAnnotatedMap).toBe(true);
  });

  it("allows backward navigation preserving compatible work", () => {
    // Starting at territory, lock to mission-plan
    let state = operationJourneyReducer(initialJourneyState, { type: "start-operation" });
    state = operationJourneyReducer(state, { type: "lock-territory" });
    expect(state.stage).toBe("mission-plan");

    // Back to territory preserves isTerritoryLocked
    state = operationJourneyReducer(state, { type: "go-to-stage", target: "territory" });
    expect(state.stage).toBe("territory");
    expect(state.isTerritoryLocked).toBe(true);

    // Forward to mission-plan (or via legacy identity target redirect)
    state = operationJourneyReducer(state, { type: "go-to-stage", target: "identity" });
    expect(state.stage).toBe("mission-plan");

    // Save to dossier
    state = operationJourneyReducer(state, { type: "save-succeeded" });
    expect(state.stage).toBe("dossier");

    // From dossier, edit plan returns to mission-plan
    state = operationJourneyReducer(state, { type: "go-to-stage", target: "mission-plan" });
    expect(state.stage).toBe("mission-plan");
    expect(state.hasAnnotatedMap).toBe(true);
  });

  it("warns before resetting territory when mission plan has edits", () => {
    let state = operationJourneyReducer(initialJourneyState, { type: "start-operation" });
    state = operationJourneyReducer(state, { type: "lock-territory" });
    state = operationJourneyReducer(state, { type: "confirm-identity" });
    expect(state.stage).toBe("mission-plan");

    // User marks route or places shapes
    state = operationJourneyReducer(state, { type: "record-mission-edit" });
    expect(state.hasMissionEdits).toBe(true);

    // Attempting to change territory triggers warning instead of immediately navigating
    state = operationJourneyReducer(state, { type: "request-change-territory" });
    expect(state.isConfirmingTerritoryReset).toBe(true);
    expect(state.stage).toBe("mission-plan"); // still on mission plan

    // Cancelling warning keeps state intact
    state = operationJourneyReducer(state, { type: "cancel-change-territory" });
    expect(state.isConfirmingTerritoryReset).toBe(false);
    expect(state.stage).toBe("mission-plan");
    expect(state.hasMissionEdits).toBe(true);

    // Confirming warning resets mission edits and returns to territory
    state = operationJourneyReducer(state, { type: "request-change-territory" });
    state = operationJourneyReducer(state, { type: "confirm-change-territory" });
    expect(state.isConfirmingTerritoryReset).toBe(false);
    expect(state.stage).toBe("territory");
    expect(state.hasMissionEdits).toBe(false);
    expect(state.isTerritoryLocked).toBe(false);
  });

  it("warns when navigating to territory via go-to-stage if annotated map exists", () => {
    const state: OperationJourneyState = {
      ...initialJourneyState,
      stage: "dossier",
      hasAnnotatedMap: true,
      hasMissionEdits: true,
      isTerritoryLocked: true,
    };

    const nextState = operationJourneyReducer(state, { type: "go-to-stage", target: "territory" });
    expect(nextState.isConfirmingTerritoryReset).toBe(true);
    expect(nextState.stage).toBe("dossier");
  });

  it("resets cleanly on restart-operation", () => {
    const complexState = {
      stage: "dossier" as const,
      isTerritoryLocked: true,
      hasMissionEdits: true,
      hasAnnotatedMap: true,
      isConfirmingTerritoryReset: true,
    };

    const restarted = operationJourneyReducer(complexState, { type: "restart-operation" });
    expect(restarted).toEqual(initialJourneyState);
  });
});
