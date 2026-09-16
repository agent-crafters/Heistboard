import { describe, expect, it } from "vitest";
import {
  advanceReveal,
  initializeReveal,
  replayReveal,
  skipReveal,
  startPullback,
  DEFAULT_REVEAL_DURATION_MS,
} from "./reveal-controller";

describe("Cinematic Reveal state controller (HB-010)", () => {
  it("initializes to zoomed-in phase with default 2000ms duration", () => {
    const state = initializeReveal();
    expect(state.phase).toBe("zoomed-in");
    expect(state.durationMs).toBe(DEFAULT_REVEAL_DURATION_MS);
    expect(state.isComplete).toBe(false);
    expect(state.isReducedMotion).toBe(false);
  });

  it("immediately completes when prefers-reduced-motion is active", () => {
    const state = initializeReveal({ prefersReducedMotion: true });
    expect(state.phase).toBe("complete");
    expect(state.isComplete).toBe(true);
    expect(state.isReducedMotion).toBe(true);
    expect(state.durationMs).toBe(0);
  });

  it("transitions to pulling-back phase and advances progress", () => {
    let state = initializeReveal({ durationMs: 2000 });
    state = startPullback(state);
    expect(state.phase).toBe("pulling-back");

    state = advanceReveal(state, 1000);
    expect(state.progressMs).toBe(1000);
    expect(state.isComplete).toBe(false);

    state = advanceReveal(state, 1000);
    expect(state.progressMs).toBe(2000);
    expect(state.phase).toBe("complete");
    expect(state.isComplete).toBe(true);
  });

  it("supports skipping immediately to complete state", () => {
    let state = initializeReveal({ durationMs: 2000 });
    expect(state.isComplete).toBe(false);

    state = skipReveal(state);
    expect(state.phase).toBe("complete");
    expect(state.isComplete).toBe(true);
    expect(state.progressMs).toBe(2000);
  });

  it("supports replaying from initial state", () => {
    let state = initializeReveal({ durationMs: 2000 });
    state = skipReveal(state);
    expect(state.isComplete).toBe(true);

    state = replayReveal({ durationMs: 2000 });
    expect(state.phase).toBe("zoomed-in");
    expect(state.isComplete).toBe(false);
    expect(state.progressMs).toBe(0);
  });
});
