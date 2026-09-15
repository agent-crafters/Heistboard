"use client";

import { useEffect, useRef, useState } from "react";
import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorOptions,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";
import {
  DEFAULT_BG_LAYER_CONFIG,
  type BgLayerConfig,
  applyBgLayerToFabricCanvas,
  getGtaStyleDefinition,
} from "@/lib/bg-layer-processor";
import { findFabricCanvas, type FabricCanvasLike } from "@/lib/sticker-canvas-importer";
import { ensureFontsLoaded, setupNativeFontMenuObserver } from "@/lib/gta-fonts";
import { BgLayerControls } from "./bg-layer-controls";
import { TypographySidebar } from "./typography-sidebar";
import { IdentityControls } from "./identity-controls";
import {
  type GtaBadgeOptions,
  placeOrUpdateBadgeOnFabricCanvas,
} from "@/lib/gta-identity-badge";
import { type IdentityState } from "@/domain/identity";

const MISSION_TOOL_OPTIONS: ImageEditorOptions = {
  theme: "dark",
  aiAssistantOpenState: "closed",
  features: {
    ai: false,
    imageEditor: {
      enabled: true,
      tools: {
        crop: false,
        resize: false,
        filter: false,
        draw: true,
        text: true,
        shapes: true,
        stickers: false,
        frame: false,
      },
    },
  },
};

interface MissionEditorProps {
  image: string;
  retryKey: number;
  onLoad: (editor: ImageEditorInstance) => void;
  onSave: (result: ImageEditorSaveResult) => void;
  onCancel: () => void;
  onImageError: () => void;
  onEditorError: (error: Error) => void;
  bgConfig?: BgLayerConfig;
  onBgConfigChange?: (config: BgLayerConfig) => void;
  identityOptions?: GtaBadgeOptions;
  onIdentityChange?: (options: GtaBadgeOptions) => void;
  identityState?: IdentityState;
  onIdentityStateChange?: (state: IdentityState) => void;
}

