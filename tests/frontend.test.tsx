import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBar } from "@/components/layout/StatusBar";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";
import { DocumentDto } from "@/types/document";

const mockDocument: DocumentDto = {
  metadata: {
    file_name: "test_model.pdo",
    file_path: "/path/to/test_model.pdo",
    file_size_bytes: 1048576,
    format_version: "PDO v3.6",
    designer_id: "Pepakura Designer 6",
    author: "Test Author",
    comment: "Test Comment",
    locale: "en-US",
    codepage: "us-ascii",
    assembled_height_mm: 150.0,
    model_dimensions_mm: [100.0, 150.0, 80.0],
    model_origin: [0, 0, 0],
    scale_factor: 1.0,
    total_objects: 2,
    total_vertices_3d: 500,
    total_faces_3d: 400,
    total_unfolded_parts: 12,
    total_pages: 3,
    has_textures: true,
  },
  materials: [
    {
      id: 0,
      name: "DefaultMaterial",
      color_rgba: [0.8, 0.8, 0.8, 1.0],
      diffuse_rgba: [0.9, 0.9, 0.9, 1.0],
      has_texture: false,
      texture_width: 0,
      texture_height: 0,
      texture_data_url: null,
    },
  ],
  geometry_3d: {
    meshes: [],
    edges: [],
    bounding_box_min: [-50, 0, -40],
    bounding_box_max: [50, 150, 40],
    center: [0, 75, 0],
    size: [100, 150, 80],
  },
  pages: [
    {
      page_number: 1,
      width_mm: 210,
      height_mm: 297,
      margin_left_mm: 10,
      margin_top_mm: 10,
      margin_right_mm: 10,
      margin_bottom_mm: 10,
      parts: [
        {
          part_id: 1,
          object_index: 0,
          name: "Part_1",
          page_number: 1,
          bounding_box: [15, 15, 50, 50],
          faces: [],
          cut_lines: [],
          fold_lines: [],
          glue_tabs: [],
          edge_labels: [],
        },
      ],
    },
  ],
  warnings: [],
};

describe("Paperika Frontend Test Suite", () => {
  beforeEach(() => {
    useDocumentStore.setState({
      currentDocument: null,
      isLoading: false,
      errorMessage: null,
      recentFiles: [],
    });
    useSelectionStore.getState().clearSelection();
    useViewerSettingsStore.getState().reset2dView();
  });

  it("renders EmptyState when no document is loaded", () => {
    render(<EmptyState />);
    expect(screen.getByText("Paperika")).toBeInTheDocument();
    expect(screen.getByText("Choose File…")).toBeInTheDocument();
  });

  it("displays document metadata correctly in StatusBar when document is active", () => {
    useDocumentStore.setState({ currentDocument: mockDocument });
    render(<StatusBar />);
    expect(screen.getByText("test_model.pdo")).toBeInTheDocument();
    expect(screen.getByText("PDO v3.6")).toBeInTheDocument();
    expect(screen.getByText("1.00 MB")).toBeInTheDocument();
    expect(screen.getByText("Page 1 / 3")).toBeInTheDocument();
  });

  it("manages selection state between 3D and 2D stores", () => {
    const { selectFace, selectPart, clearSelection } = useSelectionStore.getState();

    selectFace(101, 5);
    expect(useSelectionStore.getState().selectedFaceId).toBe(101);
    expect(useSelectionStore.getState().selectedPartId).toBe(5);

    selectPart(7);
    expect(useSelectionStore.getState().selectedPartId).toBe(7);
    expect(useSelectionStore.getState().selectedFaceId).toBeNull();

    clearSelection();
    expect(useSelectionStore.getState().selectedFaceId).toBeNull();
    expect(useSelectionStore.getState().selectedPartId).toBeNull();
  });

  it("toggles 2D and 3D viewer settings correctly", () => {
    const { setShadingMode, setShowEdges, setLightIntensity, setCurrentPage } =
      useViewerSettingsStore.getState();

    setShadingMode("wireframe");
    expect(useViewerSettingsStore.getState().shadingMode).toBe("wireframe");

    setShowEdges(false);
    expect(useViewerSettingsStore.getState().showEdges).toBe(false);

    setLightIntensity(1.5);
    expect(useViewerSettingsStore.getState().lightIntensity).toBe(1.5);

    setCurrentPage(2);
    expect(useViewerSettingsStore.getState().currentPage).toBe(2);
  });
});
