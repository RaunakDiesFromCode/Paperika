import React, { useRef, useEffect } from "react";
import { Page2dDto, MaterialDto } from "@/types/document";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { drawPageFacesToCanvas } from "@/utils/textureCanvas";

interface PageCanvasProps {
  page: Page2dDto;
  materials?: MaterialDto[];
  loadedImages?: Map<number, HTMLImageElement>;
  scale?: number;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({
  page,
  materials = [],
  loadedImages = new Map(),
  scale = 3.78, // 3.78 px per mm (96 DPI)
}) => {
  const {
    showCutLines,
    showMountainFolds,
    showValleyFolds,
    showGlueTabs,
    showEdgeLabels,
    showPageMargins,
    showFaceFills,
  } = useViewerSettingsStore();

  const {
    selectedPartId,
    selectedFaceId,
    hoveredPartId,
    selectPart,
    selectFace,
    hoverFace,
  } = useSelectionStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const marginW = page.width_mm - (page.margin_left_mm + page.margin_right_mm);
  const marginH = page.height_mm - (page.margin_top_mm + page.margin_bottom_mm);

  // Redraw canvas textures & colors when page, materials, or loaded images change
  useEffect(() => {
    if (canvasRef.current) {
      drawPageFacesToCanvas(
        canvasRef.current,
        page,
        materials,
        loadedImages,
        scale,
        true,
        showFaceFills
      );
    }
  }, [page, materials, loadedImages, scale, showFaceFills]);

  return (
    <div
      className="relative drop-shadow-2xl transition-shadow duration-200 select-none"
      style={{
        width: `${page.width_mm}mm`,
        height: `${page.height_mm}mm`,
      }}
    >
      {/* 1. HTML5 Canvas: Base texture & material color fills */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none rounded-sm"
        style={{
          width: `${page.width_mm}mm`,
          height: `${page.height_mm}mm`,
        }}
      />

      {/* 2. SVG Vector Overlay: Margins, Tabs, Cut Lines, Folds, Labels & Selection Overlays */}
      <svg
        width={`${page.width_mm}mm`}
        height={`${page.height_mm}mm`}
        viewBox={`0 0 ${page.width_mm} ${page.height_mm}`}
        className="absolute top-0 left-0"
        style={{
          backgroundColor: "transparent",
        }}
      >
        {/* Page Margins Guide */}
        {showPageMargins && (
          <rect
            x={page.margin_left_mm}
            y={page.margin_top_mm}
            width={marginW}
            height={marginH}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={0.25}
            strokeDasharray="2, 2"
            className="pointer-events-none"
          />
        )}

        {/* Parts Geometry */}
        {page.parts.map((part) => {
          const isPartSelected = selectedPartId === part.part_id;
          const isPartHovered = hoveredPartId === part.part_id;

          return (
            <g
              key={`part-${part.part_id}`}
              id={`part-${part.part_id}`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                selectPart(part.part_id);
              }}
            >
              {/* Glue Tabs Layer */}
              {showGlueTabs &&
                part.glue_tabs.map((tab, tidx) => {
                  if (tab.polygon.length < 3) return null;
                  const points = tab.polygon
                    .map((p) => `${p[0]},${p[1]}`)
                    .join(" ");

                  return (
                    <polygon
                      key={`tab-${tidx}`}
                      points={points}
                      fill={isPartSelected ? "rgba(186, 230, 253, 0.6)" : "rgba(241, 245, 249, 0.85)"}
                      stroke="#94a3b8"
                      strokeWidth={0.2}
                      strokeDasharray="1.5, 1"
                    />
                  );
                })}

              {/* Part Faces / Polygons (Transparent for texture, glowing on hover/select) */}
              {part.faces.map((face, fidx) => {
                if (face.polygon.length < 3) return null;
                const points = face.polygon
                  .map((p) => `${p[0]},${p[1]}`)
                  .join(" ");
                const isFaceSelected = selectedFaceId === face.face_id;

                return (
                  <polygon
                    key={`face-${fidx}`}
                    points={points}
                    fill={
                      isFaceSelected
                        ? "rgba(56, 189, 248, 0.45)"
                        : isPartSelected
                        ? "rgba(186, 230, 253, 0.28)"
                        : isPartHovered
                        ? "rgba(224, 242, 254, 0.2)"
                        : "transparent"
                    }
                    stroke={isFaceSelected ? "#0284c7" : "none"}
                    strokeWidth={isFaceSelected ? 0.4 : 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectFace(face.face_id, part.part_id);
                    }}
                    onMouseEnter={() => hoverFace(face.face_id, part.part_id)}
                    onMouseLeave={() => hoverFace(null, null)}
                  />
                );
              })}

              {/* Fold Lines: Mountain (Red dash-dot) & Valley (Blue dashed) */}
              {part.fold_lines.map((line, lidx) => {
                const isMountain = line.classification === "Mountain";
                const isValley = line.classification === "Valley";

                if (isMountain && !showMountainFolds) return null;
                if (isValley && !showValleyFolds) return null;

                return (
                  <line
                    key={`fold-${lidx}`}
                    x1={line.start[0]}
                    y1={line.start[1]}
                    x2={line.end[0]}
                    y2={line.end[1]}
                    stroke={isMountain ? "#dc2626" : isValley ? "#2563eb" : "#64748b"}
                    strokeWidth={0.25}
                    strokeDasharray={
                      isMountain
                        ? "3.0, 1.0, 1.0, 1.0"
                        : isValley
                        ? "2.0, 2.0"
                        : "1.5, 1.5"
                    }
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                );
              })}

              {/* Cut Lines (Solid dark border) */}
              {showCutLines &&
                part.cut_lines.map((line, lidx) => (
                  <line
                    key={`cut-${lidx}`}
                    x1={line.start[0]}
                    y1={line.start[1]}
                    x2={line.end[0]}
                    y2={line.end[1]}
                    stroke={isPartSelected ? "#0284c7" : "#0f172a"}
                    strokeWidth={isPartSelected ? 0.45 : 0.35}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                ))}

              {/* Edge Labels with halo for legibility over colored/textured backgrounds */}
              {showEdgeLabels &&
                part.edge_labels.map((lbl, lidx) => (
                  <text
                    key={`lbl-${lidx}`}
                    x={lbl.position[0]}
                    y={lbl.position[1]}
                    fontSize={2.2}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={0.4}
                    strokeLinejoin="round"
                    style={{ paintOrder: "stroke fill" }}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none font-semibold"
                  >
                    {lbl.text}
                  </text>
                ))}
            </g>
          );
        })}

        {/* Page Number Watermark */}
        <text
          x={page.width_mm / 2}
          y={page.height_mm - Math.max(3, page.margin_bottom_mm / 2)}
          fontSize={3.0}
          fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          fill="#94a3b8"
          textAnchor="middle"
          className="pointer-events-none select-none"
        >
          — {page.page_number} —
        </text>
      </svg>
    </div>
  );
};