export function MissionEditor({
  image,
  retryKey,
  onLoad,
  onSave,
  onCancel,
  onImageError,
  onEditorError,
  bgConfig = DEFAULT_BG_LAYER_CONFIG,
  onBgConfigChange,
  identityOptions,
  onIdentityChange,
  identityState,
  onIdentityStateChange,
}: MissionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [isGtaFontsOpen, setIsGtaFontsOpen] = useState(false);

  // Preload GTA and stylish fonts, observe native font menu, and inject GTA Fonts & Identity below Shapes
  useEffect(() => {
    ensureFontsLoaded();
    const disconnectNativeMenu = setupNativeFontMenuObserver(containerRef.current);

    const attachCustomToolButtons = () => {
      if (!containerRef.current) return;
      const shapesBtn = containerRef.current.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-shapes"]',
      );
      if (!shapesBtn || !shapesBtn.parentElement) return;

      // 1. Inject GTA Fonts button after Shapes
      let gtaBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-gta-fonts"]',
      );

      if (!gtaBtn) {
        gtaBtn = document.createElement("button");
        gtaBtn.type = "button";
        gtaBtn.setAttribute("data-testid", "native-tool-gta-fonts");
        gtaBtn.className =
          "native-tool-gta-fonts-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors duration-200 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white";
        gtaBtn.title = "Rockstar & GTA Fonts (Pricedown)";
        gtaBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(255,208,0,0.3)"/>
          </svg>
          <span class="truncate max-w-full" style="font-family: 'Pricedown', sans-serif; font-size: 10px; letter-spacing: 0.04em; color: #ffd000; line-height: 1.1;">GTA Fonts</span>
        `;

        gtaBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsGtaFontsOpen((prev) => !prev);
          setIsIdentityOpen(false);
          setShowDrawer(false);
        };

        shapesBtn.after(gtaBtn);
      }

      // 2. Inject Operative Identity button right below GTA Fonts
      const existingIdentityBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-operative-identity"]',
      );

      if (!existingIdentityBtn && gtaBtn) {
        const identityBtn = document.createElement("button");
        identityBtn.type = "button";
        identityBtn.setAttribute("data-testid", "native-tool-operative-identity");
        identityBtn.className =
          "native-tool-operative-identity-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors duration-200 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white";
        identityBtn.title = "Establish Your Operative Identity (GTA VI)";
        identityBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f72585" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" fill="rgba(247,37,133,0.3)" />
          </svg>
          <span class="truncate max-w-full" style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; color: #f72585; line-height: 1.1;">Identity</span>
        `;

        identityBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsIdentityOpen((prev) => !prev);
          setIsGtaFontsOpen(false);
          setShowDrawer(false);
        };

        gtaBtn.after(identityBtn);
      }

      // Close custom panels when Draw, Text, or Shapes is clicked
      const nativeToolBtns = shapesBtn.parentElement.querySelectorAll<HTMLButtonElement>(
        'button[data-testid="native-tool-draw"], button[data-testid="native-tool-text"], button[data-testid="native-tool-shapes"]',
      );

      nativeToolBtns.forEach((btn) => {
        if (!btn.getAttribute("data-custom-tool-listener")) {
          btn.setAttribute("data-custom-tool-listener", "true");
          btn.addEventListener("click", () => {
            setIsGtaFontsOpen(false);
            setIsIdentityOpen(false);
          });
        }
      });
    };

    attachCustomToolButtons();

    const observer = new MutationObserver(() => {
      attachCustomToolButtons();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      disconnectNativeMenu();
      observer.disconnect();
    };
  }, []);

  // Synchronize active state styling on the injected GTA Fonts and Identity buttons
  useEffect(() => {
    if (!containerRef.current) return;
    const gtaBtn = containerRef.current.querySelector<HTMLButtonElement>(
      'button[data-testid="native-tool-gta-fonts"]',
    );
    if (gtaBtn) {
      if (isGtaFontsOpen) {
        gtaBtn.classList.add("active");
      } else {
        gtaBtn.classList.remove("active");
      }
    }

    const identityBtn = containerRef.current.querySelector<HTMLButtonElement>(
      'button[data-testid="native-tool-operative-identity"]',
    );
    if (identityBtn) {
      if (isIdentityOpen) {
        identityBtn.classList.add("active");
      } else {
        identityBtn.classList.remove("active");
      }
    }
  }, [isGtaFontsOpen, isIdentityOpen]);

  const bgConfigRef = useRef(bgConfig);
  bgConfigRef.current = bgConfig;

  // Cache clean original raster image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      originalImageRef.current = img;

      // Apply initial background layer config if non-default
      const currentConfig = bgConfigRef.current;
      const isCustomized =
        currentConfig.style !== "none" ||
        currentConfig.blurEnabled ||
        currentConfig.gradientEnabled ||
        currentConfig.opacity < 1;

      if (isCustomized) {
        const canvas = findFabricCanvas(containerRef.current);
        if (canvas) {
          applyBgLayerToFabricCanvas(canvas, currentConfig, img);
        }
      }
    };
    img.src = image;

    return () => {
      active = false;
      img.onload = null;
    };
  }, [image, retryKey]);

  // Live apply background layer changes to Fabric canvas
  useEffect(() => {
    if (!originalImageRef.current) return;
    const canvas = findFabricCanvas(containerRef.current);
    if (canvas) {
      applyBgLayerToFabricCanvas(canvas, bgConfig, originalImageRef.current);
    }
  }, [bgConfig]);

  const handleEditorLoaded = (editor: ImageEditorInstance) => {
    const canvas = findFabricCanvas(containerRef.current);
    if (canvas) {
      (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike }).__heistboardFabricCanvas = canvas;
      if (originalImageRef.current) {
        applyBgLayerToFabricCanvas(canvas, bgConfig, originalImageRef.current);
      }
      if (identityOptions) {
        void placeOrUpdateBadgeOnFabricCanvas(canvas, identityOptions, "top-left");
      }
    }
    onLoad(editor);
  };

  const handleConfigChange = (newConfig: BgLayerConfig) => {
    if (onBgConfigChange) {
      onBgConfigChange(newConfig);
    }
    if (originalImageRef.current) {
      const canvas = findFabricCanvas(containerRef.current);
      if (canvas) {
        applyBgLayerToFabricCanvas(canvas, newConfig, originalImageRef.current);
      }
    }
  };

  const activeStyleDef = getGtaStyleDefinition(bgConfig.style);

  return (
    <div ref={containerRef} className="mission-editor-wrapper">
      {/* In-Editor Floating GTA VI Toolbar */}
      <div className="editor-floating-toolbar" role="toolbar" aria-label="Editor background and identity controls">
        <button
          type="button"
          className={`editor-toolbar-btn ${showDrawer ? "active" : ""}`}
          onClick={() => {
            setShowDrawer((prev) => !prev);
            setIsIdentityOpen(false);
          }}
          title="Open Background Layer & GTA VI Styles Controls"
        >
          <span className="btn-icon">🎨</span>
          <span className="btn-label">BG Layer &amp; GTA VI Styles</span>
          <span className="btn-badge">
            {activeStyleDef.name}
            {bgConfig.blurEnabled && ` · Blur ${bgConfig.blurRadius}px`}
            {bgConfig.gradientEnabled && " · Gradient On"}
          </span>
        </button>

        <button
          type="button"
          className={`editor-toolbar-btn ${isIdentityOpen ? "active" : ""}`}
          onClick={() => {
            setIsIdentityOpen((prev) => !prev);
            setIsGtaFontsOpen(false);
            setShowDrawer(false);
          }}
          title="Establish Your Operative Identity (GTA VI)"
        >
          <span className="btn-icon">👤</span>
          <span className="btn-label">Operative Identity (GTA VI)</span>
          <span className="btn-badge">
            {identityOptions?.alias || "CIPHER"} · {identityOptions?.wantedStars ?? 5}★
          </span>
        </button>
      </div>

      {/* In-Editor Background Layer Drawer / Popover */}
      {showDrawer && (
        <div className="editor-bg-drawer-overlay">
          <div className="editor-bg-drawer-backdrop" onClick={() => setShowDrawer(false)} />
          <div className="editor-bg-drawer-content">
            <div className="editor-bg-drawer-header">
              <span className="drawer-title">Background Layer &amp; GTA VI Styles</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setShowDrawer(false)}
                title="Close controls"
              >
                ✕
              </button>
            </div>
            <BgLayerControls
              config={bgConfig}
              onChange={handleConfigChange}
              compact
            />
          </div>
        </div>
      )}

      {/* In-Editor Operative Identity Panel (Opened right from below GTA Fonts tool) */}
      {isIdentityOpen && (
        <div className="editor-identity-panel-overlay" aria-label="Operative Identity Tool Panel">
          <div className="editor-identity-panel-header">
            <div className="flex items-center gap-2">
              <span className="panel-badge">★ GTA VI RECORD</span>
              <span className="panel-title">Operative Identity</span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => setIsIdentityOpen(false)}
              title="Close Operative Identity panel"
            >
              ✕
            </button>
          </div>
          <div className="editor-identity-panel-scroll">
            <IdentityControls
              initialOptions={identityOptions}
              identityState={identityState}
              onIdentityStateChange={onIdentityStateChange}
              editorContainerRef={containerRef}
              onChange={onIdentityChange}
              compact
            />
          </div>
        </div>
      )}

      {/* In-Editor GTA Fonts Panel (Opened right from below Shapes tool) */}
      {isGtaFontsOpen && (
        <div className="editor-gta-fonts-panel-overlay" aria-label="GTA Fonts Tool Panel">
          <div className="editor-gta-fonts-panel-header">
            <div className="flex items-center gap-2">
              <span className="panel-badge">★ ROCKSTAR</span>
              <span className="panel-title">GTA Fonts &amp; Typography</span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => setIsGtaFontsOpen(false)}
              title="Close GTA Fonts panel"
            >
              ✕
            </button>
          </div>
          <div className="editor-gta-fonts-panel-scroll">
            <TypographySidebar editorContainerRef={containerRef} compact />
          </div>
        </div>
      )}

      <ImageEditor
        key={retryKey}
        editorId={`heistboard-mission-editor-${retryKey}`}
        image={image}
        minHeight="min(680px, 72vh)"
        options={MISSION_TOOL_OPTIONS}
        onLoad={handleEditorLoaded}
        onSave={onSave}
        onCancel={onCancel}
        onLoadError={onImageError}
        onError={onEditorError}
        style={{ width: "100%", background: "#171b1c" }}
      />
    </div>
  );
}
