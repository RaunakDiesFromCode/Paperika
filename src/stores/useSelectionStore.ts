import { create } from "zustand";

interface SelectionState {
  selectedFaceId: number | null;
  selectedPartId: number | null;
  hoveredFaceId: number | null;
  hoveredPartId: number | null;

  selectFace: (faceId: number | null, partId: number | null) => void;
  selectPart: (partId: number | null) => void;
  hoverFace: (faceId: number | null, partId: number | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedFaceId: null,
  selectedPartId: null,
  hoveredFaceId: null,
  hoveredPartId: null,

  selectFace: (faceId, partId) =>
    set({
      selectedFaceId: faceId,
      selectedPartId: partId,
    }),

  selectPart: (partId) =>
    set({
      selectedPartId: partId,
      // Keep or clear specific face selection when selecting a whole part
      selectedFaceId: null,
    }),

  hoverFace: (faceId, partId) =>
    set({
      hoveredFaceId: faceId,
      hoveredPartId: partId,
    }),

  clearSelection: () =>
    set({
      selectedFaceId: null,
      selectedPartId: null,
      hoveredFaceId: null,
      hoveredPartId: null,
    }),
}));
