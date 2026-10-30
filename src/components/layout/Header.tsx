import React, { useState } from "react";
import {
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  Printer,
  Download,
} from "lucide-react";

import { useDocumentStore } from "@/stores/useDocumentStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { ExportModal } from "@/features/export/ExportModal";

export const Header: React.FC = () => {
  const { currentDocument, loadDocumentFromPath } = useDocumentStore();
  const {
    sidebarOpen,
    toggleSidebar,
    splitRatio,
    setSplitRatio,
  } = useViewerSettingsStore();

  const [showExportModal, setShowExportModal] = useState(false);

  const handleOpenFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Pepakura PDO Document",
            extensions: ["pdo"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await loadDocumentFromPath(selected);
      }
    } catch (err) {
      console.error("Open file error:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <header className="flex h-12 w-full items-center justify-between border-b border-neutral-800/80 bg-neutral-900/90 px-3 backdrop-blur-md z-20 select-none">
        {/* Left: Branding & Open File */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Paperika" className="h-6 w-6" />
            <span className="font-semibold text-sm tracking-tight text-neutral-100">
              Paperika
            </span>
          </div>

          <button
            onClick={handleOpenFile}
            className="flex items-center gap-1.5 rounded-md border border-neutral-700/80 bg-neutral-800/80 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:bg-neutral-700/80 hover:text-white hover:border-neutral-600 shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
            <span>Open PDO</span>
          </button>

          {currentDocument && (
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <span className="text-xs font-medium text-neutral-300 truncate max-w-[200px]" title={currentDocument.metadata.file_name}>
                {currentDocument.metadata.file_name}
              </span>
              <span className="rounded bg-neutral-800/80 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400">
                {currentDocument.metadata.format_version}
              </span>
            </div>
          )}
        </div>

        {/* Center: Viewport Layout Modes */}
        {currentDocument && (
          <div className="flex items-center rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-0.5">
            <button
              onClick={() => setSplitRatio(0.99)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                splitRatio > 0.85
                  ? "bg-neutral-800 text-sky-400 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="3D View Only"
            >
              3D View
            </button>
            <button
              onClick={() => setSplitRatio(0.5)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                splitRatio >= 0.35 && splitRatio <= 0.65
                  ? "bg-neutral-800 text-sky-400 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Split View (3D & 2D Pattern)"
            >
              Split View
            </button>
            <button
              onClick={() => setSplitRatio(0.01)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                splitRatio < 0.15
                  ? "bg-neutral-800 text-sky-400 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="2D Unfolded Sheets Only"
            >
              2D Sheets
            </button>
          </div>
        )}

        {/* Right: Export, Print, and Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {currentDocument && (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-850 px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                title="Export SVG or PDF"
              >
                <Download className="h-3.5 w-3.5 text-neutral-400" />
                <span>Export</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1 rounded-md border border-neutral-800 p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
                title="Print Pages"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-neutral-800" />
            </>
          )}

          <button
            onClick={toggleSidebar}
            className={`rounded-md border p-1.5 transition ${
              sidebarOpen
                ? "border-neutral-700 bg-neutral-800 text-sky-400"
                : "border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
            title="Toggle Inspector Sidebar"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Export Modal */}
      {showExportModal && currentDocument && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </>
  );
};
