import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Geometry3dDto } from "@/types/document";
import { CameraPreset } from "@/stores/useViewerSettingsStore";

interface CameraManagerProps {
  geometry: Geometry3dDto;
  cameraPreset: CameraPreset;
  onPresetApplied?: () => void;
}

export const CameraManager: React.FC<CameraManagerProps> = ({
  geometry,
  cameraPreset,
  onPresetApplied,
}) => {
  const { camera } = useThree();
  const lastPresetRef = useRef<CameraPreset | null>(null);

  // Compute bounding sphere from model size
  const maxDim = Math.max(
    geometry.size[0] || 1,
    geometry.size[1] || 1,
    geometry.size[2] || 1
  );
  const distance = maxDim * 2.2;
  const center = new THREE.Vector3(
    geometry.center[0],
    geometry.center[1],
    geometry.center[2]
  );

  useEffect(() => {
    if (lastPresetRef.current === cameraPreset) return;
    lastPresetRef.current = cameraPreset;

    const targetPos = new THREE.Vector3();

    switch (cameraPreset) {
      case "top":
        targetPos.set(center.x, center.y + distance, center.z + 0.0001);
        break;
      case "bottom":
        targetPos.set(center.x, center.y - distance, center.z + 0.0001);
        break;
      case "front":
        targetPos.set(center.x, center.y, center.z + distance);
        break;
      case "back":
        targetPos.set(center.x, center.y, center.z - distance);
        break;
      case "left":
        targetPos.set(center.x - distance, center.y, center.z);
        break;
      case "right":
        targetPos.set(center.x + distance, center.y, center.z);
        break;
      case "isometric":
        const isoDist = distance * 0.707;
        targetPos.set(center.x + isoDist, center.y + isoDist, center.z + isoDist);
        break;
      case "default":
      default:
        targetPos.set(
          center.x + distance * 0.75,
          center.y + distance * 0.5,
          center.z + distance * 0.85
        );
        break;
    }

    camera.position.copy(targetPos);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (onPresetApplied) {
      onPresetApplied();
    }
  }, [cameraPreset, center, distance, camera, onPresetApplied]);

  return null;
};
