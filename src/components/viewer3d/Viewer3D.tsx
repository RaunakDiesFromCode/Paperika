import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Box } from "@react-three/drei";
import * as THREE from "three";
import {
  Box as BoxIcon,
  Compass,
  Layers,
  Maximize2,
} from "lucide-react";

import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import {
  useViewerSettingsStore,
  CameraPreset,
} from "@/stores/useViewerSettingsStore";
import { MeshRenderer } from "./MeshRenderer";
import { CameraManager } from "./CameraManager";

export const Viewer3D: React.FC = () => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const {
    shadingMode,
    setShadingMode,
    smoothShading,
    showEdges,
    setShowEdges,
    edgeColor,
    lightIntensity,
    showGrid,
    setShowGrid,
    showAxes,
    showBoundingBox,
    setShowBoundingBox,
    cameraPreset,
    setCameraPreset,
    bg3dColor,
  } = useViewerSettingsStore();

  const orbitControlsRef = useRef<any>(null);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const { clearSelection } = useSelectionStore();

  if (!currentDocument) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900/60 text-neutral-500">
        <p className="text-sm">No 3D model loaded</p>
      </div>
    );
  }

  const { geometry_3d, materials } = currentDocument;
  const center = new THREE.Vector3(
    geometry_3d.center[0],
    geometry_3d.center[1],
    geometry_3d.center[2]
  );

  const maxDim = Math.max(
    geometry_3d.size[0] || 1,
    geometry_3d.size[1] || 1,
    geometry_3d.size[2] || 1
  );

  const handleResetCamera = () => {
    setCameraPreset("default");
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(center);
      orbitControlsRef.current.update();
    }
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-neutral-950">
      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMissed={(e) => {
          // Deselect if it was a stationary click/tap outside any 3D object
          const dx = Math.abs(e.clientX - pointerDownPos.current.x);
          const dy = Math.abs(e.clientY - pointerDownPos.current.y);
          if (dx < 6 && dy < 6) {
            clearSelection();
          }
        }}
        camera={{
          position: [center.x + maxDim * 1.5, center.y + maxDim, center.z + maxDim * 1.8],
          fov: 45,
          near: 0.1,
          far: maxDim * 20,
        }}
      >
        <color attach="background" args={[bg3dColor]} />

        {/* Lighting Setup */}
        <ambientLight intensity={0.45 * lightIntensity} />
        <hemisphereLight
          intensity={0.35 * lightIntensity}
          color="#f8fafc"
          groundColor="#334155"
        />
        <directionalLight
          position={[center.x + maxDim * 2, center.y + maxDim * 3, center.z + maxDim * 2]}
          intensity={0.9 * lightIntensity}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight
          position={[center.x - maxDim * 2, center.y - maxDim, center.z - maxDim * 2]}
          intensity={0.3 * lightIntensity}
        />

        {/* Interactive Controls */}
        <OrbitControls
          ref={orbitControlsRef}
          target={center}
          enableDamping
          dampingFactor={0.08}
          minDistance={maxDim * 0.1}
          maxDistance={maxDim * 10}
        />

        {/* Camera Preset Manager */}
        <CameraManager
          geometry={geometry_3d}
          cameraPreset={cameraPreset}
          onPresetApplied={() => {
            if (orbitControlsRef.current) {
              orbitControlsRef.current.target.copy(center);
              orbitControlsRef.current.update();
            }
          }}
        />

        {/* Ground Grid Layer */}
        {showGrid && (
          <Grid
            position={[center.x, geometry_3d.bounding_box_min[1] - 0.05, center.z]}
            args={[maxDim * 4, maxDim * 4]}
            cellSize={maxDim * 0.1}
            cellThickness={0.6}
            cellColor="#262626"
            sectionSize={maxDim * 0.5}
            sectionThickness={1.2}
            sectionColor="#404040"
            fadeDistance={maxDim * 5}
            infiniteGrid
          />
        )}

        {/* World Axes */}
        {showAxes && (
          <axesHelper
            position={[center.x, center.y, center.z]}
            args={[maxDim * 0.6]}
          />
        )}

        {/* Bounding Box Wireframe */}
        {showBoundingBox && (
          <Box
            position={center}
            args={[geometry_3d.size[0], geometry_3d.size[1], geometry_3d.size[2]]}
          >
            <meshBasicMaterial
              wireframe
              color="#38bdf8"
              transparent
              opacity={0.3}
            />
          </Box>
        )}

        {/* 3D Geometry and Creases */}
        <Suspense fallback={null}>
          <MeshRenderer
            geometry={geometry_3d}
            materials={materials}
            shadingMode={shadingMode}
            smoothShading={smoothShading}
            showEdges={showEdges}
            edgeColor={edgeColor}
          />
        </Suspense>
      </Canvas>

      {/* Floating 3D Control Bar (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-neutral-800/80 bg-neutral-900/90 p-1 backdrop-blur-md shadow-lg shadow-black/40">
        {/* Shading mode */}
        <div className="flex items-center rounded-md bg-neutral-950/60 p-0.5 border border-neutral-800/60">
          <button
            onClick={() => setShadingMode("solid_edges")}
            title="Solid + Edges"
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              shadingMode === "solid_edges"
                ? "bg-neutral-800 text-sky-400 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Solid+Edges
          </button>
          <button
            onClick={() => setShadingMode("solid")}
            title="Solid Shading"
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              shadingMode === "solid"
                ? "bg-neutral-800 text-sky-400 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => setShadingMode("wireframe")}
            title="Wireframe"
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              shadingMode === "wireframe"
                ? "bg-neutral-800 text-sky-400 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Wireframe
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Camera Views Selector */}
        <div className="relative flex items-center">
          <select
            value={cameraPreset}
            onChange={(e) => setCameraPreset(e.target.value as CameraPreset)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs font-medium text-neutral-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            title="Camera Perspective Presets"
          >
            <option value="default">Isometric</option>
            <option value="front">Front View</option>
            <option value="back">Back View</option>
            <option value="top">Top View</option>
            <option value="bottom">Bottom View</option>
            <option value="left">Left View</option>
            <option value="right">Right View</option>
          </select>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Edge toggle */}
        <button
          onClick={() => setShowEdges(!showEdges)}
          className={`flex items-center gap-1 rounded p-1.5 text-xs transition ${
            showEdges
              ? "bg-neutral-800 text-sky-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
          title="Toggle 3D Edges"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-1 rounded p-1.5 text-xs transition ${
            showGrid
              ? "bg-neutral-800 text-sky-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
          title="Toggle Ground Grid"
        >
          <Compass className="h-3.5 w-3.5" />
        </button>

        {/* Bounding box toggle */}
        <button
          onClick={() => setShowBoundingBox(!showBoundingBox)}
          className={`flex items-center gap-1 rounded p-1.5 text-xs transition ${
            showBoundingBox
              ? "bg-neutral-800 text-sky-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
          title="Toggle Bounding Box"
        >
          <BoxIcon className="h-3.5 w-3.5" />
        </button>

        {/* Fit / Reset Camera */}
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1 rounded p-1.5 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
          title="Reset View & Fit Model"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating 3D Dimensions Indicator (Bottom Right) */}
      <div className="absolute bottom-3 right-3 rounded border border-neutral-800/80 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-400 backdrop-blur-sm pointer-events-none">
        <span>
          {geometry_3d.size[0].toFixed(1)} × {geometry_3d.size[1].toFixed(1)} ×{" "}
          {geometry_3d.size[2].toFixed(1)} mm
        </span>
      </div>
    </div>
  );
};
