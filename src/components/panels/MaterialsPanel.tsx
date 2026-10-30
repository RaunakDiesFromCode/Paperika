import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";

export const MaterialsPanel: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);

  if (!currentDocument) return null;
  const { materials } = currentDocument;

  return (
    <div className="space-y-4 p-4 text-xs select-none">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Materials & Textures ({materials.length})
        </h4>
      </div>

      <div className="space-y-2">
        {materials.map((mat) => {
          const rgba = mat.diffuse_rgba || mat.color_rgba || [0.8, 0.8, 0.8, 1.0];
          const colorCss = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(
            rgba[1] * 255
          )}, ${Math.round(rgba[2] * 255)}, ${rgba[3] ?? 1.0})`;

          return (
            <div
              key={mat.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2.5 transition hover:border-neutral-700/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-neutral-700 shadow-sm"
                    style={{ backgroundColor: colorCss }}
                  />
                  <span className="font-medium text-neutral-200">
                    {mat.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  ID: {mat.id}
                </span>
              </div>

              {mat.has_texture && mat.texture_data_url ? (
                <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
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
                  Solid material (no bitmap texture)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
