import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useDocumentStore } from "@/stores/useDocumentStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { PageCanvas } from "./PageCanvas";

export const Viewer2D: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const {
    currentPage,
    setCurrentPage,
    zoom2d,
    setZoom2d,
    pan2d,
    setPan2d,
    showMountainFolds,
    setShowMountainFolds,
    showValleyFolds,
    setShowValleyFolds,
    showGlueTabs,
    setShowGlueTabs,
    showEdgeLabels,
    setShowEdgeLabels,
  } = useViewerSettingsStore();

  const { clearSelection } = useSelectionStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const pages = currentDocument?.pages || [];
  const totalPages = pages.length;
  const activePage =
    pages.find((p) => p.page_number === currentPage) || pages[0] || null;

  // Fit page to view
  const fitPageToView = useCallback(() => {
    if (!containerRef.current || !activePage) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    // Convert mm to approximate screen px (3.78 px per mm at 96 DPI)
    const pagePxW = activePage.width_mm * 3.78;
    const pagePxH = activePage.height_mm * 3.78;

    const scaleX = (clientWidth * 0.88) / pagePxW;
    const scaleY = (clientHeight * 0.88) / pagePxH;
    const newZoom = Math.min(scaleX, scaleY, 1.8);

    setZoom2d(Math.max(0.2, newZoom));
    setPan2d({ x: 0, y: 0 });
  }, [activePage, setZoom2d, setPan2d]);

  // Initial fit when document loads
  useEffect(() => {
    if (activePage) {
      fitPageToView();
    }
  }, [currentDocument?.metadata.file_name]);

  // Mouse wheel zoom (anchored around center/cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom2d((z) => Math.min(5.0, Math.max(0.15, z * zoomFactor)));
    } else {
      // Normal pan or shift-wheel pan
      if (e.shiftKey) {
        setPan2d((p) => ({ x: p.x - e.deltaY, y: p.y }));
      } else {
        setPan2d((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    }
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left click on background starts pan
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan2d.x, y: e.clientY - pan2d.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan2d({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  if (!currentDocument || !activePage) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900/40 text-neutral-500">
        <p className="text-sm">No 2D pattern available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overflow-hidden bg-neutral-950 ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => clearSelection()}
    >
      {/* 2D Canvas Container with Transform */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan2d.x}px, ${pan2d.y}px) scale(${zoom2d})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.05s ease-out",
        }}
      >
        <div className="pointer-events-auto">
          <PageCanvas page={activePage} />
        </div>
      </div>

      {/* Floating 2D Controls (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-neutral-800/80 bg-neutral-900/90 p-1 backdrop-blur-md shadow-lg shadow-black/40">
        {/* Page Switcher */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-1 text-xs font-medium text-neutral-300">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom2d((z) => Math.min(5.0, z * 1.25))}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <span className="w-12 text-center text-xs text-neutral-400 font-mono">
            {Math.round(zoom2d * 100)}%
          </span>

          <button
            onClick={() => setZoom2d((z) => Math.max(0.15, z / 1.25))}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={fitPageToView}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Fit Page to Screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Layer Quick Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMountainFolds(!showMountainFolds)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold border transition ${
              showMountainFolds
                ? "border-red-500/40 bg-red-950/40 text-red-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
            title="Toggle Mountain Folds (Red Dashed)"
          >
            M-Fold
          </button>

          <button
            onClick={() => setShowValleyFolds(!showValleyFolds)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold border transition ${
              showValleyFolds
                ? "border-blue-500/40 bg-blue-950/40 text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
            title="Toggle Valley Folds (Blue Dashed)"
          >
            V-Fold
          </button>

          <button
            onClick={() => setShowGlueTabs(!showGlueTabs)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold border transition ${
              showGlueTabs
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
            title="Toggle Glue Tabs"
          >
            Tabs
          </button>

          <button
            onClick={() => setShowEdgeLabels(!showEdgeLabels)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold border transition ${
              showEdgeLabels
                ? "border-amber-500/40 bg-amber-950/40 text-amber-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
            title="Toggle Edge Labels / IDs"
          >
            # IDs
          </button>
        </div>
      </div>

      {/* Floating Page Specs (Bottom Right) */}
      <div className="absolute bottom-3 right-3 rounded border border-neutral-800/80 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-400 backdrop-blur-sm pointer-events-none">
        <span>
          {activePage.width_mm.toFixed(0)} × {activePage.height_mm.toFixed(0)} mm •{" "}
          {activePage.parts.length} parts on page
        </span>
      </div>
    </div>
  );
};
