import React from "react";
import { Page2dDto } from "@/types/document";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";

interface PageCanvasProps {
  page: Page2dDto;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({ page }) => {
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

  const marginW = page.width_mm - (page.margin_left_mm + page.margin_right_mm);
  const marginH = page.height_mm - (page.margin_top_mm + page.margin_bottom_mm);

  return (
    <svg
      width={`${page.width_mm}mm`}
      height={`${page.height_mm}mm`}
      viewBox={`0 0 ${page.width_mm} ${page.height_mm}`}
      className="drop-shadow-2xl transition-shadow duration-200"
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      {/* 1. Page Background & Margins */}
      <rect
        x={0}
        y={0}
        width={page.width_mm}
        height={page.height_mm}
        fill="#ffffff"
      />

      {showPageMargins && (
        <rect
          x={page.margin_left_mm}
          y={page.margin_top_mm}
          width={marginW}
          height={marginH}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={0.25}
          strokeDasharray="2, 2"
        />
      )}

      {/* 2. Parts Geometry */}
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
            {/* Glue Tabs Layer (behind faces) */}
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
                    fill={isPartSelected ? "#e0f2fe" : "#f1f5f9"}
                    stroke="#94a3b8"
                    strokeWidth={0.2}
                    strokeDasharray="1.5, 1"
                  />
                );
              })}

            {/* Part Faces / Polygons */}
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
                      ? "rgba(56, 189, 248, 0.4)"
                      : isPartSelected
                      ? "rgba(186, 230, 253, 0.25)"
                      : isPartHovered
                      ? "rgba(224, 242, 254, 0.2)"
                      : showFaceFills
                      ? "rgba(248, 250, 252, 0.8)"
                      : "none"
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

            {/* Fold Lines: Mountain (Red dashed) & Valley (Blue dashed) */}
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
                />
              ))}

            {/* Edge Labels */}
            {showEdgeLabels &&
              part.edge_labels.map((lbl, lidx) => (
                <text
                  key={`lbl-${lidx}`}
                  x={lbl.position[0]}
                  y={lbl.position[1]}
                  fontSize={2.2}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  fill="#334155"
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

      {/* Page Number Watermark (Bottom Center) */}
      <text
        x={page.width_mm / 2}
        y={page.height_mm - page.margin_bottom_mm / 2}
        fontSize={3.0}
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fill="#94a3b8"
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        — {page.page_number} —
      </text>
    </svg>
  );
};
