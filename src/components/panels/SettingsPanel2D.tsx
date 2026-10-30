import React from "react";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

export const SettingsPanel2D: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const {
    currentPage,
    setCurrentPage,
    showCutLines,
    setShowCutLines,
    showMountainFolds,
    setShowMountainFolds,
    showValleyFolds,
    setShowValleyFolds,
    showGlueTabs,
    setShowGlueTabs,
    showEdgeLabels,
    setShowEdgeLabels,
    showPageMargins,
    setShowPageMargins,
    showFaceFills,
    setShowFaceFills,
  } = useViewerSettingsStore();

  const totalPages = currentDocument?.pages.length || 1;

  return (
    <div className="space-y-5 p-4 text-xs select-none">
      {/* Page Navigation */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Page Navigation
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Active Page</span>
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
              className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <option key={pg} value={pg}>
                  Page {pg} of {totalPages}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Layer Visibility */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Layer Visibility
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-neutral-900 border border-neutral-700" />
              <span className="text-neutral-300">Outer Cut Lines</span>
            </div>
            <input
              type="checkbox"
              checked={showCutLines}
              onChange={(e) => setShowCutLines(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-red-600" />
              <span className="text-neutral-300">Mountain Folds</span>
            </div>
            <input
              type="checkbox"
              checked={showMountainFolds}
              onChange={(e) => setShowMountainFolds(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-blue-600" />
              <span className="text-neutral-300">Valley Folds</span>
            </div>
            <input
              type="checkbox"
              checked={showValleyFolds}
              onChange={(e) => setShowValleyFolds(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-emerald-600" />
              <span className="text-neutral-300">Glue Tabs</span>
            </div>
            <input
              type="checkbox"
              checked={showGlueTabs}
              onChange={(e) => setShowGlueTabs(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-amber-500" />
              <span className="text-neutral-300">Edge ID Numbers</span>
            </div>
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-neutral-400" />
              <span className="text-neutral-300">Page Margins</span>
            </div>
            <input
              type="checkbox"
              checked={showPageMargins}
              onChange={(e) => setShowPageMargins(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-sm bg-neutral-200" />
              <span className="text-neutral-300">Subtle Face Fills</span>
            </div>
            <input
              type="checkbox"
              checked={showFaceFills}
              onChange={(e) => setShowFaceFills(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
