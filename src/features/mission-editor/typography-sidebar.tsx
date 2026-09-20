"use client";

import { useEffect, useState } from "react";
import {
  STYLISH_FONTS,
  GTA_TEXT_STYLES,
  GTA_PRESET_PHRASES,
  type StylishFont,
  type GtaTextStyle,
  addStyledTextToFabricCanvas,
  changeFabricTextFont,
  ensureFontsLoaded,
} from "@/lib/gta-fonts";
import { findFabricCanvas } from "@/lib/sticker-canvas-importer";

interface TypographySidebarProps {
  editorContainerRef?: React.RefObject<HTMLElement | null>;
  onTextAdded?: (text: string, font: string) => void;
  compact?: boolean;
}

export function TypographySidebar({
  editorContainerRef,
  onTextAdded,
  compact = false,
}: TypographySidebarProps) {
  const [text, setText] = useState("MISSION PASSED");
  const [selectedFont, setSelectedFont] = useState<StylishFont>(STYLISH_FONTS[0]);
  const [selectedStyle, setSelectedStyle] = useState<GtaTextStyle>(GTA_TEXT_STYLES[0]);
  const [fontSize, setFontSize] = useState<number>(54);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasActiveCanvasText, setHasActiveCanvasText] = useState(false);

  // Preload web fonts
  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  // Poll / listen for active selection on canvas
  useEffect(() => {
    const canvas = findFabricCanvas(editorContainerRef?.current);
    if (!canvas) return;

    const checkSelection = () => {
      const active = (canvas as unknown as { getActiveObject?(): unknown }).getActiveObject?.();
      setHasActiveCanvasText(Boolean(active));
    };

    const interval = setInterval(checkSelection, 1000);
    return () => clearInterval(interval);
  }, [editorContainerRef]);

  const handleAddText = async () => {
    if (!text.trim()) return;

    setIsAdding(true);
    const canvas = findFabricCanvas(editorContainerRef?.current);

    if (!canvas) {
      setFeedback("Click map first or check editor");
      setIsAdding(false);
      setTimeout(() => setFeedback(null), 2500);
      return;
    }

    const success = await addStyledTextToFabricCanvas(canvas, {
      text,
      fontFamily: selectedFont.fontFamily,
      fontSize,
      style: selectedStyle,
    });

    setIsAdding(false);

    if (success) {
      setFeedback(`Added "${text}" in ${selectedFont.name}`);
      onTextAdded?.(text, selectedFont.name);
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback("Failed to add text to map");
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleChangeActiveFont = (fontFamily: string) => {
    const canvas = findFabricCanvas(editorContainerRef?.current);
    if (!canvas) return;

    const success = changeFabricTextFont(canvas, fontFamily);
    if (success) {
      setFeedback(`Changed selected text to ${fontFamily}`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-charcoal-900/95 border-l border-coral/30 text-paper overflow-hidden select-none ${compact ? "w-full" : ""}`}
      aria-label="Rockstar & GTA Typography Tool"
    >
      {/* Header */}
      <div className="p-4 border-b border-coral/20 bg-charcoal-850/80 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-mustard/20 text-mustard border border-mustard/40">★ ROCKSTAR FONTS</span>
          <h3 className="font-display text-lg tracking-wider text-white uppercase">GTA Typography</h3>
        </div>
        <p className="text-xs text-paper-muted leading-tight">
          Legendary <strong>Pricedown</strong> and stylish tactical heist display fonts.
        </p>

        {feedback && (
          <div className="px-3 py-1.5 rounded-md bg-petrol/20 text-petrol font-mono text-xs font-bold border border-petrol/40 animate-pulse" role="status">
            ✓ {feedback}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Active Selection Changer */}
        {hasActiveCanvasText && (
          <div className="p-3 rounded-lg bg-mustard/10 border border-mustard/40 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded bg-mustard text-ink font-mono text-[10px] font-black uppercase tracking-wider">Text Selected On Map</span>
            <p className="text-xs text-mustard/90 font-medium">Click any font below to instantly update selected text:</p>
            <div className="flex flex-wrap gap-1.5">
              {STYLISH_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  className="px-2.5 py-1 rounded bg-charcoal-800 hover:bg-mustard/20 hover:text-mustard text-xs text-white border border-white/10 transition-colors cursor-pointer"
                  style={{ fontFamily: `"${font.fontFamily}", sans-serif` }}
                  onClick={() => handleChangeActiveFont(font.fontFamily)}
                  title={`Change font to ${font.name}`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. TEXT INPUT & QUICK PRESETS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="font-mono text-xs font-bold text-coral">01</span>
            <h4 className="font-display text-sm tracking-wide text-white uppercase">Enter Text</h4>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              className="w-full px-3 py-2 pl-3 pr-8 rounded-lg bg-charcoal-950 border border-coral/30 text-white placeholder:text-paper-muted/60 text-sm font-medium focus:outline-none focus:border-coral"
              placeholder="Enter heist text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ fontFamily: `"${selectedFont.fontFamily}", sans-serif` }}
            />
            {text && (
              <button
                type="button"
                className="absolute right-2.5 text-paper-muted hover:text-white text-xs cursor-pointer"
                onClick={() => setText("")}
                title="Clear text"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">Iconic Phrases:</span>
            <div className="flex flex-wrap gap-1.5">
              {GTA_PRESET_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                    text === phrase
                      ? "bg-coral text-white font-bold shadow-sm shadow-coral/30"
                      : "bg-charcoal-800 text-paper-muted hover:text-white hover:bg-charcoal-700"
                  }`}
                  onClick={() => setText(phrase)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. FONT SELECTOR */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="font-mono text-xs font-bold text-coral">02</span>
            <h4 className="font-display text-sm tracking-wide text-white uppercase">Choose Font Family</h4>
          </div>

          <div className="space-y-2">
            {STYLISH_FONTS.map((font) => {
              const isSelected = selectedFont.id === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-charcoal-800 border-mustard shadow-lg shadow-mustard/10"
                      : "bg-charcoal-800/60 border-white/5 hover:border-white/20 hover:bg-charcoal-800"
                  }`}
                  onClick={() => setSelectedFont(font)}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-white font-bold">{font.name}</strong>
                    {font.badge && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-mustard/20 text-mustard font-bold">
                        {font.badge}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-base text-paper my-1 tracking-wide truncate"
                    style={{ fontFamily: `"${font.fontFamily}", sans-serif` }}
                  >
                    {font.previewText}
                  </div>
                  <span className="text-[11px] text-paper-muted block">{font.tagline}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. GTA TEXT STYLES */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="font-mono text-xs font-bold text-coral">03</span>
            <h4 className="font-display text-sm tracking-wide text-white uppercase">GTA Visual Style</h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {GTA_TEXT_STYLES.map((style) => {
              const isSelected = selectedStyle.id === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-charcoal-800 border-coral shadow-lg shadow-coral/10"
                      : "bg-charcoal-800/60 border-white/5 hover:border-white/20"
                  }`}
                  onClick={() => setSelectedStyle(style)}
                >
                  <div
                    className="text-xl font-bold py-1 select-none"
                    style={{
                      color: style.fill,
                      WebkitTextStroke: `${Math.min(style.strokeWidth, 2)}px ${style.stroke}`,
                      textShadow: `${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`,
                      fontFamily: `"${selectedFont.fontFamily}", sans-serif`,
                    }}
                  >
                    GTA VI
                  </div>
                  <span className="text-[11px] font-mono text-paper-muted block mt-1">{style.name}</span>
                </button>
              );
            })}
          </div>

          {/* Font Size Slider */}
          <div className="space-y-1.5 mt-3">
            <div className="flex items-center justify-between text-xs font-mono text-paper-muted">
              <label htmlFor="font-size-slider">Font Size</label>
              <span className="text-petrol font-bold">{fontSize}px</span>
            </div>
            <input
              id="font-size-slider"
              type="range"
              min="24"
              max="120"
              step="4"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="w-full accent-coral cursor-pointer"
            />
          </div>
        </section>

        {/* 4. LIVE PREVIEW & ACTION */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <span className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">Map Preview:</span>
          <div className="p-4 rounded-lg bg-charcoal-950 border border-coral/30 flex items-center justify-center min-h-[70px] overflow-hidden text-center">
            <div
              style={{
                fontFamily: `"${selectedFont.fontFamily}", sans-serif`,
                fontSize: `${Math.min(fontSize * 0.75, 42)}px`,
                color: selectedStyle.fill,
                WebkitTextStroke: `${selectedStyle.strokeWidth}px ${selectedStyle.stroke}`,
                textShadow: `${selectedStyle.shadow.offsetX}px ${selectedStyle.shadow.offsetY}px ${selectedStyle.shadow.blur}px ${selectedStyle.shadow.color}`,
              }}
            >
              {text || "Sample Text"}
            </div>
          </div>

          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-lg bg-mustard hover:bg-mustard-subtle text-ink font-mono text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-mustard/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddText}
            disabled={isAdding || !text.trim()}
          >
            {isAdding ? "Adding to map…" : `+ Add "${selectedFont.name}" to Map Canvas`}
          </button>
        </section>
      </div>
    </div>
  );
}
