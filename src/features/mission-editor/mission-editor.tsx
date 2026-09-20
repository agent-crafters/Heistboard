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
        crop: true,
        resize: true,
        filter: true,
        draw: true,
        text: true,
        shapes: true,
        stickers: true,
        frame: true,
      },
    },
  },
};

export type CustomEditorTool =
  | "identity"
  | "stickers"
  | "bg-styles"
  | "gta-fonts"
interface MissionEditorProps {
  image: string;
  retryKey: number;
  onLoad: (editor: ImageEditorInstance) => void;
  onSave: (result: ImageEditorSaveResult) => void;
  onCancel: () => void;
  onImageError?: () => void;
  onEditorError?: (error: Error) => void;
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
  const [isGtaEditsOpen, setIsGtaEditsOpen] = useState(false);
  const [activeGtaTool, setActiveGtaTool] = useState<
    "display" | "identity" | "stickers" | "bg-styles" | null
  >(null);

  const openIdentityDrawer = useCallback(() => {
    const canvas = findFabricCanvas(containerRef.current);
    if (canvas && (canvas as unknown as { isDrawingMode?: boolean }).isDrawingMode) {
      (canvas as unknown as { isDrawingMode: boolean }).isDrawingMode = false;
    }
    setIsGtaEditsOpen(true);
    setActiveGtaTool("identity");
  }, []);

