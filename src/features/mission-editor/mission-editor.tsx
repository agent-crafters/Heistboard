"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorOptions,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";
import {
  DEFAULT_BG_LAYER_CONFIG,
  type BgLayerConfig,
  applyBgLayerToFabricCanvas,
} from "@/lib/bg-layer-processor";
import {
  findFabricCanvas,
  type FabricCanvasLike,
} from "@/lib/sticker-canvas-importer";
import { ensureFontsLoaded, setupNativeFontMenuObserver } from "@/lib/gta-fonts";
import { BgLayerControls } from "./bg-layer-controls";
import { TypographySidebar } from "./typography-sidebar";
import { IdentityControls } from "./identity-controls";
import { StickerSidebar } from "./sticker-sidebar";
import {
  type GtaBadgeOptions,
  FABRIC_IDENTITY_BADGE_TAG,
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

export type CustomEditorTool = "identity" | "stickers" | "bg-styles" | "gta-fonts";

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
  requestedTool?: CustomEditorTool | null;
  onToolHandled?: () => void;
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
  requestedTool,
  onToolHandled,
}: MissionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [isGtaFontsOpen, setIsGtaFontsOpen] = useState(false);
  const [isStickersOpen, setIsStickersOpen] = useState(false);
  const [isBgStylesOpen, setIsBgStylesOpen] = useState(false);
  const openIdentityDrawer = useCallback(() => {
    const canvas = findFabricCanvas(containerRef.current);
    if (canvas && (canvas as unknown as { isDrawingMode?: boolean }).isDrawingMode) {
      (canvas as unknown as { isDrawingMode: boolean }).isDrawingMode = false;
    }
    setIsIdentityOpen(true);
    setIsGtaFontsOpen(false);
    setIsStickersOpen(false);
    setIsBgStylesOpen(false);
  }, []);

  // Handle programmatic tool open requests (e.g. clicking "Edit" in mission briefing or preview)
  useEffect(() => {
    if (!requestedTool) return;
    queueMicrotask(() => {
      if (requestedTool === "identity") {
        openIdentityDrawer();
      } else if (requestedTool === "stickers") {
        setIsStickersOpen(true);
        setIsIdentityOpen(false);
        setIsGtaFontsOpen(false);
        setIsBgStylesOpen(false);
      } else if (requestedTool === "bg-styles") {
        setIsBgStylesOpen(true);
        setIsIdentityOpen(false);
        setIsGtaFontsOpen(false);
        setIsStickersOpen(false);
      } else if (requestedTool === "gta-fonts") {
        setIsGtaFontsOpen(true);
        setIsIdentityOpen(false);
        setIsStickersOpen(false);
        setIsBgStylesOpen(false);
      }
      onToolHandled?.();
    });
  }, [requestedTool, onToolHandled, openIdentityDrawer]);

  // Listen for custom event whenever the identity badge on canvas is clicked or selected
  useEffect(() => {
    const handleOpenIdentity = () => {
      openIdentityDrawer();
    };
    window.addEventListener("heistboard:open-identity-tool", handleOpenIdentity);
    return () => {
      window.removeEventListener("heistboard:open-identity-tool", handleOpenIdentity);
    };
  }, [openIdentityDrawer]);

  // Intercept click & pointerdown on the canvas container to automatically open identity edit drawer when badge is clicked
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCanvasPointer = (e: MouseEvent) => {
      const canvas = findFabricCanvas(container);
      if (!canvas) return;

      const target =
        canvas.findTarget?.(e) ??
        canvas.getActiveObject?.();

      if (
        target &&
        (target as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true
      ) {
        openIdentityDrawer();
      }
    };

    container.addEventListener("click", handleCanvasPointer, true);
    container.addEventListener("pointerdown", handleCanvasPointer, true);

    return () => {
      container.removeEventListener("click", handleCanvasPointer, true);
      container.removeEventListener("pointerdown", handleCanvasPointer, true);
    };
  }, [openIdentityDrawer]);

  // Preload GTA and stylish fonts, observe native font menu, and inject GTA Fonts, Identity, Stickers, and BG Styles
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
        gtaBtn.title = "Tactical Display Fonts";
        gtaBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a338" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(212,163,56,0.25)"/>
          </svg>
          <span class="truncate max-w-full" style="font-family: var(--font-sans), sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: #d4a338; line-height: 1.1;">Display</span>
        `;

        gtaBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          disableCanvasDrawing();
          setIsGtaFontsOpen((prev) => !prev);
          setIsIdentityOpen(false);
          setIsStickersOpen(false);
          setIsBgStylesOpen(false);
        };

        shapesBtn.after(gtaBtn);
      }

      // 2. Inject Operative Identity button right below GTA Fonts
      let identityBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-operative-identity"]',
      );

      if (!identityBtn && gtaBtn) {
        identityBtn = document.createElement("button");
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
          disableCanvasDrawing();
          setIsIdentityOpen((prev) => !prev);
          setIsGtaFontsOpen(false);
          setIsStickersOpen(false);
          setIsBgStylesOpen(false);
        };

        gtaBtn.after(identityBtn);
      }

      // 3. Inject Tactical Stickers button right below Identity
      let stickersBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-tactical-stickers"]',
      );

      if (!stickersBtn && identityBtn) {
        stickersBtn = document.createElement("button");
        stickersBtn.type = "button";
        stickersBtn.setAttribute("data-testid", "native-tool-tactical-stickers");
        stickersBtn.className =
          "native-tool-tactical-stickers-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors duration-200 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white";
        stickersBtn.title = "Tactical Stickers (30 Heist Markers)";
        stickersBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" fill="rgba(0, 240, 255, 0.25)"/>
            <circle cx="12" cy="12" r="3" fill="#00f0ff"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
          <span class="truncate max-w-full" style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; color: #00f0ff; line-height: 1.1;">Stickers</span>
        `;

        stickersBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          disableCanvasDrawing();
          setIsStickersOpen((prev) => !prev);
          setIsIdentityOpen(false);
          setIsGtaFontsOpen(false);
          setIsBgStylesOpen(false);
        };

        identityBtn.after(stickersBtn);
      }

      // 4. Inject BG Layer & Styles button right below Stickers
      let bgStylesBtn = shapesBtn.parentElement.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-bg-styles"]',
      );

      if (!bgStylesBtn && stickersBtn) {
        bgStylesBtn = document.createElement("button");
        bgStylesBtn.type = "button";
        bgStylesBtn.setAttribute("data-testid", "native-tool-bg-styles");
        bgStylesBtn.className =
          "native-tool-bg-styles-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors duration-200 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white";
        bgStylesBtn.title = "Background Layer & GTA VI Styles";
        bgStylesBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff8000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(255, 128, 0, 0.25)"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span class="truncate max-w-full" style="font-size: 9px; font-weight: 700; letter-spacing: 0.02em; color: #ff8000; line-height: 1.1;">BG Styles</span>
        `;

        bgStylesBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          disableCanvasDrawing();
          setIsBgStylesOpen((prev) => !prev);
          setIsIdentityOpen(false);
          setIsGtaFontsOpen(false);
          setIsStickersOpen(false);
        };

        stickersBtn.after(bgStylesBtn);
      }

      // Keep native tool rail width updated for seamless drawer docking
      const railEl = shapesBtn.parentElement;
      if (railEl && containerRef.current) {
        const railRect = railEl.getBoundingClientRect();
        if (railRect.width > 0) {
          containerRef.current.style.setProperty(
            "--native-tool-rail-width",
            `${Math.round(railRect.width)}px`,
          );
        }
      }

      const disableCanvasDrawing = () => {
        const canvas = findFabricCanvas(containerRef.current);
        if (canvas && (canvas as unknown as { isDrawingMode?: boolean }).isDrawingMode) {
          (canvas as unknown as { isDrawingMode: boolean }).isDrawingMode = false;
        }
      };

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
            setIsStickersOpen(false);
            setIsBgStylesOpen(false);
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

  // Synchronize active state styling and aria-pressed on the injected custom tool buttons
  useEffect(() => {
    if (!containerRef.current) return;
    const tools = [
      { id: "native-tool-gta-fonts", active: isGtaFontsOpen },
      { id: "native-tool-operative-identity", active: isIdentityOpen },
      { id: "native-tool-tactical-stickers", active: isStickersOpen },
      { id: "native-tool-bg-styles", active: isBgStylesOpen },
    ];

    for (const { id, active } of tools) {
      const btn = containerRef.current.querySelector<HTMLButtonElement>(
        `button[data-testid="${id}"]`,
      );
      if (btn) {
        btn.setAttribute("aria-pressed", String(active));
        if (active) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    }
  }, [isGtaFontsOpen, isIdentityOpen, isStickersOpen, isBgStylesOpen]);

  const bgConfigRef = useRef(bgConfig);
  useEffect(() => {
    bgConfigRef.current = bgConfig;
  }, [bgConfig]);

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

  return (
    <div ref={containerRef} className="mission-editor-wrapper">
      {/* In-Editor GTA Fonts Panel (Opened right from below Shapes tool) */}
      {isGtaFontsOpen && (
        <div
          className="editor-gta-fonts-panel-overlay"
          aria-label="GTA Fonts Tool Panel"
        >
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

      {/* In-Editor Operative Identity Panel (Opened right from below GTA Fonts tool) */}
      {isIdentityOpen && (
        <div
          className="editor-identity-panel-overlay"
          aria-label="Operative Identity Tool Panel"
        >
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

      {/* In-Editor Tactical Stickers Panel (Opened right from below Identity tool) */}
      {isStickersOpen && (
        <div
          className="editor-stickers-panel-overlay"
          aria-label="Tactical Stickers Tool Panel"
        >
          <div className="editor-stickers-panel-header">
            <div className="flex items-center gap-2">
              <span className="panel-badge">★ 30 STICKERS</span>
              <span className="panel-title">Tactical Stickers</span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => setIsStickersOpen(false)}
              title="Close Tactical Stickers panel"
            >
              ✕
            </button>
          </div>
          <div className="editor-stickers-panel-scroll">
            <StickerSidebar editorContainerRef={containerRef} />
          </div>
        </div>
      )}

      {/* In-Editor BG Layer & GTA VI Styles Panel (Opened right from below Stickers tool) */}
      {isBgStylesOpen && (
        <div
          className="editor-bg-styles-panel-overlay"
          aria-label="Background Layer & GTA VI Styles Tool Panel"
        >
          <div className="editor-bg-styles-panel-header">
            <div className="flex items-center gap-2">
              <span className="panel-badge">★ GTA VI STYLES</span>
              <span className="panel-title">BG Layer &amp; Styles</span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => setIsBgStylesOpen(false)}
              title="Close Background Layer & Styles panel"
            >
              ✕
            </button>
          </div>
          <div className="editor-bg-styles-panel-scroll">
            <BgLayerControls
              config={bgConfig}
              onChange={handleConfigChange}
              compact
            />
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
