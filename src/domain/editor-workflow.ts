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
