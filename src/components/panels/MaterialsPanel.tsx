import React from "react";
import { Image as ImageIcon, Palette } from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";

const PRESET_COLORS = [
  { name: "Sky Blue", hex: "#38bdf8", rgba: [0.22, 0.74, 0.97, 1.0] as [number, number, number, number] },
  { name: "Guards Red", hex: "#ef4444", rgba: [0.94, 0.27, 0.27, 1.0] as [number, number, number, number] },
  { name: "Racing Yellow", hex: "#eab308", rgba: [0.92, 0.70, 0.03, 1.0] as [number, number, number, number] },
  { name: "Emerald Green", hex: "#10b981", rgba: [0.06, 0.72, 0.51, 1.0] as [number, number, number, number] },
  { name: "Medium Gray", hex: "#808080", rgba: [0.5, 0.5, 0.5, 1.0] as [number, number, number, number] },
  { name: "Pure White", hex: "#f8fafc", rgba: [0.97, 0.98, 0.99, 1.0] as [number, number, number, number] },
  { name: "Dark Slate", hex: "#1e293b", rgba: [0.12, 0.16, 0.23, 1.0] as [number, number, number, number] },
];

export const MaterialsPanel: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const updateMaterialColor = useDocumentStore((s) => s.updateMaterialColor);

  if (!currentDocument) return null;
  const { materials } = currentDocument;

  const hexToRgba = (hex: string): [number, number, number, number] => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return [r, g, b, 1.0];
  };

  const rgbaToHex = (rgba: [number, number, number, number]): string => {
    const r = Math.min(255, Math.max(0, Math.round(rgba[0] * 255)))
      .toString(16)
      .padStart(2, "0");
    const g = Math.min(255, Math.max(0, Math.round(rgba[1] * 255)))
      .toString(16)
      .padStart(2, "0");
    const b = Math.min(255, Math.max(0, Math.round(rgba[2] * 255)))
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  return (
    <div className="space-y-4 p-4 text-xs select-none">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Materials & Textures ({materials.length})
        </h4>
      </div>

      <div className="space-y-3">
        {materials.map((mat) => {
          const rgba = mat.diffuse_rgba || mat.color_rgba || [0.5, 0.5, 0.5, 1.0];
          const hex = rgbaToHex(rgba);

          return (
            <div
              key={mat.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-3 transition hover:border-neutral-700/80 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Interactive Color Picker Swatch */}
                  <label
                    className="relative flex items-center justify-center h-6 w-6 rounded-full border border-neutral-600 shadow-md cursor-pointer transition hover:scale-110"
                    style={{ backgroundColor: hex }}
                    title="Click to customize material color"
                  >
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => {
                        updateMaterialColor(mat.id, hexToRgba(e.target.value));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                    />
                  </label>

                  <div>
                    <span className="font-semibold text-neutral-200 block">
                      {mat.name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ID: {mat.id} • {hex.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Color Presets for Solid Materials */}
              {!mat.has_texture && (
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                    <Palette className="h-3 w-3 text-sky-400" />
                    <span>Quick Color Swatches:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => updateMaterialColor(mat.id, preset.rgba)}
                        style={{ backgroundColor: preset.hex }}
                        className="h-4 w-4 rounded-full border border-neutral-700 shadow-sm transition hover:scale-125 focus:ring-1 focus:ring-sky-400"
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Texture Preview if Texture is present */}
              {mat.has_texture && mat.texture_data_url ? (
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                      <span>Extracted Texture</span>
                    </span>
                    <span className="font-mono text-neutral-500">
                      {mat.texture_width} × {mat.texture_height} px
                    </span>
                  </div>

                  <div className="h-24 w-full rounded border border-neutral-800 bg-neutral-900/60 overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={mat.texture_data_url}
                      alt={mat.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic">
                  Solid material (no bitmap texture embedded in PDO)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
