import React from "react";
import {
  FileText,
  Sliders,
  Layers,
  Palette,
  X,
} from "lucide-react";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { PropertiesPanel } from "../panels/PropertiesPanel";
import { SettingsPanel3D } from "../panels/SettingsPanel3D";
import { SettingsPanel2D } from "../panels/SettingsPanel2D";
import { MaterialsPanel } from "../panels/MaterialsPanel";

export const Sidebar: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    activeSidebarTab,
    setActiveSidebarTab,
  } = useViewerSettingsStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-80 h-full border-l border-neutral-800/80 bg-neutral-900/95 flex flex-col z-20 backdrop-blur-md shadow-xl select-none">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-2 py-1.5 bg-neutral-950/40">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSidebarTab("properties")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              activeSidebarTab === "properties"
                ? "bg-neutral-800 text-sky-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="Model Info"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Info</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab("3d")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              activeSidebarTab === "3d"
                ? "bg-neutral-800 text-sky-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="3D View Settings"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>3D</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab("2d")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              activeSidebarTab === "2d"
                ? "bg-neutral-800 text-sky-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="2D Sheet Layers"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>2D</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab("materials")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              activeSidebarTab === "materials"
                ? "bg-neutral-800 text-sky-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title="Materials & Textures"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Materials</span>
          </button>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Close Sidebar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeSidebarTab === "properties" && <PropertiesPanel />}
        {activeSidebarTab === "3d" && <SettingsPanel3D />}
        {activeSidebarTab === "2d" && <SettingsPanel2D />}
        {activeSidebarTab === "materials" && <MaterialsPanel />}
      </div>
    </aside>
  );
};
