import React from "react";
import {
  FileText,
  Layers,
  Box,
  Ruler,
  User,
  MessageSquare,
  Tag,
} from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSelectionStore } from "@/stores/useSelectionStore";

export const PropertiesPanel: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const { selectedPartId, selectedFaceId } = useSelectionStore();

  if (!currentDocument) return null;
  const { metadata, pages } = currentDocument;

  const selectedPart =
    selectedPartId !== null
      ? pages
          .flatMap((p) => p.parts)
          .find((pt) => pt.part_id === selectedPartId)
      : null;

  return (
    <div className="space-y-5 p-4 text-xs select-text">
      {/* Selection Inspection Card */}
      {(selectedPartId !== null || selectedFaceId !== null) && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-950/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <Tag className="h-3.5 w-3.5" />
            <span>Active Selection</span>
          </div>
          {selectedPart && (
            <div className="space-y-1 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Part Name:</span>
                <span className="font-medium text-neutral-200">{selectedPart.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Part ID:</span>
                <span className="font-mono">{selectedPart.part_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Page:</span>
                <span>Page {selectedPart.page_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Faces:</span>
                <span>{selectedPart.faces.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Glue Tabs:</span>
                <span>{selectedPart.glue_tabs.length}</span>
              </div>
            </div>
          )}
          {selectedFaceId !== null && (
            <div className="flex justify-between text-neutral-300 border-t border-sky-900/50 pt-1.5">
              <span className="text-neutral-500">Selected Face:</span>
              <span className="font-mono">#{selectedFaceId}</span>
            </div>
          )}
        </div>
      )}

      {/* Model Specifications */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Model Specifications
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Ruler className="h-3.5 w-3.5" />
              <span>Dimensions</span>
            </span>
            <span className="font-mono text-neutral-200">
              {metadata.model_dimensions_mm[0].toFixed(1)} ×{" "}
              {metadata.model_dimensions_mm[1].toFixed(1)} ×{" "}
              {metadata.model_dimensions_mm[2].toFixed(1)} mm
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Box className="h-3.5 w-3.5" />
              <span>Assembled Height</span>
            </span>
            <span className="font-mono text-neutral-200">
              {metadata.assembled_height_mm.toFixed(1)} mm
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Layers className="h-3.5 w-3.5" />
              <span>Objects & Parts</span>
            </span>
            <span className="font-mono text-neutral-200">
              {metadata.total_objects} objs • {metadata.total_unfolded_parts} parts
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <FileText className="h-3.5 w-3.5" />
              <span>Pages</span>
            </span>
            <span className="font-mono text-neutral-200">
              {metadata.total_pages} sheet(s)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">3D Vertices / Faces</span>
            <span className="font-mono text-neutral-400">
              {metadata.total_vertices_3d.toLocaleString()} /{" "}
              {metadata.total_faces_3d.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Document Metadata */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          File Metadata
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          {metadata.author && (
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-neutral-500 shrink-0">
                <User className="h-3.5 w-3.5" />
                <span>Author</span>
              </span>
              <span className="text-right text-neutral-200 font-medium">
                {metadata.author}
              </span>
            </div>
          )}

          {metadata.designer_id && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Software</span>
              <span className="text-neutral-300">{metadata.designer_id}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Format Version</span>
            <span className="font-mono text-neutral-300">
              {metadata.format_version}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">File Size</span>
            <span className="font-mono text-neutral-300">
              {(metadata.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>

          {metadata.comment && (
            <div className="pt-2 border-t border-neutral-800/80">
              <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Notes / Comment</span>
              </div>
              <p className="whitespace-pre-wrap text-[11px] text-neutral-400 font-sans leading-relaxed bg-neutral-900/60 p-2 rounded">
                {metadata.comment}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
