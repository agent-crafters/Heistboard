"use client";

import { useEffect, useState, useCallback } from "react";

export interface CinematicRevealProps {
  annotatedMapUrl: string;
  dossierUrl: string;
  onComplete: () => void;
  onSkip?: () => void;
  durationMs?: number;
}

export function CinematicReveal({
  annotatedMapUrl,
  dossierUrl,
  onComplete,
  onSkip,
  durationMs = 2000,
}: CinematicRevealProps) {
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isPullingBack, setIsPullingBack] = useState(false);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }, [onSkip, onComplete]);

  // Handle prefers-reduced-motion
  useEffect(() => {
    if (isReducedMotion) {
      onComplete();
      return;
    }
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsReducedMotion(true);
        onComplete();
      }
    };
    mediaQuery.addEventListener?.("change", handler);
    return () => mediaQuery.removeEventListener?.("change", handler);
  }, [isReducedMotion, onComplete]);

  // Trigger animation start and completion timer
  useEffect(() => {
    if (isReducedMotion) return;

    // Start zoom pullback on next frame
    const startRaf = requestAnimationFrame(() => {
      setIsPullingBack(true);
    });

    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);

    // Keyboard shortcut to skip: Escape or Space
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(startRaf);
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReducedMotion, durationMs, onComplete, handleSkip]);

  if (isReducedMotion) {
    return (
      <div className="cinematic-reveal-container static-reveal" role="region" aria-label="Cinematic Dossier Reveal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dossierUrl || annotatedMapUrl}
          alt="Completed 2400 × 1600 Operation Dossier"
          className="reveal-image-static"
        />
      </div>
    );
  }

  return (
    <div
      className="cinematic-reveal-wrapper"
      role="region"
      aria-label="Cinematic Dossier Reveal"
    >
      <div className="reveal-top-bar">
        <div className="reveal-status-tag">
          <span className="reveal-dot" aria-hidden="true" />
          <span>REVEAL // OPERATION DOSSIER</span>
        </div>
        <button
          type="button"
          className="reveal-skip-btn"
          onClick={handleSkip}
          title="Skip Reveal animation (Esc)"
        >
          Skip Reveal <span>→</span>
        </button>
      </div>

      <div className="cinematic-reveal-stage">
        <div
          className={`reveal-card-viewport ${isPullingBack ? "pull-back" : "zoom-in"}`}
          style={{ animationDuration: `${durationMs}ms` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dossierUrl || annotatedMapUrl}
            alt="Exact user-authored Annotated Map pulling back into final Operation Dossier"
            className="reveal-dossier-image"
          />
        </div>
      </div>
    </div>
  );
}
