"use client";

import {
  type BgLayerConfig,
  type GtaStyleId,
  type GradientPresetId,
  type GradientDirection,
  type GradientBlendMode,
  GTA_VI_STYLES,
  GRADIENT_PRESETS,
  DEFAULT_BG_LAYER_CONFIG,
} from "@/lib/bg-layer-processor";

interface BgLayerControlsProps {
  config: BgLayerConfig;
  onChange: (newConfig: BgLayerConfig) => void;
  compact?: boolean;
}

const BLUR_PRESETS: Array<{ label: string; value: number }> = [
  { label: "Subtle (4px)", value: 4 },
  { label: "Tactical (8px)", value: 8 },
  { label: "Heavy (16px)", value: 16 },
  { label: "Bokeh (24px)", value: 24 },
];

const GRADIENT_DIRECTIONS: Array<{ id: GradientDirection; label: string; icon: string }> = [
  { id: "to-bottom", label: "Top to Bottom", icon: "↓" },
  { id: "to-top", label: "Bottom to Top", icon: "↑" },
  { id: "to-bottom-right", label: "Diagonal", icon: "↘" },
  { id: "radial-vignette", label: "Vignette", icon: "◉" },
];

const BLEND_MODES: Array<{ id: GradientBlendMode; label: string }> = [
  { id: "overlay", label: "Overlay (Punchy)" },
  { id: "soft-light", label: "Soft Light (Smooth)" },
  { id: "multiply", label: "Multiply (Moody)" },
  { id: "screen", label: "Screen (Luminous)" },
  { id: "source-over", label: "Normal (Solid)" },
];

