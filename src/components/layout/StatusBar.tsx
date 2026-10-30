import React from "react";
import { Tag } from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";

export const StatusBar: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const { selectedPartId, selectedFaceId, hoveredPartId } = useSelectionStore();
  const { currentPage } = useViewerSettingsStore();

  if (!currentDocument) {
    return (
      <footer className="flex h-6 w-full items-center justify-between border-t border-neutral-800/80 bg-neutral-900/95 px-3 text-[11px] text-neutral-500 select-none">
        <span>Ready</span>
        <span>No document open</span>
      </footer>
    );
  }

  const { metadata, pages } = currentDocument;
  const activePartId = hoveredPartId ?? selectedPartId;
  const activePart =
    activePartId !== null
      ? pages
          .flatMap((p) => p.parts)
          .find((pt) => pt.part_id === activePartId)
      : null;

  return (
    <footer className="flex h-6 w-full items-center justify-between border-t border-neutral-800/80 bg-neutral-900/95 px-3 text-[11px] text-neutral-400 select-none z-20">
      {/* Left: Document details */}
      <div className="flex items-center gap-3">
        <span className="font-medium text-neutral-300 truncate max-w-[240px]">
          {metadata.file_name}
        </span>
        <span className="font-mono text-neutral-500">
          {(metadata.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
        </span>
        <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[10px] font-mono text-neutral-400">
          {metadata.format_version}
        </span>
      </div>

      {/* Center: Selection status */}
      <div className="flex items-center gap-2 text-neutral-300">
        {activePart ? (
          <span className="flex items-center gap-1.5 text-sky-400 font-medium">
            <Tag className="h-3 w-3" />
            <span>
              Part: {activePart.name} (#{activePart.part_id}) on Page{" "}
              {activePart.page_number}
            </span>
            {selectedFaceId !== null && (
              <span className="text-neutral-400 font-normal">
                • Face #{selectedFaceId}
              </span>
            )}
          </span>
        ) : (
          <span className="text-neutral-500">
            Click face or part to inspect & synchronize 3D/2D
          </span>
        )}
      </div>

      {/* Right: Counters */}
      <div className="flex items-center gap-3 font-mono text-neutral-400">
        <span title="3D Vertices">
          {metadata.total_vertices_3d.toLocaleString()} v
        </span>
        <span title="3D Faces">
          {metadata.total_faces_3d.toLocaleString()} f
        </span>
        <span title="Unfolded Parts">
          {metadata.total_unfolded_parts} parts
        </span>
        <span title="Active Page">
          Page {currentPage} / {metadata.total_pages}
        </span>
      </div>
    </footer>
  );
};
