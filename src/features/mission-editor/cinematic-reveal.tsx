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
      <div
        className="relative max-w-5xl w-full aspect-video rounded-xl overflow-hidden border border-coral/40 mx-auto my-8 shadow-2xl bg-charcoal-900"
        role="region"
        aria-label="Cinematic Dossier Reveal"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dossierUrl || annotatedMapUrl}
          alt="Completed 2400 × 1600 Operation Dossier"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-charcoal-950/95 backdrop-blur-xl select-none overflow-hidden"
      role="region"
      aria-label="Cinematic Dossier Reveal"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-coral/20 bg-charcoal-900/80">
        <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-widest text-petrol uppercase">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-petrol animate-pulse shadow-[0_0_10px_#00f5d4]" aria-hidden="true" />
          <span>REVEAL // OPERATION DOSSIER</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-coral/40 bg-coral/10 hover:bg-coral/25 text-coral hover:text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer"
          onClick={handleSkip}
          title="Skip Reveal animation (Esc)"
        >
          Skip Reveal <span>→</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div
          className={`relative max-w-5xl w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-coral/40 transition-transform ease-out ${
            isPullingBack ? "scale-100 duration-[2000ms]" : "scale-125 duration-0"
          }`}
          style={{ transitionDuration: `${durationMs}ms` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dossierUrl || annotatedMapUrl}
            alt="Exact user-authored Annotated Map pulling back into final Operation Dossier"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
