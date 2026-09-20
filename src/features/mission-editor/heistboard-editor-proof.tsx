"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ImageEditorSaveResult } from "@unlayer/react-image-editor";

import {
  editorWorkflowReducer,
  initialEditorWorkflow,
  initialJourneyState,
  operationJourneyReducer,
  OPERATION_STAGES,
  type EditorWorkflowPhase,
  type OperationStage,
} from "@/domain/editor-workflow";
import {
  SAMPLE_MAP_ATTRIBUTION,
  SAMPLE_MAP_BASE_URL,
  STANDARD_TERRITORY_ATTRIBUTION,
  formatAttributionString,
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";
import {
  AnnotatedMapResourceOwner,
  type AnnotatedMapResource,
} from "@/lib/annotated-map-resource";
import { TerritoryView, type TerritoryLockedResult } from "@/features/territory/territory-view";
import {
  type IdentityState,
  DEFAULT_IDENTITY_STATE,
} from "@/domain/identity";
import {
  type GtaBadgeOptions,
  DEFAULT_GTA_BADGE_OPTIONS,
  placeOrUpdateBadgeOnFabricCanvas,
} from "@/lib/gta-identity-badge";
import {
  type BgLayerConfig,
  DEFAULT_BG_LAYER_CONFIG,
  applyBgLayerToFabricCanvas,
} from "@/lib/bg-layer-processor";
import {
  findFabricCanvas,
  importStickerToCanvas,
  type FabricCanvasLike,
} from "@/lib/sticker-canvas-importer";
import { composeDossierCanvas } from "@/lib/dossier-composer";
import type { CustomEditorTool } from "./mission-editor";
import { CinematicReveal } from "./cinematic-reveal";

const BANNER_SLIDES = [
  "/banner/1.jpg",
  "/banner/2.jpg",
  "/banner/3.jpg",
  "/banner/4.jpg",
  "/banner/5.jpg",
  "/banner/6.jpg",
  "/banner/7.jpg",
  "/banner/8.jpg",
  "/banner/9.jpg",
  "/banner/10.jpg",
] as const;

const EDITOR_LOAD_TIMEOUT_MS = 20_000;

export type HeistStage = OperationStage;

async function normalizeSaveResultToPng(
  result: ImageEditorSaveResult,
): Promise<ImageEditorSaveResult> {
  if (
    /^data:image\/png;base64,/i.test(result.dataUrl) &&
    result.blob.type.toLowerCase() === "image/png"
  ) {
    return result;
  }

  return new Promise<ImageEditorSaveResult>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(result);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ dataUrl, blob });
        } else {
          resolve(result);
        }
      }, "image/png");
    };
    img.onerror = () => resolve(result);
    img.src = result.dataUrl;
  });
}

const MissionEditor = dynamic(() => loadMissionEditor(), {
  ssr: false,
  loading: () => <EditorLoading label="Loading the authoring tools…" />,
});

