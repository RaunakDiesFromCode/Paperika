import React, { useRef, useState, useEffect } from "react";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { Viewer3D } from "../viewer3d/Viewer3D";
import { Viewer2D } from "../viewer2d/Viewer2D";

export const SplitPane: React.FC = () => {
  const { splitRatio, setSplitRatio } = useViewerSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setSplitRatio]);

  const show3D = splitRatio > 0.05;
  const show2D = splitRatio < 0.95;

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full overflow-hidden select-none ${
        isDragging ? "cursor-col-resize select-none pointer-events-auto" : ""
      }`}
    >
      {/* Left: 3D Viewport */}
      {show3D && (
        <div
          style={{ width: show2D ? `${splitRatio * 100}%` : "100%" }}
          className="h-full relative overflow-hidden"
        >
          <Viewer3D />
        </div>
      )}

      {/* Resizable Divider */}
      {show3D && show2D && (
        <div
          onMouseDown={() => setIsDragging(true)}
          className={`group relative z-30 flex w-1 cursor-col-resize items-center justify-center bg-neutral-800/80 transition hover:bg-sky-500/80 ${
            isDragging ? "bg-sky-500 shadow-lg shadow-sky-500/20" : ""
          }`}
        >
          {/* Visual grab dot */}
          <div className="h-8 w-1 rounded-full bg-neutral-600 transition group-hover:bg-white" />
        </div>
      )}

      {/* Right: 2D Unfolded Sheets Viewport */}
      {show2D && (
        <div
          style={{ width: show3D ? `${(1 - splitRatio) * 100}%` : "100%" }}
          className="h-full relative overflow-hidden"
        >
          <Viewer2D />
        </div>
      )}
    </div>
  );
};
