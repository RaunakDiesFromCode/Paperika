import { create } from "zustand";

export type ShadingMode = "solid" | "wireframe" | "solid_edges";
export type CameraPreset =
  | "default"
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right"
  | "isometric";

interface ViewerSettingsState {
  // Layout
  sidebarOpen: boolean;
  activeSidebarTab: "properties" | "3d" | "2d" | "materials";
  splitRatio: number; // 0.0 to 1.0 (default 0.5)

  // 3D Viewport Settings
  shadingMode: ShadingMode;
  smoothShading: boolean;
  showEdges: boolean;
  edgeColor: string;
  edgeCreaseAngle: number;
  lightIntensity: number;
  showGrid: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  cameraType: "perspective" | "orthographic";
  cameraPreset: CameraPreset;
  bg3dColor: string;

  // 2D Viewport Settings
  currentPage: number;
  showCutLines: boolean;
  showMountainFolds: boolean;
  showValleyFolds: boolean;
  showGlueTabs: boolean;
  showEdgeLabels: boolean;
  showPageMargins: boolean;
  showFaceFills: boolean;
  zoom2d: number;
  pan2d: { x: number; y: number };

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: "properties" | "3d" | "2d" | "materials") => void;
  setSplitRatio: (ratio: number) => void;

  setShadingMode: (mode: ShadingMode) => void;
  setSmoothShading: (smooth: boolean) => void;
  setShowEdges: (show: boolean) => void;
  setEdgeColor: (color: string) => void;
  setEdgeCreaseAngle: (angle: number) => void;
  setLightIntensity: (intensity: number) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShowBoundingBox: (show: boolean) => void;
  setCameraType: (type: "perspective" | "orthographic") => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setBg3dColor: (color: string) => void;

  setCurrentPage: (page: number) => void;
  setShowCutLines: (show: boolean) => void;
  setShowMountainFolds: (show: boolean) => void;
  setShowValleyFolds: (show: boolean) => void;
  setShowGlueTabs: (show: boolean) => void;
  setShowEdgeLabels: (show: boolean) => void;
  setShowPageMargins: (show: boolean) => void;
  setShowFaceFills: (show: boolean) => void;
  setZoom2d: (zoom: number | ((prev: number) => number)) => void;
  setPan2d: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  reset2dView: () => void;
}

export const useViewerSettingsStore = create<ViewerSettingsState>((set) => ({
  sidebarOpen: true,
  activeSidebarTab: "properties",
  splitRatio: 0.5,

  // 3D Defaults
  shadingMode: "solid_edges",
  smoothShading: false,
  showEdges: true,
  edgeColor: "#262626",
  edgeCreaseAngle: 25,
  lightIntensity: 1.0,
  showGrid: true,
  showAxes: false,
  showBoundingBox: false,
  cameraType: "perspective",
  cameraPreset: "default",
  bg3dColor: "#171717",

  // 2D Defaults
  currentPage: 1,
  showCutLines: true,
  showMountainFolds: true,
  showValleyFolds: true,
  showGlueTabs: true,
  showEdgeLabels: true,
  showPageMargins: true,
  showFaceFills: true,
  zoom2d: 1.0,
  pan2d: { x: 0, y: 0 },

  // Actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, sidebarOpen: true }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.15, Math.min(0.85, ratio)) }),

  setShadingMode: (shadingMode) => set({ shadingMode }),
  setSmoothShading: (smoothShading) => set({ smoothShading }),
  setShowEdges: (showEdges) => set({ showEdges }),
  setEdgeColor: (edgeColor) => set({ edgeColor }),
  setEdgeCreaseAngle: (edgeCreaseAngle) => set({ edgeCreaseAngle }),
  setLightIntensity: (lightIntensity) => set({ lightIntensity }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowAxes: (showAxes) => set({ showAxes }),
  setShowBoundingBox: (showBoundingBox) => set({ showBoundingBox }),
  setCameraType: (cameraType) => set({ cameraType }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setBg3dColor: (bg3dColor) => set({ bg3dColor }),

  setCurrentPage: (currentPage) => set({ currentPage }),
  setShowCutLines: (showCutLines) => set({ showCutLines }),
  setShowMountainFolds: (showMountainFolds) => set({ showMountainFolds }),
  setShowValleyFolds: (showValleyFolds) => set({ showValleyFolds }),
  setShowGlueTabs: (showGlueTabs) => set({ showGlueTabs }),
  setShowEdgeLabels: (showEdgeLabels) => set({ showEdgeLabels }),
  setShowPageMargins: (showPageMargins) => set({ showPageMargins }),
  setShowFaceFills: (showFaceFills) => set({ showFaceFills }),
  setZoom2d: (zoomOrFn) =>
    set((s) => ({
      zoom2d: typeof zoomOrFn === "function" ? zoomOrFn(s.zoom2d) : zoomOrFn,
    })),
  setPan2d: (panOrFn) =>
    set((s) => ({
      pan2d: typeof panOrFn === "function" ? panOrFn(s.pan2d) : panOrFn,
    })),
  reset2dView: () => set({ zoom2d: 1.0, pan2d: { x: 0, y: 0 } }),
}));
