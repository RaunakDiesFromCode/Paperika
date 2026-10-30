import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Geometry3dDto, MaterialDto } from "@/types/document";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { ShadingMode } from "@/stores/useViewerSettingsStore";

interface MeshRendererProps {
  geometry: Geometry3dDto;
  materials: MaterialDto[];
  shadingMode: ShadingMode;
  smoothShading: boolean;
  showEdges: boolean;
  edgeColor: string;
}

export const MeshRenderer: React.FC<MeshRendererProps> = ({
  geometry,
  materials,
  shadingMode,
  smoothShading,
  showEdges,
  edgeColor,
}) => {
  const {
    selectedFaceId,
    selectedPartId,
    selectFace,
    hoverFace,
  } = useSelectionStore();

  // Create & cache Three.js textures
  const textureMap = useMemo(() => {
    const map = new Map<number, THREE.Texture>();
    const loader = new THREE.TextureLoader();

    materials.forEach((mat) => {
      if (mat.has_texture && mat.texture_data_url) {
        const tex = loader.load(mat.texture_data_url);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        map.set(mat.id, tex);
      }
    });

    return map;
  }, [materials]);

  // Clean up textures on unmount or materials change
  useEffect(() => {
    return () => {
      textureMap.forEach((tex) => tex.dispose());
    };
  }, [textureMap]);

  // Build Three.js BufferGeometries for submeshes
  const submeshData = useMemo(() => {
    return geometry.meshes.map((mesh) => {
      const geom = new THREE.BufferGeometry();

      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(mesh.positions, 3)
      );

      if (mesh.normals.length > 0) {
        geom.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(mesh.normals, 3)
        );
      }

      if (mesh.uvs.length > 0) {
        geom.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(mesh.uvs, 2)
        );
      }

      geom.setIndex(mesh.indices);

      if (smoothShading) {
        geom.computeVertexNormals();
      }

      return {
        geom,
        mesh,
      };
    });
  }, [geometry.meshes, smoothShading]);

  // Dispose geometries on unmount or recompute
  useEffect(() => {
    return () => {
      submeshData.forEach(({ geom }) => geom.dispose());
    };
  }, [submeshData]);

  // Build line segments geometry for feature edges
  const edgeLineSegments = useMemo(() => {
    if (!showEdges || geometry.edges.length === 0) return null;

    const positions: number[] = [];
    geometry.edges.forEach((edge) => {
      if (edge.is_crease) {
        positions.push(
          edge.start[0],
          edge.start[1],
          edge.start[2],
          edge.end[0],
          edge.end[1],
          edge.end[2]
        );
      }
    });

    if (positions.length === 0) return null;

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return lineGeom;
  }, [geometry.edges, showEdges]);

  useEffect(() => {
    return () => {
      edgeLineSegments?.dispose();
    };
  }, [edgeLineSegments]);

  // Handle face raycasting & selection
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.faceIndex === undefined || e.faceIndex === null) return;

    // Find which submesh was clicked
    const meshObj = e.object as THREE.Mesh;
    const meshIdx = submeshData.findIndex((d) => d.geom === meshObj.geometry);
    if (meshIdx === -1) return;

    const { mesh } = submeshData[meshIdx];
    const faceId = mesh.face_ids[e.faceIndex];
    const partId = mesh.part_ids[e.faceIndex];

    if (faceId !== undefined && partId !== undefined) {
      selectFace(faceId, partId);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.faceIndex === undefined || e.faceIndex === null) return;

    const meshObj = e.object as THREE.Mesh;
    const meshIdx = submeshData.findIndex((d) => d.geom === meshObj.geometry);
    if (meshIdx === -1) return;

    const { mesh } = submeshData[meshIdx];
    const faceId = mesh.face_ids[e.faceIndex];
    const partId = mesh.part_ids[e.faceIndex];

    if (faceId !== undefined && partId !== undefined) {
      hoverFace(faceId, partId);
    }
  };

  const handlePointerLeave = () => {
    hoverFace(null, null);
  };

  return (
    <group>
      {/* 3D Meshes */}
      {submeshData.map(({ geom, mesh }, idx) => {
        const mat = materials.find((m) => m.id === mesh.material_index);
        const texture = mat ? textureMap.get(mat.id) : null;

        // Base color
        const baseColor = mat
          ? new THREE.Color(
              mat.diffuse_rgba[0] || mat.color_rgba[0] || 0.85,
              mat.diffuse_rgba[1] || mat.color_rgba[1] || 0.85,
              mat.diffuse_rgba[2] || mat.color_rgba[2] || 0.85
            )
          : new THREE.Color("#d1d5db");

        const isPartSelected =
          selectedPartId !== null &&
          mesh.part_ids.some((pid) => pid === selectedPartId);

        return (
          <mesh
            key={`mesh-${mesh.object_index}-${idx}`}
            geometry={geom}
            castShadow
            receiveShadow
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            {shadingMode === "wireframe" ? (
              <meshBasicMaterial
                wireframe
                color={isPartSelected ? "#38bdf8" : "#94a3b8"}
                side={THREE.DoubleSide}
              />
            ) : (
              <meshStandardMaterial
                map={texture || undefined}
                color={
                  isPartSelected
                    ? new THREE.Color("#93c5fd")
                    : texture
                    ? "#ffffff"
                    : baseColor
                }
                roughness={0.65}
                metalness={0.1}
                side={THREE.DoubleSide}
                polygonOffset={true}
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            )}
          </mesh>
        );
      })}

      {/* Feature Edges Overlay */}
      {showEdges && edgeLineSegments && shadingMode !== "wireframe" && (
        <lineSegments geometry={edgeLineSegments}>
          <lineBasicMaterial
            color={new THREE.Color(edgeColor)}
            linewidth={1}
            depthTest={true}
          />
        </lineSegments>
      )}

      {/* Selected Face Highlight */}
      {selectedFaceId !== null && (
        <SelectedFaceHighlight
          geometry={geometry}
          selectedFaceId={selectedFaceId}
        />
      )}
    </group>
  );
};

// Subcomponent to highlight specifically selected face
const SelectedFaceHighlight: React.FC<{
  geometry: Geometry3dDto;
  selectedFaceId: number;
}> = ({ geometry, selectedFaceId }) => {
  const highlightGeom = useMemo(() => {
    const positions: number[] = [];

    geometry.meshes.forEach((mesh) => {
      mesh.indices.forEach((idx, triIdx) => {
        const faceIdx = Math.floor(triIdx / 3);
        if (mesh.face_ids[faceIdx] === selectedFaceId) {
          const vIdx = idx * 3;
          positions.push(
            mesh.positions[vIdx],
            mesh.positions[vIdx + 1],
            mesh.positions[vIdx + 2]
          );
        }
      });
    });

    if (positions.length === 0) return null;

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [geometry, selectedFaceId]);

  useEffect(() => {
    return () => {
      highlightGeom?.dispose();
    };
  }, [highlightGeom]);

  if (!highlightGeom) return null;

  return (
    <mesh geometry={highlightGeom}>
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
};
