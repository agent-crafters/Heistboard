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
  importStickerToCanvas,
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
  | "gta-edits";

export interface UnlayerNativeToolMeta {
  key: string;
  name: string;
  icon: string;
  badge: string;
  tacticalRole: string;
  fieldTip: string;
  color: string;
}

export const UNLAYER_8_TOOLS: UnlayerNativeToolMeta[] = [
  {
    key: "filter",
    name: "Filter",
    icon: "⚙️",
    badge: "SURVEILLANCE",
    tacticalRole: "Tonal & Sensor Grading",
    fieldTip: "Surveillance Sensor: Use Night-Vision or High-Contrast Monochromatic filters to emphasize road grids and building perimeters.",
    color: "#a855f7",
  },
  {
    key: "crop",
    name: "Crop",
    icon: "📐",
    badge: "AO SECTOR",
    tacticalRole: "Area of Operation Focus",
    fieldTip: "Sector Focus: Crop the map to isolate your immediate 500m target zone and eliminate irrelevant outer streets.",
    color: "#3b82f6",
  },
  {
    key: "resize",
    name: "Resize",
    icon: "📏",
    badge: "GRID SCALE",
    tacticalRole: "Resolution & Map Matrix",
    fieldTip: "Resolution Calibration: Standardize canvas dimensions to ensure razor-sharp vector export across 2K and 4K dossiers.",
    color: "#06b6d4",
  },
  {
    key: "draw",
    name: "Draw",
    icon: "✏️",
    badge: "ROUTE TRACER",
    tacticalRole: "Ingress & Egress Paths",
    fieldTip: "Vector Paths: Draw solid green lines for infiltration, cyan for escape route, and dashed red for emergency extraction.",
    color: "#10b981",
  },
  {
    key: "text",
    name: "Text",
    icon: "🔤",
    badge: "INTEL CALLOUT",
    tacticalRole: "Timestamps & POI Labels",
    fieldTip: "Intel Callouts: Stamp entry timestamps (e.g. 03:45 AM), radio frequencies, checkpoint codes, and safehouse addresses.",
    color: "#f59e0b",
  },
  {
    key: "shapes",
    name: "Shapes",
    icon: "🔺",
    badge: "CORDON FENCE",
    tacticalRole: "Security Zones & Sightlines",
    fieldTip: "Perimeter Geo-Fencing: Draw translucent red boxes for guard patrol zones, circles for radar radius, and arrows for approach vectors.",
    color: "#ef4444",
  },
  {
    key: "stickers",
    name: "Stickers",
    icon: "😀",
    badge: "FIELD MARKERS",
    tacticalRole: "Tactical Pins & Waypoints",
    fieldTip: "Field Waypoints: Drop caution triangles, directional arrows, and point-of-interest symbols onto critical choke points.",
    color: "#ec4899",
  },
  {
    key: "frame",
    name: "Frame",
    icon: "🖼️",
    badge: "DOSSIER SEAL",
    tacticalRole: "Recon Viewfinder Border",
    fieldTip: "Classified Border: Seal your tactical map within a surveillance camera viewfinder border or retro vignette border.",
    color: "#8b5cf6",
  },
];

const ALPHA_ENTRY_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60">
  <rect x="2" y="2" width="156" height="56" rx="8" fill="#062e1c" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4 2"/>
  <circle cx="28" cy="30" r="16" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
  <circle cx="28" cy="30" r="5" fill="#10b981"/>
  <line x1="28" y1="8" x2="28" y2="52" stroke="#10b981" stroke-width="1.5"/>
  <line x1="6" y1="30" x2="50" y2="30" stroke="#10b981" stroke-width="1.5"/>
  <text x="54" y="26" fill="#10b981" font-family="monospace" font-size="11" font-weight="900" letter-spacing="1">ALPHA ENTRY</text>
  <text x="54" y="42" fill="#a7f3d0" font-family="sans-serif" font-size="9" font-weight="600">INFILTRATION 03:00</text>
</svg>
`);

const VAULT_TARGET_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="170" height="60" viewBox="0 0 170 60">
  <rect x="2" y="2" width="166" height="56" rx="8" fill="#2d2204" stroke="#ffd000" stroke-width="2.5"/>
  <polygon points="28,14 44,30 28,46 12,30" fill="#ffd000" fill-opacity="0.25" stroke="#ffd000" stroke-width="2"/>
  <circle cx="28" cy="30" r="4" fill="#ffd000"/>
  <text x="52" y="26" fill="#ffd000" font-family="monospace" font-size="11" font-weight="900" letter-spacing="1">PRIMARY VAULT</text>
  <text x="52" y="42" fill="#fde68a" font-family="sans-serif" font-size="9" font-weight="600">HIGH-VALUE TARGET</text>
</svg>
`);

