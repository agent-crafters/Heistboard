"use client";

import { useState } from "react";
import {
  type StickerCategory,
  type GtaSticker,
  getStickersByCategory,
  GTA_STICKERS,
} from "@/lib/gta-stickers";
import { importStickerToCanvas } from "@/lib/sticker-canvas-importer";

interface StickerSidebarProps {
  editorContainerRef?: React.RefObject<HTMLElement | null>;
  onStickerAdded?: (sticker: GtaSticker) => void;
}

const CATEGORIES: Array<{ id: StickerCategory; label: string; count: number }> = [
  { id: "all", label: "All", count: GTA_STICKERS.length },
  {
    id: "tactical",
    label: "Tactical",
    count: GTA_STICKERS.filter((s) => s.category === "tactical").length,
  },
  {
    id: "tools",
    label: "Tools",
    count: GTA_STICKERS.filter((s) => s.category === "tools").length,
  },
  {
    id: "waypoints",
    label: "1-6",
    count: GTA_STICKERS.filter((s) => s.category === "waypoints").length,
  },
];

export function StickerSidebar({
  editorContainerRef,
  onStickerAdded,
}: StickerSidebarProps) {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const filteredStickers = getStickersByCategory(activeCategory, searchQuery);

  const handleAddSticker = async (sticker: GtaSticker) => {
    setIsImporting(true);
    const success = await importStickerToCanvas(sticker.url, {
      rootElement: editorContainerRef?.current,
    });
    setIsImporting(false);

    if (success) {
      setFeedback(`Added "${sticker.name}" to canvas`);
      onStickerAdded?.(sticker);
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback("Click map first or check editor");
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleDragStart = (e: React.DragEvent, sticker: GtaSticker) => {
    e.dataTransfer.setData("application/x-heistboard-sticker", sticker.url);
    e.dataTransfer.setData("text/plain", sticker.url);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full bg-charcoal-900/95 border-l border-coral/30 text-paper overflow-hidden select-none" aria-label="Tactical Stickers Stash">
      <div className="p-4 border-b border-coral/20 bg-charcoal-850/80 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg tracking-wider text-white uppercase">Tactical Stickers</h3>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-coral/20 text-coral font-bold">
            {filteredStickers.length} available
          </span>
        </div>
        <p className="text-xs text-paper-muted leading-tight">
          Click or drag onto map canvas to mark routes, targets, and safehouses.
        </p>

        {feedback && (
          <div className="px-3 py-1.5 rounded-md bg-petrol/20 text-petrol font-mono text-xs font-bold border border-petrol/40 animate-pulse" role="status">
            ✓ {feedback}
          </div>
        )}

        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full px-3 py-1.5 pl-3 pr-8 rounded-lg bg-charcoal-950 border border-coral/30 text-white placeholder:text-paper-muted/60 text-xs font-mono focus:outline-none focus:border-coral"
            placeholder="Search stickers (car, siren, 1...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 text-paper-muted hover:text-white text-xs cursor-pointer"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-coral text-white font-bold shadow-sm shadow-coral/30"
                  : "bg-charcoal-800 text-paper-muted hover:text-white hover:bg-charcoal-700"
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredStickers.length === 0 ? (
          <div className="text-center py-8 text-xs text-paper-muted font-mono">
            No stickers found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-charcoal-800/80 border border-white/5 hover:border-petrol/60 hover:bg-charcoal-700/80 hover:shadow-lg hover:shadow-petrol/10 transition-all cursor-pointer group text-left"
                title={`Click to add "${sticker.name}" (or drag onto map)`}
                onClick={() => handleAddSticker(sticker)}
                draggable
                onDragStart={(e) => handleDragStart(e, sticker)}
                disabled={isImporting}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] font-mono text-paper-muted group-hover:text-white truncate w-full text-center">
                  {sticker.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
