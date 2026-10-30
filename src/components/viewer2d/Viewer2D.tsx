import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  FileText,
  Image as ImageIcon,
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
    viewMode2d,
    setViewMode2d,
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
    showFaceFills,
    setShowFaceFills,
  } = useViewerSettingsStore();

  const {
    selectedPartId,
    clearSelection,
  } = useSelectionStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  const pages = currentDocument?.pages || [];
  const materials = currentDocument?.materials || [];
  const totalPages = pages.length;

  // Active page fallback
  const activePage =
    pages.find((p) => p.page_number === currentPage) || pages[0] || null;

  // Load and cache texture images in memory
  const [loadedImages, setLoadedImages] = useState<Map<number, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (materials.length === 0) return;

    const imgMap = new Map<number, HTMLImageElement>();
    let isMounted = true;
    let pending = 0;

    materials.forEach((mat) => {
      if (mat.has_texture && mat.texture_data_url) {
        pending++;
        const img = new Image();
        img.onload = () => {
          imgMap.set(mat.id, img);
          pending--;
          if (pending === 0 && isMounted) {
            setLoadedImages(new Map(imgMap));
          }
        };
        img.onerror = () => {
          pending--;
          if (pending === 0 && isMounted) {
            setLoadedImages(new Map(imgMap));
          }
        };
        img.src = mat.texture_data_url;
      }
    });

    if (pending === 0) {
      setLoadedImages(imgMap);
    }

    return () => {
      isMounted = false;
    };
  }, [materials]);

  // Layout parameters for multi-page grid
  const GAP_MM = 25; // 25 mm gap between sheets
  const HEADER_MM = 12; // 12 mm header for sheet label

  const cols = useMemo(() => {
    if (viewMode2d === "single_page") return 1;
    if (totalPages <= 1) return 1;
    if (totalPages <= 4) return 2;
    if (totalPages <= 9) return 3;
    return 4;
  }, [viewMode2d, totalPages]);

  const maxPageW = useMemo(() => {
    return pages.length > 0
      ? Math.max(...pages.map((p) => p.width_mm))
      : 210;
  }, [pages]);

  const maxPageH = useMemo(() => {
    return pages.length > 0
      ? Math.max(...pages.map((p) => p.height_mm))
      : 297;
  }, [pages]);

  const numRows = Math.ceil(Math.max(1, totalPages) / cols);

  // Total Artboard size in mm and px (3.78 px per mm at 96 DPI)
  const artboardW_mm = cols * maxPageW + (cols - 1) * GAP_MM;
  const artboardH_mm =
    numRows * (maxPageH + HEADER_MM) + (numRows - 1) * GAP_MM;

  const artboardPxW = artboardW_mm * 3.78;
  const artboardPxH = artboardH_mm * 3.78;

  // Fit all sheets to view
  const fitAllSheets = useCallback(() => {
    if (!containerRef.current || pages.length === 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scaleX = (clientWidth * 0.9) / artboardPxW;
    const scaleY = (clientHeight * 0.9) / artboardPxH;
    const newZoom = Math.min(scaleX, scaleY, 2.0);

    setZoom2d(Math.max(0.08, newZoom));
    setPan2d({ x: 0, y: 0 });
  }, [artboardPxW, artboardPxH, pages.length, setZoom2d, setPan2d]);

  // Fit a single page to view
  const fitPageToView = useCallback(
    (pageNumber: number) => {
      if (!containerRef.current || pages.length === 0) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const page = pages.find((p) => p.page_number === pageNumber) || pages[0];
      if (!page) return;

      if (viewMode2d === "single_page") {
        const pagePxW = page.width_mm * 3.78;
        const pagePxH = page.height_mm * 3.78;
        const scaleX = (clientWidth * 0.88) / pagePxW;
        const scaleY = (clientHeight * 0.88) / pagePxH;
        setZoom2d(Math.max(0.15, Math.min(scaleX, scaleY, 2.5)));
        setPan2d({ x: 0, y: 0 });
        setCurrentPage(pageNumber);
      } else {
        // Multi-sheet grid navigation: center camera on the chosen sheet
        const pageIdx = pages.findIndex((p) => p.page_number === pageNumber);
        if (pageIdx === -1) return;

        const col = pageIdx % cols;
        const row = Math.floor(pageIdx / cols);

        // Center of that page relative to the artboard center
        const pageCenterMmX =
          col * (maxPageW + GAP_MM) + page.width_mm / 2 - artboardW_mm / 2;
        const pageCenterMmY =
          row * (maxPageH + HEADER_MM + GAP_MM) +
          (HEADER_MM + page.height_mm) / 2 -
          artboardH_mm / 2;

        const pagePxW = page.width_mm * 3.78;
        const pagePxH = page.height_mm * 3.78;
        const scaleX = (clientWidth * 0.85) / pagePxW;
        const scaleY = (clientHeight * 0.85) / pagePxH;
        const targetZoom = Math.max(0.2, Math.min(scaleX, scaleY, 2.0));

        setZoom2d(targetZoom);
        setPan2d({
          x: -pageCenterMmX * 3.78 * targetZoom,
          y: -pageCenterMmY * 3.78 * targetZoom,
        });
        setCurrentPage(pageNumber);
      }
    },
    [
      pages,
      viewMode2d,
      cols,
      maxPageW,
      maxPageH,
      artboardW_mm,
      artboardH_mm,
      GAP_MM,
      HEADER_MM,
      setZoom2d,
      setPan2d,
      setCurrentPage,
    ]
  );

  // Initial fit when document loads
  useEffect(() => {
    if (pages.length > 0) {
      fitAllSheets();
    }
  }, [currentDocument?.metadata.file_name, fitAllSheets]);

  // Mouse wheel zoom (anchored around cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom2d((z) => Math.min(6.0, Math.max(0.05, z * zoomFactor)));
    } else {
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
      setIsPanning(true);
      setHasMovedDuringDrag(false);
      setDragStart({ x: e.clientX - pan2d.x, y: e.clientY - pan2d.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setHasMovedDuringDrag(true);
      setPan2d({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleBackgroundClick = () => {
    // Only deselect if the user clicked without panning
    if (!hasMovedDuringDrag) {
      clearSelection();
    }
  };

  if (!currentDocument || pages.length === 0) {
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
      onClick={handleBackgroundClick}
    >
      {/* 2D Canvas Artboard Container with Pan & Zoom Transform */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan2d.x}px, ${pan2d.y}px) scale(${zoom2d})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.05s ease-out",
        }}
      >
        <div
          className="pointer-events-auto relative"
          style={{
            width: `${artboardPxW}px`,
            height: `${artboardPxH}px`,
          }}
        >
          {viewMode2d === "all_sheets" ? (
            // All Sheets Grid Artboard View (Pepakura style)
            pages.map((page, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);

              const leftPx = col * (maxPageW + GAP_MM) * 3.78;
              const topPx = row * (maxPageH + HEADER_MM + GAP_MM) * 3.78;
              const widthPx = page.width_mm * 3.78;
              const heightPx = page.height_mm * 3.78;
              const headerPx = HEADER_MM * 3.78;

              const isPageActive = currentPage === page.page_number;
              const hasSelection =
                selectedPartId !== null &&
                page.parts.some((p) => p.part_id === selectedPartId);

              return (
                <div
                  key={`sheet-${page.page_number}`}
                  className="absolute transition-all duration-150"
                  style={{
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx + headerPx}px`,
                  }}
                  onClick={() => {
                    // Clicking sheet area focuses this sheet
                    setCurrentPage(page.page_number);
                  }}
                >
                  {/* Sheet Header Badge */}
                  <div
                    className="flex items-center justify-between pb-2 px-1 cursor-pointer"
                    style={{ height: `${headerPx}px` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fitPageToView(page.page_number);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded shadow-sm transition ${
                          hasSelection
                            ? "bg-sky-500 text-white font-bold ring-2 ring-sky-400"
                            : isPageActive
                            ? "bg-neutral-800 text-sky-400 border border-neutral-700"
                            : "bg-neutral-900/80 text-neutral-400 border border-neutral-800"
                        }`}
                      >
                        Sheet {page.page_number} of {totalPages}
                      </span>
                      {hasSelection && (
                        <span className="text-[11px] text-sky-400 font-medium animate-pulse">
                          ● Selected Part
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-neutral-500 font-mono">
                      {page.width_mm.toFixed(0)} × {page.height_mm.toFixed(0)} mm • {page.parts.length} parts
                    </span>
                  </div>

                  {/* Sheet Canvas Card */}
                  <div
                    className={`rounded-sm overflow-hidden transition-all duration-200 ${
                      hasSelection
                        ? "ring-2 ring-sky-500 shadow-2xl shadow-sky-500/20"
                        : isPageActive
                        ? "ring-1 ring-neutral-700 shadow-xl"
                        : "ring-1 ring-neutral-800/80 shadow-lg"
                    }`}
                  >
                    <PageCanvas
                      page={page}
                      materials={materials}
                      loadedImages={loadedImages}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            // Single Page View
            activePage && (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex items-center justify-between w-full px-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-sky-400 border border-neutral-700">
                    Sheet {activePage.page_number} of {totalPages}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {activePage.width_mm.toFixed(0)} × {activePage.height_mm.toFixed(0)} mm • {activePage.parts.length} parts
                  </span>
                </div>
                <div className="rounded-sm overflow-hidden ring-1 ring-neutral-700 shadow-2xl">
                  <PageCanvas
                    page={activePage}
                    materials={materials}
                    loadedImages={loadedImages}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Floating 2D Controls (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-neutral-800/80 bg-neutral-900/90 p-1 backdrop-blur-md shadow-lg shadow-black/40">
        {/* View Mode Toggle: All Sheets vs Single Page */}
        <div className="flex items-center rounded-md bg-neutral-950/60 p-0.5 border border-neutral-800/60">
          <button
            onClick={() => setViewMode2d("all_sheets")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
              viewMode2d === "all_sheets"
                ? "bg-neutral-800 text-sky-400 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="All Sheets View (Pepakura style)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>All Sheets ({totalPages})</span>
          </button>

          <button
            onClick={() => setViewMode2d("single_page")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
              viewMode2d === "single_page"
                ? "bg-neutral-800 text-sky-400 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="Single Sheet View"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Single</span>
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Page Selector Jump Menu */}
        <select
          value={currentPage}
          onChange={(e) => {
            const pageNum = parseInt(e.target.value, 10);
            fitPageToView(pageNum);
          }}
          className="rounded bg-neutral-950 border border-neutral-800 px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-sky-500"
        >
          {pages.map((p) => (
            <option key={p.page_number} value={p.page_number}>
              Sheet {p.page_number} of {totalPages}
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom2d((z) => Math.min(6.0, z * 1.25))}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <span className="w-12 text-center text-xs text-neutral-400 font-mono">
            {Math.round(zoom2d * 100)}%
          </span>

          <button
            onClick={() => setZoom2d((z) => Math.max(0.05, z / 1.25))}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={fitAllSheets}
            className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            title="Fit All Sheets to View"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Layer Quick Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFaceFills(!showFaceFills)}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border transition ${
              showFaceFills
                ? "border-sky-500/40 bg-sky-950/40 text-sky-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
            title="Toggle Textures and Colors"
          >
            <ImageIcon className="h-3 w-3" />
            <span>Colors</span>
          </button>

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

      {/* Floating Document Specs (Bottom Right) */}
      <div className="absolute bottom-3 right-3 rounded border border-neutral-800/80 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-400 backdrop-blur-sm pointer-events-none">
        <span>
          {viewMode2d === "all_sheets"
            ? `${totalPages} Sheets • ${currentDocument.metadata.total_unfolded_parts} parts total`
            : `Sheet ${activePage?.page_number || 1} • ${activePage?.parts.length || 0} parts`}
        </span>
      </div>
    </div>
  );
};