const OMEGA_EXIT_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="170" height="60" viewBox="0 0 170 60">
  <rect x="2" y="2" width="166" height="56" rx="8" fill="#042728" stroke="#00f5d4" stroke-width="2.5" stroke-dasharray="6 3"/>
  <path d="M28,12 L42,19 L42,33 C42,42 28,49 28,49 C28,49 14,42 14,33 L14,19 Z" fill="#00f5d4" fill-opacity="0.2" stroke="#00f5d4" stroke-width="2"/>
  <polygon points="28,21 34,31 22,31" fill="#00f5d4"/>
  <text x="52" y="26" fill="#00f5d4" font-family="monospace" font-size="11" font-weight="900" letter-spacing="1">OMEGA EXIT</text>
  <text x="52" y="42" fill="#99f6e4" font-family="sans-serif" font-size="9" font-weight="600">EVACUATION CORRIDOR</text>
</svg>
`);

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

  const [activeNativeToolKey, setActiveNativeToolKey] = useState<string | null>("draw");
  const [hoveredNativeToolKey, setHoveredNativeToolKey] = useState<string | null>(null);
  const [usedNativeTools, setUsedNativeTools] = useState<Set<string>>(new Set(["draw"]));
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [blueprintStatus, setBlueprintStatus] = useState<string | null>(null);

  const triggerNativeTool = useCallback((toolKey: string) => {
    if (!containerRef.current) return;
    setIsGtaEditsOpen(false);
    setActiveGtaTool(null);

    const targetBtn = containerRef.current.querySelector<HTMLButtonElement>(
      `button[data-testid="native-tool-${toolKey}"]`,
    );
    if (targetBtn) {
      targetBtn.click();
      setActiveNativeToolKey(toolKey);
      setUsedNativeTools((prev) => {
        const next = new Set(prev);
        next.add(toolKey);
        return next;
      });
    }
  }, []);

  const handleStampBlueprint = useCallback(async () => {
    if (!containerRef.current) return;
    const canvas = findFabricCanvas(containerRef.current);
    if (!canvas) {
      setBlueprintStatus("Canvas initializing, please wait…");
      return;
    }

    setBlueprintStatus("Deploying Alpha, Vault, and Omega tactical nodes…");
    const canvasW = canvas.getWidth();
    const canvasH = canvas.getHeight();

    await importStickerToCanvas(ALPHA_ENTRY_SVG, {
      position: { x: Math.round(canvasW * 0.22), y: Math.round(canvasH * 0.28) },
      scale: 0.8,
      rootElement: containerRef.current,
    });

    await importStickerToCanvas(VAULT_TARGET_SVG, {
      position: { x: Math.round(canvasW * 0.5), y: Math.round(canvasH * 0.48) },
      scale: 0.85,
      rootElement: containerRef.current,
    });

    await importStickerToCanvas(OMEGA_EXIT_SVG, {
      position: { x: Math.round(canvasW * 0.8), y: Math.round(canvasH * 0.72) },
      scale: 0.8,
      rootElement: containerRef.current,
    });

    setUsedNativeTools((prev) => {
      const next = new Set(prev);
      next.add("stickers");
      return next;
    });

    setTimeout(() => {
      triggerNativeTool("draw");
      setBlueprintStatus(
        "✓ Blueprint deployed! Draw your infiltration route from Alpha to Vault, and extraction to Omega!",
      );
    }, 600);

    setTimeout(() => {
      setBlueprintStatus(null);
    }, 8000);
  }, [triggerNativeTool]);

  // Observe active tool on native Unlayer rail
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkActiveNativeTool = () => {
      for (const tool of UNLAYER_8_TOOLS) {
        const btn = container.querySelector<HTMLButtonElement>(
          `button[data-testid="native-tool-${tool.key}"]`,
        );
        if (
          btn &&
          (btn.classList.contains("active") ||
            btn.getAttribute("aria-pressed") === "true")
        ) {
          setActiveNativeToolKey(tool.key);
          setUsedNativeTools((prev) => {
            if (prev.has(tool.key)) return prev;
            const next = new Set(prev);
            next.add(tool.key);
            return next;
          });
          return;
        }
      }
    };

    const observer = new MutationObserver(checkActiveNativeTool);
    observer.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
    });

    return () => observer.disconnect();
  }, []);

  const openIdentityDrawer = useCallback(() => {
    const canvas = findFabricCanvas(containerRef.current);
    if (canvas && (canvas as unknown as { isDrawingMode?: boolean }).isDrawingMode) {
      (canvas as unknown as { isDrawingMode: boolean }).isDrawingMode = false;
    }
    setIsGtaEditsOpen(true);
    setActiveGtaTool("identity");
    setActiveNativeToolKey(null);
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
          "native-tool-gta-edits-btn flex flex-col items-center gap-1 px-1 py-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors duration-200 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white";
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

  const activeOrHoveredKey = hoveredNativeToolKey || activeNativeToolKey;
  const displayedToolMeta =
    UNLAYER_8_TOOLS.find((t) => t.key === activeOrHoveredKey) || null;

  return (
    <div ref={containerRef} className="mission-editor-wrapper">
      {/* Unlayer 8-Tool Tactical Playbook & Command Bar */}
      <div className="unlayer-tactical-playbook-bar" role="region" aria-label="Unlayer 8-Tool Playbook">
        <div className="playbook-top-row">
          <div className="playbook-brand-badge">
            <span className="brand-dot" />
            <span className="brand-name">UNLAYER 8-TOOL PROTOCOL</span>
          </div>

          <div
            className="playbook-chips-scroll"
            role="toolbar"
            aria-label="Unlayer 8 Native Tools"
          >
            {UNLAYER_8_TOOLS.map((tool) => {
              const isActive = activeNativeToolKey === tool.key;
              const isUsed = usedNativeTools.has(tool.key);
              return (
                <button
                  key={tool.key}
                  type="button"
                  className={`playbook-tool-chip ${isActive ? "active" : ""} ${isUsed ? "used" : ""}`}
                  onClick={() => triggerNativeTool(tool.key)}
                  onMouseEnter={() => setHoveredNativeToolKey(tool.key)}
                  onMouseLeave={() => setHoveredNativeToolKey(null)}
                  title={`${tool.name} (${tool.tacticalRole}): Click to open native Unlayer tool`}
                >
                  <span className="chip-icon">{tool.icon}</span>
                  <span className="chip-name">{tool.name}</span>
                  {isUsed && (
                    <span className="chip-check" title="Mastered in this plan">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="playbook-actions">
            <button
              type="button"
              className="playbook-blueprint-btn"
              onClick={() => void handleStampBlueprint()}
              title="Stamp Alpha Ingress, Target Vault, and Omega Egress waypoint nodes onto map"
            >
              <span>⚡ Blueprint Waypoints</span>
            </button>

            <button
              type="button"
              className={`playbook-checklist-btn ${showChecklist ? "active" : ""}`}
              onClick={() => setShowChecklist((prev) => !prev)}
              title="Toggle 8-Tool Mission Readiness Checklist"
            >
              <span className="checklist-ratio">
                {usedNativeTools.size}/8 Tools
              </span>
              <span className="checklist-arrow">{showChecklist ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Field Protocol Tip */}
        <div className="playbook-tip-row">
          <div className="playbook-tip-content">
            <span className="tip-badge">
              {displayedToolMeta
                ? `INTEL // ${displayedToolMeta.name.toUpperCase()}`
                : "DIRECTIVE"}
            </span>
            <span className="tip-text">
              {displayedToolMeta
                ? displayedToolMeta.fieldTip
                : "Select any of Unlayer's 8 native tools to grade surveillance filters, crop sectors, draw ingress routes, fence security cordons, drop markers, and seal frames."}
            </span>
          </div>
          {blueprintStatus && (
            <div className="blueprint-status-pill">
              {blueprintStatus}
            </div>
          )}
        </div>

        {/* Collapsible 8-Tool Mission Readiness Checklist Popover */}
        {showChecklist && (
          <div className="playbook-checklist-popover" role="dialog" aria-label="Mission Readiness Checklist">
            <div className="checklist-popover-header">
              <span className="header-title">
                Tactical Mission Readiness (8 Native Unlayer Tools)
              </span>
              <span className="header-score">
                {Math.round((usedNativeTools.size / 8) * 100)}% Mastered
              </span>
            </div>
            <div className="checklist-grid">
              {UNLAYER_8_TOOLS.map((t) => {
                const isChecked = usedNativeTools.has(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`checklist-item ${isChecked ? "checked" : ""}`}
                    onClick={() => {
                      triggerNativeTool(t.key);
                      setShowChecklist(false);
                    }}
                  >
                    <span className="item-checkbox">
                      {isChecked ? "☑" : "☐"}
                    </span>
                    <span className="item-icon">{t.icon}</span>
                    <div className="item-details">
                      <span className="item-title">
                        {t.name}: {t.tacticalRole}
                      </span>
                      <span className="item-tip">
                        {t.fieldTip.slice(0, 68)}…
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.2"/>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>BG Styles</span>
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
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(255,208,0,0.2)"/>
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
                    <circle cx="12" cy="12" r="9" fill="rgba(0,245,212,0.2)"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
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
                    <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(255,128,0,0.2)"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
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