  // Handle programmatic tool open requests (e.g. clicking "Edit" in mission briefing or preview)
  useEffect(() => {
    if (!requestedTool) return;
    queueMicrotask(() => {
      if (requestedTool === "identity") {
        openIdentityDrawer();
      } else if (requestedTool === "stickers") {
        setIsGtaEditsOpen(true);
        setActiveGtaTool("stickers");
      } else if (requestedTool === "bg-styles") {
        setIsGtaEditsOpen(true);
        setActiveGtaTool("bg-styles");
      } else if (requestedTool === "gta-fonts") {
        setIsGtaEditsOpen(true);
        setActiveGtaTool("display");
      } else if (requestedTool === "gta-edits") {
        setIsGtaEditsOpen(true);
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

  // Trigger canvas fit-to-screen recalculation when GTA Edits drawer opens or closes
  useEffect(() => {
    const triggerResize = () => {
      window.dispatchEvent(new Event("resize"));
    };
    triggerResize();
    const t1 = setTimeout(triggerResize, 60);
    const t2 = setTimeout(triggerResize, 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isGtaEditsOpen]);

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

    const disableCanvasDrawing = () => {
      const canvas = findFabricCanvas(containerRef.current);
      if (canvas && (canvas as unknown as { isDrawingMode?: boolean }).isDrawingMode) {
        (canvas as unknown as { isDrawingMode: boolean }).isDrawingMode = false;
      }
    };

    const attachCustomToolButtons = () => {
      if (!containerRef.current) return;

      // Find tool rail via Frame button (the 8th native tool) or fallback
      const frameBtn = containerRef.current.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-frame"]',
      );
      const anyNativeBtn = containerRef.current.querySelector<HTMLButtonElement>(
        'button[data-testid^="native-tool-"]',
      );
      const toolRail = frameBtn?.parentElement || anyNativeBtn?.parentElement;
      if (!toolRail) return;

      // Clean up any legacy custom buttons or groups that were placed between native tools 1-8
      const legacyTestIds = [
        "native-tool-gta-fonts",
        "native-tool-operative-identity",
        "native-tool-tactical-stickers",
        "native-tool-bg-styles",
        "native-tool-gta-vi-group",
      ];
      legacyTestIds.forEach((id) => {
        const legacyEl = toolRail.querySelector(`[data-testid="${id}"]`);
        if (legacyEl) {
          legacyEl.remove();
        }
      });

      // Inject GTA Edits button as the 9th tool (immediately after tool 8 Frame)
      let gtaEditsBtn = toolRail.querySelector<HTMLButtonElement>(
        'button[data-testid="native-tool-gta-edits"]',
      );

      if (!gtaEditsBtn) {
        gtaEditsBtn = document.createElement("button");
        gtaEditsBtn.type = "button";
        gtaEditsBtn.setAttribute("data-testid", "native-tool-gta-edits");
        gtaEditsBtn.setAttribute("aria-label", "GTA Edits");
        gtaEditsBtn.className =
          "native-tool-gta-edits-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-150 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white active:scale-[0.96]";
        gtaEditsBtn.title = "GTA Edits (GTA-VI Inspired Tools)";
        gtaEditsBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(255,208,0,0.25)"/>
          </svg>
          <span class="truncate max-w-full" style="font-family: var(--font-sans), sans-serif; font-size: 9px; font-weight: 800; letter-spacing: 0.03em; color: #ffd000; line-height: 1.1;">GTA Edits</span>
        `;

        gtaEditsBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          disableCanvasDrawing();
          const nativeCloseBtn = containerRef.current?.querySelector<HTMLButtonElement>(
            'button[data-testid="native-tool-options-close"]',
          );
          if (nativeCloseBtn) {
            nativeCloseBtn.click();
          }
          setIsGtaEditsOpen((prev) => !prev);
        };

        if (frameBtn) {
          frameBtn.after(gtaEditsBtn);
        } else {
          toolRail.appendChild(gtaEditsBtn);
        }
      }

      // Keep native tool rail width updated for seamless drawer docking
      if (containerRef.current) {
        const railRect = toolRail.getBoundingClientRect();
        if (railRect.width > 0) {
          containerRef.current.style.setProperty(
            "--native-tool-rail-width",
            `${Math.round(railRect.width)}px`,
          );
        }
      }

      // Close custom panels when any of the 8 native tools is clicked
      const nativeToolBtns = toolRail.querySelectorAll<HTMLButtonElement>(
        [
          "filter",
          "crop",
          "resize",
          "draw",
          "text",
          "shapes",
          "stickers",
          "frame",
        ]
          .map((tool) => `button[data-testid="native-tool-${tool}"]`)
          .join(", "),
      );

      nativeToolBtns.forEach((btn) => {
        if (!btn.getAttribute("data-custom-tool-listener")) {
          btn.setAttribute("data-custom-tool-listener", "true");
          btn.addEventListener("click", () => {
            setIsGtaEditsOpen(false);
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

  // Synchronize active state styling and aria-pressed on the injected GTA Edits button
  useEffect(() => {
    if (!containerRef.current) return;
    const btn = containerRef.current.querySelector<HTMLButtonElement>(
      'button[data-testid="native-tool-gta-edits"]',
    );
    if (btn) {
      btn.setAttribute("aria-pressed", String(isGtaEditsOpen));
      if (isGtaEditsOpen) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  }, [isGtaEditsOpen]);

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

    // Automatically trigger fit to screen once full layout settles so map fills the screen
    const triggerFit = () => {
      const fitBtn = containerRef.current?.querySelector<HTMLButtonElement>(
        'button[title*="Fit"], button[title*="screen"], button[title*="pantalla"], button[title*="anpassen"], button[title*="Adatta"], button[title*="Ajustar"]'
      );
      fitBtn?.click();
    };
    requestAnimationFrame(triggerFit);
    setTimeout(triggerFit, 150);
    setTimeout(triggerFit, 500);

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
    <div
      ref={containerRef}
      className={`mission-editor-wrapper ${isGtaEditsOpen ? "gta-edits-drawer-open" : ""}`}
    >
      {/* Docked GTA Edits Drawer (Opens at 9th tool click) */}
      {isGtaEditsOpen && (
        <div
          className="editor-gta-edits-panel-overlay"
          aria-label="GTA Edits Command Panel"
        >
          {/* Header */}
          <div className="editor-gta-edits-panel-header">
            <div className="flex items-center gap-2">
              <span className="panel-badge">★ GTA-VI</span>
              <span className="panel-title">
                {activeGtaTool === "display"
                  ? "Display Fonts"
                  : activeGtaTool === "identity"
                    ? "Operative Identity"
                    : activeGtaTool === "stickers"
                      ? "Tactical Stickers"
                      : activeGtaTool === "bg-styles"
                        ? "BG Layer & Styles"
                        : "GTA Edits"}
              </span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => {
                setIsGtaEditsOpen(false);
                setActiveGtaTool(null);
              }}
              title="Close GTA Edits"
            >
              ✕
            </button>
          </div>

          {/* 4-Tool Quick Navigation Tabs */}
          <div
            className="gta-edits-subtool-nav"
            role="tablist"
            aria-label="GTA Edits Tools"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeGtaTool === "display"}
              className={`gta-edits-tab-btn ${activeGtaTool === "display" ? "active" : ""}`}
              onClick={() => setActiveGtaTool("display")}
            >
              <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.2" />
              </svg>
              <span>Display</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeGtaTool === "identity"}
              className={`gta-edits-tab-btn ${activeGtaTool === "identity" ? "active" : ""}`}
              onClick={() => setActiveGtaTool("identity")}
            >
              <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
              </svg>
              <span>Identity</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeGtaTool === "stickers"}
              className={`gta-edits-tab-btn ${activeGtaTool === "stickers" ? "active" : ""}`}
              onClick={() => setActiveGtaTool("stickers")}
            >
              <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
              <span>Stickers</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeGtaTool === "bg-styles"}
              className={`gta-edits-tab-btn ${activeGtaTool === "bg-styles" ? "active" : ""}`}
              onClick={() => setActiveGtaTool("bg-styles")}
            >
              <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span>BG</span>
            </button>
          </div>

          {/* Tool Overview (when no specific tool tab is open) */}
          {activeGtaTool === null && (
            <div className="gta-edits-menu-list">
              <div className="text-[11px] font-mono text-gray-400 tracking-wider mb-0.5 px-1 uppercase">
                GTA-VI Inspired Edits // 4 Tools
              </div>

              {/* 1. Display */}
              <button
                type="button"
                className="gta-edits-tool-card tool-card-display"
                onClick={() => setActiveGtaTool("display")}
              >
                <div className="tool-card-icon text-[#ffd000]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(255,208,0,0.2)" />
                  </svg>
                </div>
                <div className="tool-card-info flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="tool-card-title text-sm font-bold text-white">Display</span>
                    <span className="tool-card-tag text-[9.5px] font-mono text-[#ffd000] bg-[#ffd000]/10 px-1.5 py-0.5 rounded border border-[#ffd000]/30 font-bold">FONTS</span>
                  </div>
                  <p className="tool-card-desc text-xs text-gray-400 truncate mt-0.5">Rockstar Display Fonts &amp; Typography</p>
                </div>
                <span className="text-gray-400 font-bold ml-1 text-sm">→</span>
              </button>

              {/* 2. Identity */}
              <button
                type="button"
                className="gta-edits-tool-card tool-card-identity"
                onClick={() => setActiveGtaTool("identity")}
              >
                <div className="tool-card-icon text-[#ff007f]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" fill="rgba(255,0,127,0.2)" />
                  </svg>
                </div>
                <div className="tool-card-info flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="tool-card-title text-sm font-bold text-white">Identity</span>
                    <span className="tool-card-tag text-[9.5px] font-mono text-[#ff007f] bg-[#ff007f]/10 px-1.5 py-0.5 rounded border border-[#ff007f]/30 font-bold">BADGE</span>
                  </div>
                  <p className="tool-card-desc text-xs text-gray-400 truncate mt-0.5">Operative ID Badge, Callsign &amp; Archetype</p>
                </div>
                <span className="text-gray-400 font-bold ml-1 text-sm">→</span>
              </button>

              {/* 3. Stickers */}
              <button
                type="button"
                className="gta-edits-tool-card tool-card-stickers"
                onClick={() => setActiveGtaTool("stickers")}
              >
                <div className="tool-card-icon text-[#00f5d4]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" fill="rgba(0,245,212,0.2)" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <div className="tool-card-info flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="tool-card-title text-sm font-bold text-white">Stickers</span>
                    <span className="tool-card-tag text-[9.5px] font-mono text-[#00f5d4] bg-[#00f5d4]/10 px-1.5 py-0.5 rounded border border-[#00f5d4]/30 font-bold">30 ICONS</span>
                  </div>
                  <p className="tool-card-desc text-xs text-gray-400 truncate mt-0.5">Tactical Markers, Targets &amp; Waypoints</p>
                </div>
                <span className="text-gray-400 font-bold ml-1 text-sm">→</span>
              </button>

              {/* 4. BG Styles */}
              <button
                type="button"
                className="gta-edits-tool-card tool-card-bg-styles"
                onClick={() => setActiveGtaTool("bg-styles")}
              >
                <div className="tool-card-icon text-[#ff8000]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(255,128,0,0.2)" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="tool-card-info flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="tool-card-title text-sm font-bold text-white">BG Styles</span>
                    <span className="tool-card-tag text-[9.5px] font-mono text-[#ff8000] bg-[#ff8000]/10 px-1.5 py-0.5 rounded border border-[#ff8000]/30 font-bold">STYLES</span>
                  </div>
                  <p className="tool-card-desc text-xs text-gray-400 truncate mt-0.5">Atmospheric Color Wash, Grain &amp; Effects</p>
                </div>
                <span className="text-gray-400 font-bold ml-1 text-sm">→</span>
              </button>
            </div>
          )}

          {/* Active Tool Views */}
          {activeGtaTool === "display" && (
            <div className="editor-gta-fonts-panel-scroll">
              <TypographySidebar editorContainerRef={containerRef} compact />
            </div>
          )}

          {activeGtaTool === "identity" && (
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
          )}

          {activeGtaTool === "stickers" && (
            <div className="editor-stickers-panel-scroll">
              <StickerSidebar editorContainerRef={containerRef} />
            </div>
          )}

          {activeGtaTool === "bg-styles" && (
            <div className="editor-bg-styles-panel-scroll">
              <BgLayerControls
                config={bgConfig}
                onChange={handleConfigChange}
                compact
              />
            </div>
          )}
        </div>
      )}

      <ImageEditor
        key={retryKey}
        editorId={`heistboard-mission-editor-${retryKey}`}
        image={image}
        minHeight="100%"
        options={MISSION_TOOL_OPTIONS}
        onLoad={handleEditorLoaded}
        onSave={onSave}
        onCancel={onCancel}
        onLoadError={onImageError}
        onError={onEditorError}
        style={{ width: "100%", height: "100%", flex: 1, background: "#171b1c" }}
      />
    </div>
  );
}
