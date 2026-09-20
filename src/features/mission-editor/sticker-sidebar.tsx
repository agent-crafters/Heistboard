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
    <div className="sticker-sidebar-panel" aria-label="Tactical Stickers Stash">
      <div className="sticker-sidebar-header">
        <div className="flex items-center justify-between">
          <h3 className="sticker-sidebar-title">Tactical Stickers</h3>
          <span className="sticker-count-badge">
            {filteredStickers.length} available
          </span>
        </div>
        <p className="sticker-sidebar-subtitle">
          Click or drag onto map canvas to mark routes, targets, and safehouses.
        </p>

        {feedback && (
          <div className="sticker-feedback-toast" role="status">
            ✓ {feedback}
          </div>
        )}

        <div className="sticker-search-row">
          <input
            type="text"
            className="sticker-search-input"
            placeholder="Search stickers (car, siren, 1...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="sticker-search-clear"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sticker-category-tabs" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`sticker-tab-btn ${
                activeCategory === cat.id ? "active" : ""
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <div className="sticker-grid-container">
        {filteredStickers.length === 0 ? (
          <div className="sticker-empty-message">
            No stickers found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="sticker-grid">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                className="sticker-card"
                title={`Click to add "${sticker.name}" (or drag onto map)`}
                onClick={() => handleAddSticker(sticker)}
                draggable
                onDragStart={(e) => handleDragStart(e, sticker)}
                disabled={isImporting}
              >
                <div className="sticker-thumb-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="sticker-thumb-img"
                    loading="lazy"
                  />
                </div>
                <span className="sticker-card-label">{sticker.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
