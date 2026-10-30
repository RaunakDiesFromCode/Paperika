export interface DocumentMetadata {
  file_name: string;
  file_path: string | null;
  file_size_bytes: number;
  format_version: string;
  designer_id: string | null;
  author: string | null;
  comment: string | null;
  locale: string | null;
  codepage: string | null;
  assembled_height_mm: number;
  model_dimensions_mm: [number, number, number]; // [width, height, depth]
  model_origin: [number, number, number];
  scale_factor: number;
  total_objects: number;
  total_vertices_3d: number;
  total_faces_3d: number;
  total_unfolded_parts: number;
  total_pages: number;
  has_textures: boolean;
}

export interface MaterialDto {
  id: number;
  name: string;
  color_rgba: [number, number, number, number];
  diffuse_rgba: [number, number, number, number];
  has_texture: boolean;
  texture_width: number;
  texture_height: number;
  texture_data_url: string | null;
}

export interface Edge3d {
  start: [number, number, number];
  end: [number, number, number];
  is_crease: boolean;
  face_index1: number;
  face_index2: number;
}

export interface SubMesh3d {
  object_index: number;
  object_name: string;
  material_index: number;
  positions: number[]; // flat [x, y, z, ...]
  normals: number[];
  uvs: number[];
  indices: number[];
  face_ids: number[];
  part_ids: number[];
}

export interface Geometry3dDto {
  meshes: SubMesh3d[];
  edges: Edge3d[];
  bounding_box_min: [number, number, number];
  bounding_box_max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export type LineClassification = "Cut" | "Mountain" | "Valley" | "Neutral";

export interface Line2d {
  start: [number, number];
  end: [number, number];
  classification: LineClassification;
  face_id: number;
  part_id: number;
}

export interface GlueTab2d {
  polygon: [number, number][];
  base_edge: [[number, number], [number, number]];
  face_id: number;
  part_id: number;
  target_face_id: number | null;
  label: string | null;
}

export interface Face2d {
  face_id: number;
  part_id: number;
  object_index: number;
  material_index: number;
  polygon: [number, number][];
  uvs: [number, number][];
}

export interface EdgeLabel2d {
  position: [number, number];
  text: string;
  angle_deg: number;
  face_id: number;
  part_id: number;
}

export interface Part2dDto {
  part_id: number;
  object_index: number;
  name: string;
  page_number: number;
  bounding_box: [number, number, number, number]; // [x, y, width, height]
  faces: Face2d[];
  cut_lines: Line2d[];
  fold_lines: Line2d[];
  glue_tabs: GlueTab2d[];
  edge_labels: EdgeLabel2d[];
}

export interface Page2dDto {
  page_number: number;
  width_mm: number;
  height_mm: number;
  margin_left_mm: number;
  margin_top_mm: number;
  margin_right_mm: number;
  margin_bottom_mm: number;
  parts: Part2dDto[];
}

export interface DocumentDto {
  metadata: DocumentMetadata;
  materials: MaterialDto[];
  geometry_3d: Geometry3dDto;
  pages: Page2dDto[];
  warnings: string[];
}
