export type EditorFailureKind = "editor" | "image" | "save";

export type EditorWorkflowPhase =
  | "checking-map"
  | "loading-editor"
  | "editing"
  | "saving"
  | "preview"
  | "cancelled"
  | "failure";

export interface EditorFailure {
  kind: EditorFailureKind;
  message: string;
}

export interface EditorWorkflowState {
  phase: EditorWorkflowPhase;
  hasAnnotatedMap: boolean;
  failure: EditorFailure | null;
  notice: string | null;
  retryKey: number;
}

export type EditorWorkflowEvent =
  | { type: "map-ready" }
  | { type: "editor-ready" }
  | { type: "image-failed"; message: string }
  | { type: "editor-failed"; message: string }
  | { type: "save-started" }
  | { type: "save-succeeded" }
  | { type: "save-failed"; message: string }
  | { type: "cancelled" }
  | { type: "edit-again" }
  | { type: "retry" };

export const initialEditorWorkflow: EditorWorkflowState = {
  phase: "checking-map",
  hasAnnotatedMap: false,
  failure: null,
  notice: null,
  retryKey: 0,
};

export function editorWorkflowReducer(
  state: EditorWorkflowState,
  event: EditorWorkflowEvent,
): EditorWorkflowState {
  switch (event.type) {
    case "map-ready":
      return state.phase === "checking-map"
        ? { ...state, phase: "loading-editor", failure: null, notice: null }
        : state;
    case "editor-ready":
      return state.phase === "loading-editor"
        ? { ...state, phase: "editing", failure: null, notice: null }
        : state;
    case "image-failed":
      return {
        ...state,
        phase: "failure",
        failure: { kind: "image", message: event.message },
        notice: null,
      };
    case "editor-failed":
      return {
        ...state,
        phase: "failure",
        failure: { kind: "editor", message: event.message },
        notice: null,
      };
    case "save-started":
      return state.phase === "editing"
        ? { ...state, phase: "saving", failure: null, notice: null }
        : state;
    case "save-succeeded":
      return state.phase === "saving"
        ? {
            ...state,
            phase: "preview",
            hasAnnotatedMap: true,
            failure: null,
            notice: "Mission Plan saved. This is your exact Annotated Map.",
          }
        : state;
    case "save-failed":
      return {
        ...state,
        phase: "failure",
        failure: { kind: "save", message: event.message },
        notice: null,
      };
    case "cancelled":
      return state.hasAnnotatedMap
        ? {
            ...state,
            phase: "preview",
            failure: null,
            notice: "Editing cancelled. Your last saved Annotated Map is unchanged.",
          }
        : {
            ...state,
            phase: "cancelled",
            failure: null,
            notice: "Editing cancelled. Resume when you are ready to mark the route.",
          };
    case "edit-again":
      return {
        ...state,
        phase: "editing",
        failure: null,
        notice: null,
      };
    case "retry":
      if (state.phase !== "failure") return state;
      return {
        ...state,
        phase: state.failure?.kind === "image" ? "checking-map" : "loading-editor",
        failure: null,
        notice: null,
        retryKey: state.retryKey + 1,
      };
  }
}

/**
 * The five stages of the Heistboard journey (CONTEXT.md):
 * 1. file: Open the file & understand fictional premise
 * 2. territory: Search, compose 3D view, lock Territory Shot
 * 3. identity: Add alias, role, callsign, and portrait/silhouette badge
 * 4. mission-plan: Author routes, shapes, text, and notes on stable Map Base
 * 5. dossier: Inspect composed 2400 × 1600 artifact & download
 */
export type OperationStage =
  | "file"
  | "territory"
  | "identity"
  | "mission-plan"
  | "dossier";

export interface StageDescriptor {
  id: OperationStage;
  number: string;
  label: string;
  shortDescription: string;
}

export const OPERATION_STAGES: readonly StageDescriptor[] = [
  { id: "file", number: "01", label: "Case File", shortDescription: "Operation Briefing & premise" },
  { id: "territory", number: "02", label: "Territory", shortDescription: "3D search & camera lock" },
  { id: "mission-plan", number: "03", label: "Mission Plan", shortDescription: "Draw routes & locations" },
  { id: "dossier", number: "04", label: "Dossier", shortDescription: "2400 × 1600 export" },
] as const;

export interface OperationJourneyState {
  stage: OperationStage;
  isTerritoryLocked: boolean;
  hasMissionEdits: boolean;
  hasAnnotatedMap: boolean;
  isConfirmingTerritoryReset: boolean;
}

export const initialJourneyState: OperationJourneyState = {
  stage: "file",
  isTerritoryLocked: false,
  hasMissionEdits: false,
  hasAnnotatedMap: false,
  isConfirmingTerritoryReset: false,
};

export type OperationJourneyEvent =
  | { type: "start-operation" }
  | { type: "lock-territory" }
  | { type: "confirm-identity" }
  | { type: "save-succeeded" }
  | { type: "go-to-stage"; target: OperationStage }
  | { type: "request-change-territory" }
  | { type: "confirm-change-territory" }
  | { type: "cancel-change-territory" }
  | { type: "record-mission-edit" }
  | { type: "restart-operation" };

export function operationJourneyReducer(
  state: OperationJourneyState,
  event: OperationJourneyEvent,
): OperationJourneyState {
  switch (event.type) {
    case "start-operation":
      return { ...state, stage: "territory" };

    case "lock-territory":
      return { ...state, isTerritoryLocked: true, stage: "mission-plan" };

    case "confirm-identity":
      return { ...state, stage: "mission-plan" };

    case "save-succeeded":
      return {
        ...state,
        hasAnnotatedMap: true,
        hasMissionEdits: true,
        stage: "dossier",
      };

    case "record-mission-edit":
      return { ...state, hasMissionEdits: true };

    case "request-change-territory":
      if (state.hasMissionEdits || state.hasAnnotatedMap) {
        return { ...state, isConfirmingTerritoryReset: true };
      }
      return {
        ...state,
        stage: "territory",
        isTerritoryLocked: false,
        hasMissionEdits: false,
        hasAnnotatedMap: false,
        isConfirmingTerritoryReset: false,
      };

    case "confirm-change-territory":
      return {
        ...state,
        stage: "territory",
        isTerritoryLocked: false,
        hasMissionEdits: false,
        hasAnnotatedMap: false,
        isConfirmingTerritoryReset: false,
      };

    case "cancel-change-territory":
      return { ...state, isConfirmingTerritoryReset: false };

    case "go-to-stage": {
      // If moving to territory when mission edits exist, require confirmation
      if (
        event.target === "territory" &&
        (state.hasMissionEdits || state.hasAnnotatedMap)
      ) {
        return { ...state, isConfirmingTerritoryReset: true };
      }
      // If target is identity, redirect directly to mission-plan
      if (event.target === "identity") {
        return { ...state, stage: "mission-plan" };
      }
      return { ...state, stage: event.target };
    }

    case "restart-operation":
      return { ...initialJourneyState };
  }
}