export function HeistboardEditorProof() {
  const [journey, journeyDispatch] = useReducer(
    operationJourneyReducer,
    initialJourneyState,
  );
  const stage = journey.stage;

  const [mapBaseUrl, setMapBaseUrl] = useState<string>(SAMPLE_MAP_BASE_URL);
  const [attribution, setAttribution] = useState<TerritoryAttribution>(
    STANDARD_TERRITORY_ATTRIBUTION,
  );
  const [lockedCamera, setLockedCamera] = useState<TerritoryCameraState | undefined>(
    undefined,
  );
  const [isSampleMap, setIsSampleMap] = useState<boolean>(false);

  const [workflow, dispatch] = useReducer(
    editorWorkflowReducer,
    initialEditorWorkflow,
  );
  const [annotatedMap, setAnnotatedMap] = useState<AnnotatedMapResource | null>(null);
  const [identity, setIdentity] = useState<IdentityState>(DEFAULT_IDENTITY_STATE);
  const [gtaBadgeOptions, setGtaBadgeOptions] = useState<GtaBadgeOptions>({
    ...DEFAULT_GTA_BADGE_OPTIONS,
    alias: DEFAULT_IDENTITY_STATE.alias,
    silhouetteId: DEFAULT_IDENTITY_STATE.silhouetteId,
  });
  const [bgLayerConfig, setBgLayerConfig] = useState<BgLayerConfig>(DEFAULT_BG_LAYER_CONFIG);
  const [requestedEditorTool, setRequestedEditorTool] = useState<CustomEditorTool | null>(null);

  // Composed 16:9 final Dossier artifact (HB-007) with 4K UHD and 2K QHD support
  const [selectedResolution, setSelectedResolution] = useState<"4k" | "2k">("4k");
  const [dossierArtifact, setDossierArtifact] = useState<{
    previewUrl: string;
    blob: Blob;
    downloadUrl: string;
    fileName: string;
    width: number;
    height: number;
    resolution: "4k" | "2k";
  } | null>(null);
  const [isComposingDossier, setIsComposingDossier] = useState<boolean>(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);
  const dossierBlobUrlRef = useRef<string | null>(null);

  // 5-second random slideshow for the header banner
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        if (BANNER_SLIDES.length <= 1) return 0;
        let next = Math.floor(Math.random() * BANNER_SLIDES.length);
        while (next === prev) {
          next = Math.floor(Math.random() * BANNER_SLIDES.length);
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const resourceOwner = useRef<AnnotatedMapResourceOwner | null>(null);
  const mapBaseBlobUrlRef = useRef<string | null>(null);
  const editorFrameRef = useRef<HTMLDivElement>(null);

  const handleBgLayerChange = useCallback(
    (newConfig: BgLayerConfig) => {
      setBgLayerConfig(newConfig);
      const fabricCanvas = findFabricCanvas(editorFrameRef.current);
      if (fabricCanvas) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          applyBgLayerToFabricCanvas(fabricCanvas, newConfig, img);
        };
        img.src = mapBaseUrl;
      }
    },
    [mapBaseUrl],
  );

  if (resourceOwner.current === null) {
    resourceOwner.current = new AnnotatedMapResourceOwner();
  }

  useEffect(() => {
    const owner = resourceOwner.current;
    return () => {
      owner?.dispose();
      if (mapBaseBlobUrlRef.current) {
        URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      }
      if (dossierBlobUrlRef.current) {
        URL.revokeObjectURL(dossierBlobUrlRef.current);
      }
    };
  }, []);

  // Check map base when in mission-plan stage and checking-map phase
  useEffect(() => {
    if (stage !== "mission-plan" || workflow.phase !== "checking-map") return;

    let active = true;
    const mapBase = new Image();
    mapBase.onload = () => {
      if (active) dispatch({ type: "map-ready" });
    };
    mapBase.onerror = () => {
      if (active) {
        dispatch({
          type: "image-failed",
          message: "The raster Map Base could not be loaded or decoded.",
        });
      }
    };
    mapBase.src = mapBaseUrl;

    return () => {
      active = false;
      mapBase.onload = null;
      mapBase.onerror = null;
    };
  }, [stage, workflow.phase, workflow.retryKey, mapBaseUrl]);

  const handleStartOperation = useCallback(() => {
    journeyDispatch({ type: "start-operation" });
  }, []);


  const handleConfirmChangeTerritory = useCallback(() => {
    if (dossierBlobUrlRef.current) {
      URL.revokeObjectURL(dossierBlobUrlRef.current);
      dossierBlobUrlRef.current = null;
    }
    resourceOwner.current?.dispose();
    setAnnotatedMap(null);
    setDossierArtifact(null);
    journeyDispatch({ type: "confirm-change-territory" });
  }, []);

  const handleRestartOperation = useCallback(() => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }
    if (dossierBlobUrlRef.current) {
      URL.revokeObjectURL(dossierBlobUrlRef.current);
      dossierBlobUrlRef.current = null;
    }
    if (identity.portraitUrl && identity.portraitUrl.startsWith("blob:")) {
      URL.revokeObjectURL(identity.portraitUrl);
    }
    resourceOwner.current?.dispose();
    resourceOwner.current = new AnnotatedMapResourceOwner();

    setAnnotatedMap(null);
    setDossierArtifact(null);
    setIdentity(DEFAULT_IDENTITY_STATE);
    setMapBaseUrl(SAMPLE_MAP_BASE_URL);
    setLockedCamera(undefined);
    setIsSampleMap(false);
    setAttribution(STANDARD_TERRITORY_ATTRIBUTION);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "restart-operation" });
  }, [identity.portraitUrl]);

  const handleTerritoryLocked = useCallback((result: TerritoryLockedResult) => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }

    if (result.blob) {
      const blobUrl = URL.createObjectURL(result.blob);
      mapBaseBlobUrlRef.current = blobUrl;
      setMapBaseUrl(blobUrl);
      setIsSampleMap(false);
    } else {
      setMapBaseUrl(SAMPLE_MAP_BASE_URL);
      setIsSampleMap(true);
    }

    setAttribution(result.attribution);
    setLockedCamera(result.camera);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "lock-territory" });
  }, []);

  const handleSelectSampleFallback = useCallback(() => {
    if (mapBaseBlobUrlRef.current) {
      URL.revokeObjectURL(mapBaseBlobUrlRef.current);
      mapBaseBlobUrlRef.current = null;
    }
    setMapBaseUrl(SAMPLE_MAP_BASE_URL);
    setAttribution(SAMPLE_MAP_ATTRIBUTION);
    setIsSampleMap(true);
    dispatch({ type: "reset-for-map-base" });
    journeyDispatch({ type: "lock-territory" });
  }, []);

  const handleEditorLoad = useCallback(() => {
    dispatch({ type: "editor-ready" });
  }, []);

  const handleSave = useCallback(async (result: ImageEditorSaveResult) => {
    dispatch({ type: "save-started" });
    try {
      const pngPayload = await normalizeSaveResultToPng(result);
      const resource = await resourceOwner.current?.replace(pngPayload);
      if (!resource) throw new Error("The image resource owner is unavailable.");
      setAnnotatedMap(resource);
      setIsComposingDossier(true);
      setIsRevealing(true);
      setDossierError(null);
      dispatch({ type: "save-succeeded" });
      journeyDispatch({ type: "save-succeeded" });
    } catch (error) {
      dispatch({
        type: "save-failed",
        message:
          error instanceof Error
            ? error.message
            : "The Annotated Map could not be prepared.",
      });
    }
  }, []);

  // Compose 16:9 final Dossier canvas when entering dossier stage (HB-007)
  useEffect(() => {
    if (stage !== "dossier" || !annotatedMap) return;

    let active = true;
    composeDossierCanvas({
      annotatedMapUrl: annotatedMap.previewUrl,
      resolution: selectedResolution,
      identity,
      attribution,
      cameraState: lockedCamera,
      operationTitle: "OPERATION: THE LAST DELIVERY",
      operationSubtitle: "Package before sunrise",
    })
      .then((result) => {
        if (!active) return;
        if (dossierBlobUrlRef.current) {
          URL.revokeObjectURL(dossierBlobUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(result.blob);
        dossierBlobUrlRef.current = objectUrl;

        setDossierArtifact({
          previewUrl: objectUrl,
          blob: result.blob,
          downloadUrl: objectUrl,
          fileName: `heistboard-mission-map-${selectedResolution.toUpperCase()}-${result.width}x${result.height}.png`,
          width: result.width,
          height: result.height,
          resolution: selectedResolution,
        });
        setIsComposingDossier(false);
      })
      .catch((err) => {
        if (!active) return;
        setIsComposingDossier(false);
        setDossierError(
          err instanceof Error
            ? err.message
            : "Failed to compose the 16:9 high-resolution final dossier.",
        );
      });

    return () => {
      active = false;
    };
  }, [stage, annotatedMap, identity, attribution, lockedCamera, selectedResolution]);

  const handleDragOver = (e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes("application/x-heistboard-sticker") ||
      e.dataTransfer.types.includes("application/x-heistboard-badge")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    journeyDispatch({ type: "record-mission-edit" });

    // 1. Direct drag-and-drop of the Operative Identity Badge onto the map
    if (e.dataTransfer.types.includes("application/x-heistboard-badge")) {
      e.preventDefault();
      const fabricCanvas =
        findFabricCanvas(editorFrameRef.current) ??
        (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike })
          .__heistboardFabricCanvas;
      if (!fabricCanvas) return;

      let position: { x: number; y: number } | undefined;
      if (typeof fabricCanvas.getPointer === "function") {
        position = fabricCanvas.getPointer(e.nativeEvent);
      }

      await placeOrUpdateBadgeOnFabricCanvas(
        fabricCanvas,
        gtaBadgeOptions,
        undefined,
        position,
      );
      return;
    }

    // 2. Direct drag-and-drop of Stickers onto the map
    const stickerUrl = e.dataTransfer.getData("application/x-heistboard-sticker");
    if (!stickerUrl) return;
    e.preventDefault();

    const fabricCanvas = findFabricCanvas(editorFrameRef.current);
    let position: { x: number; y: number } | undefined;
    if (fabricCanvas && typeof fabricCanvas.getPointer === "function") {
      position = fabricCanvas.getPointer(e.nativeEvent);
    }

    await importStickerToCanvas(stickerUrl, {
      rootElement: editorFrameRef.current,
      position,
    });
  };

  const handleReturnToTerritory = useCallback(() => {
    journeyDispatch({ type: "request-change-territory" });
  }, []);

  const editorVisible =
    (stage === "mission-plan" || stage === "dossier") &&
    (workflow.phase === "loading-editor" ||
      workflow.phase === "editing" ||
      workflow.phase === "saving" ||
      workflow.phase === "preview");

  // Re-calculate Fabric canvas offset when returning to mission-plan so mouse events work immediately
  useEffect(() => {
    if (stage === "mission-plan") {
      const canvas = findFabricCanvas(editorFrameRef.current);
      if (canvas) {
        canvas.calcOffset?.();
        canvas.requestRenderAll?.();
      }
    }
  }, [stage]);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1540px] p-4 sm:p-6 lg:p-10">
      <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-8 overflow-hidden rounded-2xl border border-synth-pink/30 bg-[#0e091e]/75 p-6 sm:p-8 lg:p-10 shadow-[0_16px_45px_rgba(0,0,0,0.6),0_0_25px_rgba(255,0,127,0.15)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-gradient-to-r after:from-[#ff007f] after:via-[#ffaa00] after:to-[#00f5d4] after:shadow-[0_0_14px_rgba(255,0,127,0.7)] after:content-['']">
        <div className="pointer-events-none absolute -inset-3 z-0 overflow-hidden" aria-hidden="true">
          {BANNER_SLIDES.map((src, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={src}
              src={src}
              alt=""
              className={`pointer-events-none absolute inset-0 h-[calc(100%+24px)] w-[calc(100%+24px)] object-cover object-[center_25%] brightness-[0.6] contrast-[1.15] scale-105 transition-opacity duration-1000 ${i === activeBannerIndex ? "opacity-100" : "opacity-0"}`}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e091e]/95 via-[#0e091e]/75 to-[#1c1136]/70" />
        </div>
        <div className="relative z-10 max-w-[820px]">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-petrol drop-shadow-[0_0_8px_rgba(0,245,212,0.4)]">VICE CITY // TACTICAL MISSION COMMAND · LEONIDA</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-petrol/50 bg-petrol/10 px-3 py-1 font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-petrol shadow-[0_0_14px_rgba(0,245,212,0.3)]">
              <span className="h-[7px] w-[7px] rounded-full bg-petrol shadow-[0_0_8px_#00f5d4] animate-pulse" aria-hidden="true" />
              UNLAYER HACKATHON EDITION
            </span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.92] tracking-[0.02em] text-white drop-shadow-[0_0_24px_rgba(255,0,127,0.5)]">
            HEIST<span className="bg-gradient-to-r from-[#ff007f] via-[#ff71ce] to-[#00f5d4] bg-clip-text text-transparent px-1">VI</span>BOARD
          </h1>
          <p className="mt-3 max-w-[720px] text-sm sm:text-base leading-relaxed text-paper-muted">
            Plan the heist. Mark the streets. Powered by Unlayer React Image Editor with real-world 3D
            satellite rasterization, tactical vector authoring, and instant full-view export.
          </p>
        </div>
        <div className="relative z-10 flex flex-col items-start md:items-end gap-1 rounded-xl border border-mustard/40 bg-[#0e091e]/85 p-4 sm:px-6 sm:py-3.5 shadow-[0_0_16px_rgba(255,170,0,0.15)] text-left md:text-right shrink-0" aria-label="Fictional scenario">
          <div className="hidden" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-mustard">VICE CITY OPS</span>
          <strong className="font-display text-lg tracking-wider text-white">THE LAST DELIVERY</strong>
          <small className="font-mono text-[9px] uppercase tracking-widest text-paper-muted/70">FICTIONAL USE ONLY · LEONIDA</small>
        </div>
      </header>

      {/* 4-Stage Nav Stepper */}
      <nav className="my-6 flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-synth-pink/20 bg-charcoal-900/80 p-2 sm:p-3 shadow-lg backdrop-blur-md" aria-label="Operation Stages">
        {OPERATION_STAGES.map((s, idx) => {
          const isCurrent = stage === s.id;
          const stageOrder: OperationStage[] = ["file", "territory", "mission-plan", "dossier"];
          const currentIdx = stageOrder.indexOf(stage);
          const isPast = idx < currentIdx;
          const isAccessible =
            isPast ||
            isCurrent ||
            s.id === "file" ||
            s.id === "territory" ||
            (s.id === "mission-plan" && journey.isTerritoryLocked) ||
            (s.id === "dossier" && journey.hasAnnotatedMap);

          return (
            <div key={s.id} className="inline-flex items-center gap-2">
              {idx > 0 && <span className="font-mono text-sm text-paper-muted/40" aria-hidden="true">›</span>}
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 ${
                  isCurrent
                    ? "bg-coral text-white shadow-[0_0_16px_rgba(255,0,127,0.5)] border border-coral-soft"
                    : isPast
                      ? "border border-petrol/40 bg-petrol/15 text-petrol hover:bg-petrol/25"
                      : "border border-white/10 bg-charcoal-800/50 text-paper-muted/50 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (isCurrent) return;
                  if (s.id === "territory" && (journey.hasMissionEdits || journey.hasAnnotatedMap)) {
                    journeyDispatch({ type: "request-change-territory" });
                  } else {
                    journeyDispatch({ type: "go-to-stage", target: s.id });
                  }
                }}
                disabled={!isAccessible}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Stage ${s.number}: ${s.label} - ${s.shortDescription}`}
                title={`${s.number} / ${s.label}: ${s.shortDescription}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono font-black ${
                  isCurrent
                    ? "bg-white text-charcoal-950"
                    : isPast
                      ? "bg-petrol text-charcoal-950"
                      : "bg-charcoal-700 text-paper-muted"
                }`}>{s.number}</span>
                <span>{s.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Stage 01: Case File Briefing */}
      {stage === "file" && (
        <section className="rounded-2xl border border-synth-pink/25 bg-charcoal-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl" aria-labelledby="case-file-title">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-synth-pink/20 pb-6">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-petrol">Operation Case File // 01</span>
              <h2 id="case-file-title" className="font-display text-3xl sm:text-4xl font-black uppercase tracking-wide text-white">
                The Last Delivery
              </h2>
            </div>
            <span className="rounded-md border border-coral/40 bg-coral/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-coral-soft shadow-[0_0_10px_rgba(255,0,127,0.2)]">Courier Directive // Eyes Only</span>
          </div>

          <div className="my-6 space-y-4 text-sm sm:text-base leading-relaxed text-paper-muted">
            <p>
              A single high-priority courier package must be picked up and routed to a secure
              safehouse before first light. Search your neighborhood, lock your 3D Territory
              camera, author your tactical route, and produce the verified 2400 × 1600 final dossier.
            </p>
            <p>
              Your local streets become the operational theatre. All marks, routes, and callouts
              remain client-side in browser memory with full legal provider attribution.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 rounded-xl border border-synth-pink/15 bg-charcoal-950/60 p-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-paper-muted/70">Objective</span>
              <span className="font-sans text-sm sm:text-base font-extrabold text-white">Package before sunrise</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-paper-muted/70">Operational Duration</span>
              <span className="font-sans text-sm sm:text-base font-extrabold text-white">2–5 Minutes</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-paper-muted/70">Territory Engine</span>
              <span className="font-sans text-sm sm:text-base font-extrabold text-white">OpenFreeMap 3D &amp; OSM</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-paper-muted/70">Final Artifact</span>
              <span className="font-sans text-sm sm:text-base font-extrabold text-white">2400 × 1600 Dossier PNG</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-synth-pink/15">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-coral-soft bg-gradient-to-r from-coral to-coral-dark px-6 py-3.5 font-display text-lg font-bold tracking-wider text-white shadow-[0_0_20px_rgba(255,0,127,0.4)] transition hover:brightness-110 active:scale-[0.98]"
              onClick={handleStartOperation}
            >
              Start Operation: Select Territory →
            </button>
            <span className="max-w-md text-xs text-paper-muted/60 leading-relaxed">
              Fictional creative use only. Extruded 3D context is approximate and not intended
              for real navigation, surveillance, or safety claims.
            </span>
          </div>
        </section>
      )}

      {/* Stage 02: Territory Composition */}
      {stage === "territory" && (
        <div>
          <TerritoryView
            onLockTerritory={handleTerritoryLocked}
            onSelectSampleFallback={handleSelectSampleFallback}
            initialCamera={lockedCamera}
          />
        </div>
      )}

      {/* Stage 03: Mission Editor (preserved in DOM across preview to maintain active Fabric objects) */}
      {(stage === "mission-plan" || stage === "dossier") && (
        <section
          className="w-full space-y-4"
          aria-labelledby="workspace-title"
          style={{ display: stage === "mission-plan" ? undefined : "none" }}
        >
          <a href="#editor-frame-container" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-coral focus:px-4 focus:py-2 focus:text-white">
            Skip to Mission Plan Editor Canvas
          </a>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-synth-pink/20 bg-charcoal-900/70 p-4 backdrop-blur-md">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-petrol">
                  Map Base / {isSampleMap ? "Southbank District (Sample)" : "3D Territory"}
                </p>
                <h2 id="workspace-title" className="font-display text-2xl font-black text-white">Mission Plan editor</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-coral/40 bg-coral/10 px-3 py-1.5 font-mono text-xs font-bold text-coral-soft transition hover:bg-coral/20 hover:border-coral"
                  onClick={handleReturnToTerritory}
                  title="Return to 3D Territory selection (resets plan)"
                >
                  ← Change Territory (resets plan)
                </button>
                <span className="rounded-full border border-petrol/30 bg-petrol/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-petrol" aria-live="polite">
                  {phaseLabel(workflow.phase)}
                </span>
              </div>
            </div>

            {workflow.phase === "checking-map" && (
              <EditorLoading label="Preparing and validating raster Map Base…" />
            )}

            {editorVisible && (
              <div
                id="editor-frame-container"
                ref={editorFrameRef}
                className="editor-frame relative min-h-[640px] w-full overflow-hidden rounded-xl border border-synth-pink/30 bg-[#090614] shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
                aria-busy={workflow.phase !== "editing"}
                onDragOver={handleDragOver}
                onDrop={(e) => void handleDrop(e)}
              >
                {workflow.phase === "loading-editor" && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal-950/80 backdrop-blur-sm">
                    <EditorLoading label="Loading React Image Editor…" />
                  </div>
                )}
                <MissionEditor
                  image={mapBaseUrl}
                  retryKey={workflow.retryKey}
                  onLoad={handleEditorLoad}
                  onSave={(result) => void handleSave(result)}
                  onCancel={() => dispatch({ type: "cancelled" })}
                  onImageError={() =>
                    dispatch({
                      type: "image-failed",
                      message: "The Map Base could not be loaded into the editor.",
                    })
                  }
                  onEditorError={(error) =>
                    dispatch({
                      type: "editor-failed",
                      message: `React Image Editor could not start: ${error.message}`,
                    })
                  }
                  bgConfig={bgLayerConfig}
                  onBgConfigChange={handleBgLayerChange}
                  identityOptions={gtaBadgeOptions}
                  onIdentityChange={setGtaBadgeOptions}
                  identityState={identity}
                  onIdentityStateChange={setIdentity}
                  requestedTool={requestedEditorTool}
                  onToolHandled={() => setRequestedEditorTool(null)}
                />
              </div>
            )}

            {workflow.phase === "saving" && (
              <p className="font-mono text-sm text-mustard animate-pulse text-center py-2" role="status">
                Verifying the saved image…
              </p>
            )}

            {workflow.phase === "cancelled" && (
              <RecoveryPanel
                title="Mission Plan paused"
                message={workflow.notice ?? "No changes were saved."}
                actionLabel="Resume editing"
                onAction={() => dispatch({ type: "edit-again" })}
              />
            )}

            {workflow.phase === "failure" && workflow.failure && (
              <RecoveryPanel
                title={
                  workflow.failure.kind === "image"
                    ? "Map Base unavailable"
                    : workflow.failure.kind === "editor"
                      ? "Editor unavailable"
                      : "Save could not be verified"
                }
                message={workflow.failure.message}
                actionLabel="Try again"
                onAction={() => dispatch({ type: "retry" })}
                secondaryAction={{
                  label: "Use sample map fallback",
                  onClick: handleSelectSampleFallback,
                }}
              />
            )}
          </div>
        </section>
      )}

      {/* Stage 5: Dossier Preview & Cinematic Reveal */}
      {stage === "dossier" && annotatedMap && (
        <section className="w-full space-y-6" aria-labelledby="preview-title">
          {isRevealing ? (
            <CinematicReveal
              annotatedMapUrl={annotatedMap.previewUrl}
              dossierUrl={dossierArtifact?.previewUrl ?? annotatedMap.previewUrl}
              onComplete={() => setIsRevealing(false)}
              onSkip={() => setIsRevealing(false)}
            />
          ) : (
            <>
              {/* Clean 16:9 Dossier Command Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-synth-pink/25 bg-charcoal-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md border border-petrol/40 bg-petrol/10 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-petrol">STAGE 04 / FINAL MISSION DOSSIER</span>
                    <span className="rounded-md border border-synth-pink/40 bg-synth-pink/10 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-synth-pink">16:9 CINEMATIC</span>
                    <span className="rounded-md border border-mustard/40 bg-mustard/10 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-mustard">
                      {selectedResolution === "4k" ? "4K ULTRA-HD (3840×2160)" : "2K QUAD-HD (2560×1440)"}
                    </span>
                  </div>
                  <h2 id="preview-title" className="font-display text-3xl sm:text-4xl font-black text-white">Tactical Mission Dossier</h2>
                  <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
                    {isComposingDossier
                      ? "Rendering 16:9 high-resolution composite canvas…"
                      : dossierError
                        ? `Notice: ${dossierError}`
                        : "Your authored tactical plan is composed in crystal-clear 16:9 widescreen format, rendered in lossless high-definition ready for briefing and presentation."}
                  </p>
                </div>

                {/* Resolution Switcher & Primary 4K/2K Download Action */}
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="flex items-center gap-2 rounded-xl border border-synth-pink/20 bg-charcoal-950/80 p-1.5" role="group" aria-label="Select export resolution">
                    <span className="pl-2 font-mono text-xs font-bold text-paper-muted/80">Resolution:</span>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-extrabold transition-all duration-200 ${selectedResolution === "4k" ? "bg-gradient-to-r from-coral to-mustard text-white shadow-md shadow-coral/30" : "text-paper-muted hover:text-white"}`}
                      onClick={() => {
                        if (selectedResolution === "4k") return;
                        setIsComposingDossier(true);
                        setDossierError(null);
                        setSelectedResolution("4k");
                      }}
                      title="Switch to 4K Ultra-HD (3840 × 2160)"
                      disabled={isComposingDossier}
                    >
                      🌟 4K Ultra-HD <small className="text-[10px] opacity-75">3840 × 2160</small>
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-extrabold transition-all duration-200 ${selectedResolution === "2k" ? "bg-gradient-to-r from-coral to-mustard text-white shadow-md shadow-coral/30" : "text-paper-muted hover:text-white"}`}
                      onClick={() => {
                        if (selectedResolution === "2k") return;
                        setIsComposingDossier(true);
                        setDossierError(null);
                        setSelectedResolution("2k");
                      }}
                      title="Switch to 2K Quad-HD (2560 × 1440)"
                      disabled={isComposingDossier}
                    >
                      ⚡ 2K Quad-HD <small className="text-[10px] opacity-75">2560 × 1440</small>
                    </button>
                  </div>

                  <a
                    className={`group flex items-center gap-3.5 rounded-xl border border-petrol/60 bg-gradient-to-r from-petrol/20 via-petrol/10 to-transparent p-3 sm:px-6 sm:py-3.5 text-petrol transition hover:border-petrol hover:bg-petrol/25 hover:shadow-[0_0_24px_rgba(0,245,212,0.3)] ${isComposingDossier ? "opacity-50 pointer-events-none" : ""}`}
                    href={dossierArtifact?.downloadUrl ?? annotatedMap.download.href}
                    download={dossierArtifact?.fileName ?? `heistboard-mission-map-${selectedResolution.toUpperCase()}.png`}
                    aria-disabled={isComposingDossier}
                    aria-label={`Download verified ${selectedResolution.toUpperCase()} 16:9 High-Resolution Edited Map PNG`}
                  >
                    <span className="text-2xl transition group-hover:scale-110" aria-hidden="true">⬇️</span>
                    <div className="flex flex-col text-left">
                      <span className="font-display text-base sm:text-lg font-black tracking-wider text-white">
                        {isComposingDossier
                          ? "Encoding High-Res PNG…"
                          : `Download ${selectedResolution.toUpperCase()} High-Res PNG`}
                      </span>
                      <span className="font-mono text-[10px] text-petrol/80">
                        {selectedResolution === "4k"
                          ? "3840 × 2160 • 16:9 Cinematic Widescreen • Lossless Quality"
                          : "2560 × 1440 • 16:9 High Definition • Lossless Quality"}
                      </span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Clean Secondary Tool Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-synth-pink/20 bg-charcoal-900/60 p-2.5 sm:p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-synth-pink/20 bg-charcoal-800/60 px-3 py-2 font-mono text-xs font-bold text-paper transition hover:border-synth-pink/50 hover:bg-charcoal-700/80 active:scale-95"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit mission plan again in editor"
                  >
                    ✏️ Edit Mission Plan
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-synth-pink/20 bg-charcoal-800/60 px-3 py-2 font-mono text-xs font-bold text-paper transition hover:border-synth-pink/50 hover:bg-charcoal-700/80 active:scale-95"
                    type="button"
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                      setRequestedEditorTool("identity");
                      journeyDispatch({ type: "go-to-stage", target: "mission-plan" });
                    }}
                    aria-label="Edit operative identity callsign or portrait in editor"
                  >
                    🪪 Edit Operative ID
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-synth-pink/20 bg-charcoal-800/60 px-3 py-2 font-mono text-xs font-bold text-paper transition hover:border-synth-pink/50 hover:bg-charcoal-700/80 active:scale-95"
                    type="button"
                    onClick={handleReturnToTerritory}
                    aria-label="Select a new territory location"
                  >
                    🗺️ Change Territory
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-synth-pink/20 bg-charcoal-800/60 px-3 py-2 font-mono text-xs font-bold text-paper transition hover:border-synth-pink/50 hover:bg-charcoal-700/80 active:scale-95"
                    type="button"
                    onClick={() => setIsRevealing(true)}
                    title="Replay cinematic reveal transition"
                    aria-label="Replay cinematic pullback reveal animation"
                  >
                    🎬 Replay Reveal
                  </button>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 font-mono text-xs font-bold text-coral-soft transition hover:border-coral hover:bg-coral/20 active:scale-95"
                  type="button"
                  onClick={handleRestartOperation}
                  aria-label="Restart operation from stage one"
                >
                  ↺ Restart Operation
                </button>
              </div>

              {/* Composed 16:9 Dossier Viewport */}
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-synth-pink/40 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,0,127,0.15)]" role="region" aria-label="16:9 Final Dossier Viewport">
                {isComposingDossier && !dossierArtifact ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal-950/90 text-center p-6" role="status">
                    <div className="h-8 w-8 rounded-full border-2 border-petrol/30 border-t-petrol animate-spin" aria-hidden="true" />
                    <p className="font-display text-lg tracking-wider text-white">Composing {selectedResolution.toUpperCase()} (16:9) Tactical Dossier…</p>
                    <small className="font-mono text-xs text-paper-muted/80">
                      Rendering high-fidelity map base, custom stickers, operative identity badge, and tactical routes
                    </small>
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-full w-full object-contain"
                      src={dossierArtifact?.previewUrl ?? annotatedMap.previewUrl}
                      alt={`16:9 ${selectedResolution.toUpperCase()} Operation Dossier composite saved from mission editor`}
                    />
                    {/* Corner HUD Telemetry Reticles */}
                    <div className="pointer-events-none absolute inset-0 p-4 sm:p-6" aria-hidden="true">
                      <div className="absolute top-3 left-3 flex items-center gap-1 font-mono text-[10px] font-black tracking-widest text-petrol/80 drop-shadow-md">
                        <span>⌜</span>
                        <span>SECTOR // {selectedResolution.toUpperCase()} RECON</span>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 font-mono text-[10px] font-black tracking-widest text-petrol/80 drop-shadow-md">
                        <span>{selectedResolution === "4k" ? "3840 × 2160 UHD" : "2560 × 1440 QHD"}</span>
                        <span>⌝</span>
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 font-mono text-[10px] font-black tracking-widest text-petrol/80 drop-shadow-md">
                        <span>⌞</span>
                        <span>16:9 WIDESCREEN</span>
                      </div>
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 font-mono text-[10px] font-black tracking-widest text-petrol/80 drop-shadow-md">
                        <span>LEONIDA SEC-INTEL</span>
                        <span>⌟</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legally required attribution line under the Annotated Map */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-synth-pink/15 bg-charcoal-950/70 p-3.5 text-xs text-paper-muted">
                <span>
                  <strong className="text-white">Map Base Attribution:</strong> {attribution.noticeText} ·{" "}
                  <span>{attribution.printedUrl}</span>
                </span>
                <div className="flex items-center gap-3">
                  {attribution.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-petrol hover:underline"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Accessible Territory Reset Warning Dialog */}
      {journey.isConfirmingTerritoryReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" role="presentation">
          <div
            className="w-full max-w-lg rounded-2xl border border-coral/50 bg-charcoal-900 p-6 sm:p-8 shadow-[0_20px_60px_rgba(255,0,127,0.3)] space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="territory-dialog-title"
            aria-describedby="territory-dialog-desc"
          >
            <h3 id="territory-dialog-title" className="font-display text-2xl font-black text-white">
              ⚠️ Reset Mission Plan?
            </h3>
            <p id="territory-dialog-desc" className="text-sm text-paper-muted leading-relaxed">
              Changing Territory resets your current Mission Plan and Annotated Map. All
              routes, markers, notes, and custom stickers authored on this map base will be
              permanently discarded.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-lg border border-white/20 bg-charcoal-800 px-4 py-2 font-mono text-xs font-bold text-paper transition hover:bg-charcoal-700"
                onClick={() => journeyDispatch({ type: "cancel-change-territory" })}
                autoFocus
              >
                Keep Mission Plan
              </button>
              <button
                type="button"
                className="rounded-lg border border-coral bg-coral px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-coral-dark"
                onClick={handleConfirmChangeTerritory}
              >
                Discard &amp; Change Territory
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 border-t border-synth-pink/15 py-6 text-xs text-paper-muted/60">
        <span>{formatAttributionString(attribution)}</span>
        <span>No route calculation</span>
        <span>Fictional use only</span>
        <span>React Image Editor authoring</span>
      </footer>
    </main>
  );
}

function EditorLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center" role="status">
      <div className="h-8 w-8 rounded-full border-2 border-petrol/30 border-t-petrol animate-spin" aria-hidden="true" />
      <p className="font-mono text-sm text-petrol">{label}</p>
    </div>
  );
}

interface RecoveryPanelProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}

function RecoveryPanel({
  title,
  message,
  actionLabel,
  onAction,
  secondaryAction,
}: RecoveryPanelProps) {
  return (
    <section className="rounded-xl border border-mustard/40 bg-charcoal-900/90 p-6 shadow-xl space-y-3" role="alert">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-mustard">Recovery available</p>
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-paper-muted">{message}</p>
      <div className="flex items-center gap-3 pt-2">
        <button className="rounded-lg border border-mustard bg-mustard px-4 py-2 font-mono text-xs font-bold text-charcoal-950 transition hover:bg-mustard-subtle" type="button" onClick={onAction}>
          {actionLabel}
        </button>
        {secondaryAction && (
          <button
            className="rounded-lg border border-white/20 bg-charcoal-800 px-4 py-2 font-mono text-xs font-bold text-paper transition hover:bg-charcoal-700"
            type="button"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </section>
  );
}

async function loadMissionEditor() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      import("./mission-editor").then((module) => module.MissionEditor),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("React Image Editor did not finish loading.")),
          EDITOR_LOAD_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function phaseLabel(phase: EditorWorkflowPhase): string {
  const labels: Record<EditorWorkflowPhase, string> = {
    "checking-map": "Checking map",
    "loading-editor": "Loading editor",
    editing: "Editing",
    saving: "Saving",
    preview: "Saved",
    cancelled: "Paused",
    failure: "Needs attention",
  };
  return labels[phase];
}
