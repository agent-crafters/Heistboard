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
      className={`typography-sidebar-panel ${compact ? "compact" : ""}`}
      aria-label="Rockstar & GTA Typography Tool"
    >
      {/* Header */}
      <div className="typography-header">
        <div className="flex items-center gap-2">
          <span className="typography-rockstar-badge">★ ROCKSTAR FONTS</span>
          <h3 className="typography-title">GTA Typography</h3>
        </div>
        <p className="typography-subtitle">
          Legendary <strong>Pricedown</strong> and stylish tactical heist display fonts.
        </p>

        {feedback && (
          <div className="typography-feedback-toast" role="status">
            ✓ {feedback}
          </div>
        )}
      </div>

      <div className="typography-scroll-body">
        {/* Active Selection Changer */}
        {hasActiveCanvasText && (
          <div className="active-text-selection-box">
            <span className="selection-badge">Text Selected On Map</span>
            <p className="selection-hint">Click any font below to instantly update selected text:</p>
            <div className="quick-font-switch-chips">
              {STYLISH_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  className="quick-font-btn"
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
        <section className="typography-section">
          <div className="section-header-row">
            <span className="section-number">01</span>
            <h4>Enter Text</h4>
          </div>

          <div className="text-input-row">
            <input
              type="text"
              className="typography-text-input"
              placeholder="Enter heist text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ fontFamily: `"${selectedFont.fontFamily}", sans-serif` }}
            />
            {text && (
              <button
                type="button"
                className="clear-text-btn"
                onClick={() => setText("")}
                title="Clear text"
              >
                ✕
              </button>
            )}
          </div>

          <div className="preset-phrases-row">
            <span className="sublabel">Iconic Phrases:</span>
            <div className="preset-phrase-chips">
              {GTA_PRESET_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  className={`preset-phrase-chip ${text === phrase ? "active" : ""}`}
                  onClick={() => setText(phrase)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. FONT SELECTOR */}
        <section className="typography-section">
          <div className="section-header-row">
            <span className="section-number">02</span>
            <h4>Choose Font Family</h4>
          </div>

          <div className="font-cards-list">
            {STYLISH_FONTS.map((font) => {
              const isSelected = selectedFont.id === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  className={`font-card ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedFont(font)}
                >
                  <div className="font-card-top">
                    <strong className="font-name">{font.name}</strong>
                    {font.badge && <span className="font-badge">{font.badge}</span>}
                  </div>
                  <div
                    className="font-preview-sample"
                    style={{ fontFamily: `"${font.fontFamily}", sans-serif` }}
                  >
                    {font.previewText}
                  </div>
                  <span className="font-tagline">{font.tagline}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. GTA TEXT STYLES */}
        <section className="typography-section">
          <div className="section-header-row">
            <span className="section-number">03</span>
            <h4>GTA Visual Style</h4>
          </div>

          <div className="gta-text-styles-grid">
            {GTA_TEXT_STYLES.map((style) => {
              const isSelected = selectedStyle.id === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`text-style-card ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedStyle(style)}
                >
                  <div
                    className="style-sample-chip"
                    style={{
                      color: style.fill,
                      WebkitTextStroke: `${Math.min(style.strokeWidth, 2)}px ${style.stroke}`,
                      textShadow: `${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`,
                      fontFamily: `"${selectedFont.fontFamily}", sans-serif`,
                    }}
                  >
                    GTA VI
                  </div>
                  <span className="style-name">{style.name}</span>
                </button>
              );
            })}
          </div>

          {/* Font Size Slider */}
          <div className="control-slider-group mt-3">
            <div className="slider-label-row">
              <label htmlFor="font-size-slider">Font Size</label>
              <span className="slider-value-badge">{fontSize}px</span>
            </div>
            <input
              id="font-size-slider"
              type="range"
              min="24"
              max="120"
              step="4"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="heist-range-slider"
            />
          </div>
        </section>

        {/* 4. LIVE PREVIEW & ACTION */}
        <section className="typography-section live-preview-section">
          <span className="sublabel">Map Preview:</span>
          <div className="typography-live-preview-box">
            <div
              className="preview-rendered-text"
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
            className="add-text-to-canvas-btn"
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