export function BgLayerControls({
  config,
  onChange,
  compact = false,
}: BgLayerControlsProps) {
  const updateField = <K extends keyof BgLayerConfig>(
    key: K,
    value: BgLayerConfig[K],
  ) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_BG_LAYER_CONFIG });
  };

  const activeStyle = GTA_VI_STYLES.find((s) => s.id === config.style) ?? GTA_VI_STYLES[0];

  return (
    <div
      className={`bg-layer-controls-panel ${compact ? "compact" : ""}`}
      aria-label="Background Layer & GTA VI Styles Controls"
    >
      {/* Header bar */}
      <div className="bg-layer-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-layer-gta-badge">GTA VI FX</span>
            <h3 className="bg-layer-title">Background Layer</h3>
          </div>
          <p className="bg-layer-subtitle">
            Control map blur, gradient atmosphere, and authentic Vice City styles.
          </p>
        </div>

        <button
          type="button"
          className="bg-layer-reset-btn"
          onClick={handleReset}
          title="Reset background layer to default"
        >
          Reset All
        </button>
      </div>

      {/* Quick Status Pill */}
      <div className="bg-layer-status-pill">
        <span className="status-item">
          <strong>Style:</strong> {activeStyle.name}
        </span>
        <span className="status-separator">·</span>
        <span className="status-item">
          <strong>Blur:</strong> {config.blurEnabled ? `${config.blurRadius}px` : "Off"}
        </span>
        <span className="status-separator">·</span>
        <span className="status-item">
          <strong>Gradient:</strong>{" "}
          {config.gradientEnabled ? `${Math.round(config.gradientOpacity * 100)}%` : "Off"}
        </span>
      </div>

      <div className="bg-layer-scroll-body">
        {/* 1. GTA VI STYLES SECTION */}
        <section className="bg-layer-section">
          <div className="section-header-row">
            <span className="section-number">01</span>
            <h4>GTA VI Aesthetic Styles</h4>
          </div>
          <p className="section-description">
            Choose iconic visual color gradings tailored for the Vice City &amp; Leonida aesthetic.
          </p>

          <div className="gta-styles-grid">
            {GTA_VI_STYLES.map((style) => {
              const isSelected = config.style === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`gta-style-card ${isSelected ? "active" : ""}`}
                  onClick={() => updateField("style", style.id)}
                  title={style.tagline}
                >
                  <div
                    className="style-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${style.previewColors[0]}, ${style.previewColors[1]})`,
                    }}
                  >
                    {isSelected && <span className="style-check-mark">✓</span>}
                  </div>
                  <div className="style-card-info">
                    <strong className="style-card-name">{style.name}</strong>
                    <span className="style-card-tagline">{style.tagline}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {config.style !== "none" && (
            <div className="control-slider-group mt-3">
              <div className="slider-label-row">
                <label htmlFor="style-intensity-slider">Style Intensity</label>
                <span className="slider-value-badge">
                  {Math.round(config.styleIntensity * 100)}%
                </span>
              </div>
              <input
                id="style-intensity-slider"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={config.styleIntensity}
                onChange={(e) => updateField("styleIntensity", parseFloat(e.target.value))}
                className="heist-range-slider"
              />
            </div>
          )}
        </section>

        {/* 2. LAYER BLUR CONTROLS */}
        <section className="bg-layer-section">
          <div className="section-header-row flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="section-number">02</span>
              <h4>Layer Blur</h4>
            </div>

            <label className="toggle-switch-wrapper">
              <input
                type="checkbox"
                checked={config.blurEnabled}
                onChange={(e) => updateField("blurEnabled", e.target.checked)}
                className="sr-only"
              />
              <span className={`toggle-track ${config.blurEnabled ? "active" : ""}`}>
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label-text">
                {config.blurEnabled ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
          <p className="section-description">
            Softens background map detail so tactical routes and mission stickers pop with high clarity.
          </p>

          {config.blurEnabled && (
            <div className="blur-controls-container">
              <div className="control-slider-group">
                <div className="slider-label-row">
                  <label htmlFor="blur-radius-slider">Blur Radius</label>
                  <span className="slider-value-badge">{config.blurRadius}px</span>
                </div>
                <input
                  id="blur-radius-slider"
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={config.blurRadius}
                  onChange={(e) => updateField("blurRadius", parseInt(e.target.value, 10))}
                  className="heist-range-slider"
                />
              </div>

              <div className="blur-quick-presets">
                {BLUR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`blur-preset-chip ${
                      config.blurRadius === preset.value ? "active" : ""
                    }`}
                    onClick={() => updateField("blurRadius", preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. GRADIENT OVERLAY CONTROLS */}
        <section className="bg-layer-section">
          <div className="section-header-row flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="section-number">03</span>
              <h4>Gradient Overlay</h4>
            </div>

            <label className="toggle-switch-wrapper">
              <input
                type="checkbox"
                checked={config.gradientEnabled}
                onChange={(e) => updateField("gradientEnabled", e.target.checked)}
                className="sr-only"
              />
              <span className={`toggle-track ${config.gradientEnabled ? "active" : ""}`}>
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label-text">
                {config.gradientEnabled ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
          <p className="section-description">
            Infuses the background with cinematic sunset gradients and dual-tone neon lighting.
          </p>

          {config.gradientEnabled && (
            <div className="gradient-controls-container">
              {/* Presets */}
              <div className="gradient-presets-row">
                <span className="sublabel">Atmosphere Preset:</span>
                <div className="gradient-preset-chips">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected = config.gradientPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`gradient-preset-btn ${isSelected ? "active" : ""}`}
                        onClick={() => updateField("gradientPreset", preset.id)}
                      >
                        <span
                          className="gradient-swatch-dot"
                          style={{
                            background: `linear-gradient(135deg, ${preset.previewColors[0]}, ${preset.previewColors[1]})`,
                          }}
                        />
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Colors (if custom selected) */}
              {config.gradientPreset === "custom" && (
                <div className="custom-color-pickers-row">
                  <div className="color-picker-block">
                    <label htmlFor="custom-color-1">Neon Accent 1</label>
                    <div className="color-input-wrapper">
                      <input
                        id="custom-color-1"
                        type="color"
                        value={config.customColor1}
                        onChange={(e) => updateField("customColor1", e.target.value)}
                        className="color-input-box"
                      />
                      <span className="color-hex-text">{config.customColor1}</span>
                    </div>
                  </div>

                  <div className="color-picker-block">
                    <label htmlFor="custom-color-2">Neon Accent 2</label>
                    <div className="color-input-wrapper">
                      <input
                        id="custom-color-2"
                        type="color"
                        value={config.customColor2}
                        onChange={(e) => updateField("customColor2", e.target.value)}
                        className="color-input-box"
                      />
                      <span className="color-hex-text">{config.customColor2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Direction buttons */}
              <div className="gradient-direction-row">
                <span className="sublabel">Gradient Direction:</span>
                <div className="direction-btn-group">
                  {GRADIENT_DIRECTIONS.map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      className={`direction-btn ${
                        config.gradientDirection === dir.id ? "active" : ""
                      }`}
                      onClick={() => updateField("gradientDirection", dir.id)}
                      title={dir.label}
                    >
                      <span className="direction-icon">{dir.icon}</span>
                      <span className="direction-label">{dir.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="control-slider-group">
                <div className="slider-label-row">
                  <label htmlFor="gradient-opacity-slider">Gradient Opacity</label>
                  <span className="slider-value-badge">
                    {Math.round(config.gradientOpacity * 100)}%
                  </span>
                </div>
                <input
                  id="gradient-opacity-slider"
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={config.gradientOpacity}
                  onChange={(e) => updateField("gradientOpacity", parseFloat(e.target.value))}
                  className="heist-range-slider"
                />
              </div>

              {/* Blend Mode */}
              <div className="control-select-group">
                <label htmlFor="gradient-blend-select" className="sublabel">
                  Blend Mode:
                </label>
                <select
                  id="gradient-blend-select"
                  value={config.gradientBlendMode}
                  onChange={(e) =>
                    updateField("gradientBlendMode", e.target.value as GradientBlendMode)
                  }
                  className="heist-select"
                >
                  {BLEND_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* 4. MASTER BG LAYER OPACITY */}
        <section className="bg-layer-section">
          <div className="section-header-row">
            <span className="section-number">04</span>
            <h4>Master Layer Transparency</h4>
          </div>
          <div className="control-slider-group mt-2">
            <div className="slider-label-row">
              <label htmlFor="bg-opacity-slider">Base Map Opacity</label>
              <span className="slider-value-badge">
                {Math.round(config.opacity * 100)}%
              </span>
            </div>
            <input
              id="bg-opacity-slider"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={config.opacity}
              onChange={(e) => updateField("opacity", parseFloat(e.target.value))}
              className="heist-range-slider"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
