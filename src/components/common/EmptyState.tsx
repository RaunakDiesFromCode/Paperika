import React, { useState } from "react";
import {
  FileText,
  FolderOpen,
  Clock,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";

export const EmptyState: React.FC = () => {
  const {
    loadDocumentFromPath,
    loadDocumentFromBytes,
    recentFiles,
    removeRecentFile,
  } = useDocumentStore();

  const [isDragOver, setIsDragOver] = useState(false);

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

  // Drag and drop HTML5 handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".pdo")) {
      const arrayBuffer = await file.arrayBuffer();
      await loadDocumentFromBytes(new Uint8Array(arrayBuffer), file.name);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-full w-full flex-col items-center justify-center p-8 transition-colors ${
        isDragOver
          ? "bg-sky-950/20 border-2 border-dashed border-sky-500"
          : "bg-neutral-950"
      }`}
    >
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Logo & Headline */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl shadow-black/60">
            <img src="/logo.svg" alt="Paperika Logo" className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Paperika
          </h1>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Native macOS viewer for Pepakura Designer (<span className="font-mono text-neutral-300">.pdo</span>) files.
            Inspect 3D geometry and 2D unfolded papercraft nets.
          </p>
        </div>

        {/* Drop zone / Action button */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col items-center justify-center space-y-2 text-neutral-400">
            <UploadCloud className="h-8 w-8 text-sky-400/80" />
            <div className="text-xs">
              <span className="font-medium text-neutral-200">Drag & drop</span> your <code className="text-sky-400 font-mono">.pdo</code> file here
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-950 transition hover:bg-sky-500 hover:shadow-sky-900/50"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Choose File…</span>
            </button>
          </div>
        </div>

        {/* Recent Files List */}
        {recentFiles.length > 0 && (
          <div className="space-y-2.5 text-left">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Recent Documents</span>
            </div>
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 divide-y divide-neutral-800/60 overflow-hidden">
              {recentFiles.slice(0, 5).map((filePath) => {
                const name = filePath.split("/").pop() || filePath;
                return (
                  <div
                    key={filePath}
                    className="group flex items-center justify-between p-2.5 text-xs hover:bg-neutral-800/50 transition cursor-pointer"
                    onClick={() => loadDocumentFromPath(filePath)}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="text-neutral-200 truncate font-medium">
                        {name}
                      </span>
                      <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                        {filePath}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentFile(filePath);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 rounded transition"
                      title="Remove from recent"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
