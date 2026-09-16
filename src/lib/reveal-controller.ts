/**
 * Reveal sequence state machine (HB-010).
 * Governs the cinematic transition from the authored Annotated Map into the full 2400 × 1600 Dossier.
 * Adheres to HB-010 invariants:
 * - Pulls back the exact saved map without rerendering or faking generation
 * - Completes within ~2 seconds
 * - Supports skip and replay
 * - Respects prefers-reduced-motion with an immediate static transition
 */

export const DEFAULT_REVEAL_DURATION_MS = 2000;

export interface RevealOptions {
  durationMs?: number;
  prefersReducedMotion?: boolean;
}

export type RevealPhase = "idle" | "zoomed-in" | "pulling-back" | "complete";

export interface RevealState {
  phase: RevealPhase;
  progressMs: number;
  durationMs: number;
  isReducedMotion: boolean;
  isComplete: boolean;
}

export function initializeReveal(options: RevealOptions = {}): RevealState {
  const isReducedMotion = Boolean(options.prefersReducedMotion);
  if (isReducedMotion) {
    return {
      phase: "complete",
      progressMs: 0,
      durationMs: 0,
      isReducedMotion: true,
      isComplete: true,
    };
  }

  return {
    phase: "zoomed-in",
    progressMs: 0,
    durationMs: options.durationMs ?? DEFAULT_REVEAL_DURATION_MS,
    isReducedMotion: false,
    isComplete: false,
  };
}

export function startPullback(state: RevealState): RevealState {
  if (state.isComplete || state.isReducedMotion) return state;
  return {
    ...state,
    phase: "pulling-back",
  };
}

export function skipReveal(state: RevealState): RevealState {
  return {
    ...state,
    phase: "complete",
    progressMs: state.durationMs,
    isComplete: true,
  };
}

export function advanceReveal(state: RevealState, deltaMs: number): RevealState {
  if (state.isComplete || state.isReducedMotion) return state;
  const newProgress = Math.min(state.durationMs, state.progressMs + deltaMs);
  if (newProgress >= state.durationMs) {
    return {
      ...state,
      phase: "complete",
      progressMs: state.durationMs,
      isComplete: true,
    };
  }

  return {
    ...state,
    phase: "pulling-back",
    progressMs: newProgress,
  };
}

export function replayReveal(options: RevealOptions = {}): RevealState {
  return initializeReveal(options);
}
