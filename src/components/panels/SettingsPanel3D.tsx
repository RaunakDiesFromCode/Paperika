import React from "react";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";

export const SettingsPanel3D: React.FC = () => {
  const {
    shadingMode,
    setShadingMode,
    smoothShading,
    setSmoothShading,
    showEdges,
    setShowEdges,
    edgeColor,
    setEdgeColor,
    lightIntensity,
    setLightIntensity,
    showGrid,
    setShowGrid,
    showAxes,
    setShowAxes,
    showBoundingBox,
    setShowBoundingBox,
    bg3dColor,
    setBg3dColor,
  } = useViewerSettingsStore();

  return (
    <div className="space-y-5 p-4 text-xs select-none">
      {/* Shading & Surface */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Shading & Surface
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-3">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1.5">
              Render Mode
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-900 p-1 border border-neutral-800">
              <button
                onClick={() => setShadingMode("solid_edges")}
                className={`rounded py-1 text-[11px] font-medium transition ${
                  shadingMode === "solid_edges"
                    ? "bg-neutral-800 text-sky-400"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Solid+Edges
              </button>
              <button
                onClick={() => setShadingMode("solid")}
                className={`rounded py-1 text-[11px] font-medium transition ${
                  shadingMode === "solid"
                    ? "bg-neutral-800 text-sky-400"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => setShadingMode("wireframe")}
                className={`rounded py-1 text-[11px] font-medium transition ${
                  shadingMode === "wireframe"
                    ? "bg-neutral-800 text-sky-400"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Wireframe
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Smooth Shading (Interpolate Normals)</span>
            <input
              type="checkbox"
              checked={smoothShading}
              onChange={(e) => setSmoothShading(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Crease Edges */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Geometric Feature Edges
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Show Edges</span>
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {showEdges && (
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
              <span className="text-neutral-400">Edge Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={edgeColor}
                  onChange={(e) => setEdgeColor(e.target.value)}
                  className="h-6 w-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[11px] text-neutral-400">{edgeColor}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lighting Setup */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Environment & Lighting
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-3">
          <div>
            <div className="flex justify-between text-neutral-300 mb-1">
              <span>Light Intensity</span>
              <span className="font-mono text-neutral-400">{lightIntensity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
            <span className="text-neutral-400">Viewport Background</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg3dColor}
                onChange={(e) => setBg3dColor(e.target.value)}
                className="h-6 w-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-neutral-400">{bg3dColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Helpers */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Viewport Helpers
        </h4>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Ground Grid</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">World Coordinate Axes</span>
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Bounding Box Wireframe</span>
            <input
              type="checkbox"
              checked={showBoundingBox}
              onChange={(e) => setShowBoundingBox(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
