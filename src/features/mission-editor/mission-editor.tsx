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
}: MissionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isGtaFontsOpen, setIsGtaFontsOpen] = useState(false);

  // Preload GTA and stylish fonts, observe native font menu, and inject GTA Fonts below Shapes
  useEffect(() => {
    ensureFontsLoaded();
    const disconnectNativeMenu = setupNativeFontMenuObserver(containerRef.current);

    const attachGtaFontsButton = () => {
      if (!containerRef.current) return;
      const shapesBtn = containerRef.current.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-shapes"]',
      );
      if (!shapesBtn || !shapesBtn.parentElement) return;

      const existingBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-gta-fonts"]',
      );

      if (!existingBtn) {
        const gtaBtn = document.createElement("button");
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
        };

        shapesBtn.after(gtaBtn);
      }

      // Close GTA Fonts panel when Draw, Text, or Shapes is clicked
      const nativeToolBtns = shapesBtn.parentElement.querySelectorAll<HTMLButtonElement>(
        'button[data-testid="native-tool-draw"], button[data-testid="native-tool-text"], button[data-testid="native-tool-shapes"]',
      );

      nativeToolBtns.forEach((btn) => {
        if (!btn.getAttribute("data-gta-listener")) {
          btn.setAttribute("data-gta-listener", "true");
          btn.addEventListener("click", () => {
            setIsGtaFontsOpen(false);
          });
        }
      });
    };

    attachGtaFontsButton();

    const observer = new MutationObserver(() => {
      attachGtaFontsButton();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      disconnectNativeMenu();
      observer.disconnect();
    };
  }, []);

  // Synchronize active state styling on the injected GTA Fonts tool button
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
  }, [isGtaFontsOpen]);

  // Cache clean original raster image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      originalImageRef.current = img;

      // Apply initial background layer config if non-default
      const isCustomized =
        bgConfig.style !== "none" ||
        bgConfig.blurEnabled ||
        bgConfig.gradientEnabled ||
        bgConfig.opacity < 1;

      if (isCustomized) {
        const canvas = findFabricCanvas(containerRef.current);
        if (canvas) {
          applyBgLayerToFabricCanvas(canvas, bgConfig, img);
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
      <div className="editor-floating-toolbar" role="toolbar" aria-label="Editor background controls">
        <button
          type="button"
          className={`editor-toolbar-btn ${showDrawer ? "active" : ""}`}
          onClick={() => setShowDrawer((prev) => !prev)}
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
