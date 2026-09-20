"use client";

import {
  type BgLayerConfig,
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
      className={`flex flex-col h-full bg-charcoal-900/95 border-l border-coral/30 text-paper overflow-hidden select-none ${compact ? "w-full" : ""}`}
      aria-label="Background Layer & GTA VI Styles Controls"
    >
      {/* Header bar */}
      <div className="p-4 border-b border-coral/20 bg-charcoal-850/80 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-petrol/20 text-petrol border border-petrol/40">GTA VI FX</span>
            <h3 className="font-display text-lg tracking-wider text-white uppercase">Background Layer</h3>
          </div>
          <p className="text-xs text-paper-muted leading-tight mt-1">
            Control map blur, gradient atmosphere, and authentic Vice City styles.
          </p>
        </div>

        <button
          type="button"
          className="font-mono text-xs uppercase px-2.5 py-1 rounded bg-charcoal-800 hover:bg-coral/20 text-paper-muted hover:text-coral border border-white/10 hover:border-coral/40 transition-colors cursor-pointer"
          onClick={handleReset}
          title="Reset background layer to default"
        >
          Reset All
        </button>
      </div>

      {/* Quick Status Pill */}
      <div className="px-4 py-2 bg-charcoal-950/80 border-b border-white/5 flex items-center gap-2 text-xs font-mono text-paper-muted overflow-x-auto shrink-0">
        <span>
          <strong className="text-white">Style:</strong> {activeStyle.name}
        </span>
        <span className="text-white/30">·</span>
        <span>
          <strong className="text-white">Blur:</strong> {config.blurEnabled ? `${config.blurRadius}px` : "Off"}
        </span>
        <span className="text-white/30">·</span>
        <span>
          <strong className="text-white">Gradient:</strong>{" "}
          {config.gradientEnabled ? `${Math.round(config.gradientOpacity * 100)}%` : "Off"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. GTA VI STYLES SECTION */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="font-mono text-xs font-bold text-coral">01</span>
            <h4 className="font-display text-sm tracking-wide text-white uppercase">GTA VI Aesthetic Styles</h4>
          </div>
          <p className="text-xs text-paper-muted leading-relaxed">
            Choose iconic visual color gradings tailored for the Vice City &amp; Leonida aesthetic.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {GTA_VI_STYLES.map((style) => {
              const isSelected = config.style === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-charcoal-800 border-petrol shadow-lg shadow-petrol/10"
                      : "bg-charcoal-800/60 border-white/5 hover:border-white/20"
                  }`}
                  onClick={() => updateField("style", style.id)}
                  title={style.tagline}
                >
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${style.previewColors[0]}, ${style.previewColors[1]})`,
                    }}
                  >
                    {isSelected && <span>✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-xs text-white block truncate">{style.name}</strong>
                    <span className="text-[10px] text-paper-muted block truncate">{style.tagline}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {config.style !== "none" && (
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between text-xs font-mono text-paper-muted">
                <label htmlFor="style-intensity-slider">Style Intensity</label>
                <span className="text-petrol font-bold">
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
                className="w-full accent-coral cursor-pointer"
              />
            </div>
          )}
        </section>

        {/* 2. LAYER BLUR CONTROLS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-coral">02</span>
              <h4 className="font-display text-sm tracking-wide text-white uppercase">Layer Blur</h4>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.blurEnabled}
                onChange={(e) => updateField("blurEnabled", e.target.checked)}
                className="sr-only"
              />
              <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${config.blurEnabled ? "bg-coral" : "bg-charcoal-700"}`}>
                <span className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${config.blurEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-paper-muted">
                {config.blurEnabled ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
          <p className="text-xs text-paper-muted leading-relaxed">
            Softens background map detail so tactical routes and mission stickers pop with high clarity.
          </p>

          {config.blurEnabled && (
            <div className="space-y-3 p-3 rounded-lg bg-charcoal-950 border border-white/5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-paper-muted">
                  <label htmlFor="blur-radius-slider">Blur Radius</label>
                  <span className="text-petrol font-bold">{config.blurRadius}px</span>
                </div>
                <input
                  id="blur-radius-slider"
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={config.blurRadius}
                  onChange={(e) => updateField("blurRadius", parseInt(e.target.value, 10))}
                  className="w-full accent-coral cursor-pointer"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BLUR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      config.blurRadius === preset.value
                        ? "bg-petrol text-ink font-bold"
                        : "bg-charcoal-800 text-paper-muted hover:text-white"
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
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-coral">03</span>
              <h4 className="font-display text-sm tracking-wide text-white uppercase">Gradient Overlay</h4>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.gradientEnabled}
                onChange={(e) => updateField("gradientEnabled", e.target.checked)}
                className="sr-only"
              />
              <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${config.gradientEnabled ? "bg-coral" : "bg-charcoal-700"}`}>
                <span className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${config.gradientEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-paper-muted">
                {config.gradientEnabled ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
          <p className="text-xs text-paper-muted leading-relaxed">
            Infuses the background with cinematic sunset gradients and dual-tone neon lighting.
          </p>

          {config.gradientEnabled && (
            <div className="space-y-3 p-3 rounded-lg bg-charcoal-950 border border-white/5">
              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">Atmosphere Preset:</span>
                <div className="flex flex-wrap gap-1.5">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected = config.gradientPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-charcoal-800 border-coral text-white font-bold"
                            : "bg-charcoal-850/80 border-white/5 text-paper-muted hover:text-white"
                        }`}
                        onClick={() => updateField("gradientPreset", preset.id)}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
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
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <label htmlFor="custom-color-1" className="text-[11px] font-mono text-paper-muted block">Neon Accent 1</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="custom-color-1"
                        type="color"
                        value={config.customColor1}
                        onChange={(e) => updateField("customColor1", e.target.value)}
                        className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-white">{config.customColor1}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="custom-color-2" className="text-[11px] font-mono text-paper-muted block">Neon Accent 2</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="custom-color-2"
                        type="color"
                        value={config.customColor2}
                        onChange={(e) => updateField("customColor2", e.target.value)}
                        className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-white">{config.customColor2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Direction buttons */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">Gradient Direction:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {GRADIENT_DIRECTIONS.map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer border ${
                        config.gradientDirection === dir.id
                          ? "bg-coral text-white font-bold border-coral"
                          : "bg-charcoal-850 text-paper-muted border-white/5 hover:text-white"
                      }`}
                      onClick={() => updateField("gradientDirection", dir.id)}
                      title={dir.label}
                    >
                      <span>{dir.icon}</span>
                      <span>{dir.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-paper-muted">
                  <label htmlFor="gradient-opacity-slider">Gradient Opacity</label>
                  <span className="text-petrol font-bold">
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
                  className="w-full accent-coral cursor-pointer"
                />
              </div>

              {/* Blend Mode */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="gradient-blend-select" className="text-[11px] font-mono text-paper-muted uppercase tracking-wider block">
                  Blend Mode:
                </label>
                <select
                  id="gradient-blend-select"
                  value={config.gradientBlendMode}
                  onChange={(e) =>
                    updateField("gradientBlendMode", e.target.value as GradientBlendMode)
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-charcoal-850 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-coral"
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
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="font-mono text-xs font-bold text-coral">04</span>
            <h4 className="font-display text-sm tracking-wide text-white uppercase">Master Layer Transparency</h4>
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-xs font-mono text-paper-muted">
              <label htmlFor="bg-opacity-slider">Base Map Opacity</label>
              <span className="text-petrol font-bold">
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
              className="w-full accent-coral cursor-pointer"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
