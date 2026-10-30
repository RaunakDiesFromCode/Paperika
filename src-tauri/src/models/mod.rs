use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PdoVersion {
    V2Text,
    V3Minor4,
    V3Minor5,
    V3Minor6,
    Unknown(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub file_name: String,
    pub file_path: Option<String>,
    pub file_size_bytes: usize,
    pub format_version: String,
    pub designer_id: Option<String>,
    pub author: Option<String>,
    pub comment: Option<String>,
    pub locale: Option<String>,
    pub codepage: Option<String>,
    pub assembled_height_mm: f64,
    pub model_dimensions_mm: [f64; 3], // [width, height, depth]
    pub model_origin: [f64; 3],
    pub scale_factor: f64,
    pub total_objects: usize,
    pub total_vertices_3d: usize,
    pub total_faces_3d: usize,
    pub total_unfolded_parts: usize,
    pub total_pages: usize,
    pub has_textures: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialDto {
    pub id: usize,
    pub name: String,
    pub color_rgba: [f32; 4],
    pub diffuse_rgba: [f32; 4],
    pub has_texture: bool,
    pub texture_width: u32,
    pub texture_height: u32,
    pub texture_data_url: Option<String>, // Base64 PNG data URL if texture present
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshVertex3d {
    pub position: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
    pub face_id: u32,
    pub part_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge3d {
    pub start: [f32; 3],
    pub end: [f32; 3],
    pub is_crease: bool,
    pub face_index1: i32,
    pub face_index2: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubMesh3d {
    pub object_index: usize,
    pub object_name: String,
    pub material_index: i32,
    pub positions: Vec<f32>, // Flat array: x,y,z, x,y,z...
    pub normals: Vec<f32>,   // Flat array: nx,ny,nz...
    pub uvs: Vec<f32>,       // Flat array: u,v...
    pub indices: Vec<u32>,   // Triangles
    pub face_ids: Vec<u32>,  // Per-triangle or per-vertex face ID
    pub part_ids: Vec<i32>,  // Per-triangle part ID for syncing with 2D
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Geometry3dDto {
    pub meshes: Vec<SubMesh3d>,
    pub edges: Vec<Edge3d>,
    pub bounding_box_min: [f32; 3],
    pub bounding_box_max: [f32; 3],
    pub center: [f32; 3],
    pub size: [f32; 3],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LineClassification {
    Cut = 0,
    Mountain = 1,
    Valley = 2,
    Neutral = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line2d {
    pub start: [f64; 2],
    pub end: [f64; 2],
    pub classification: LineClassification,
    pub face_id: u32,
    pub part_id: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlueTab2d {
    pub polygon: Vec<[f64; 2]>, // 3 or 4 points in mm
    pub base_edge: [[f64; 2]; 2],
    pub face_id: u32,
    pub part_id: u32,
    pub target_face_id: Option<u32>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Face2d {
    pub face_id: u32,
    pub part_id: u32,
    pub object_index: usize,
    pub material_index: i32,
    pub polygon: Vec<[f64; 2]>,
    pub uvs: Vec<[f64; 2]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeLabel2d {
    pub position: [f64; 2],
    pub text: String,
    pub angle_deg: f64,
    pub face_id: u32,
    pub part_id: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Part2dDto {
    pub part_id: u32,
    pub object_index: usize,
    pub name: String,
    pub page_number: usize,     // 1-based page index
    pub bounding_box: [f64; 4], // [x, y, width, height] in mm on this page
    pub faces: Vec<Face2d>,
    pub cut_lines: Vec<Line2d>,
    pub fold_lines: Vec<Line2d>,
    pub glue_tabs: Vec<GlueTab2d>,
    pub edge_labels: Vec<EdgeLabel2d>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page2dDto {
    pub page_number: usize,
    pub width_mm: f64,
    pub height_mm: f64,
    pub margin_left_mm: f64,
    pub margin_top_mm: f64,
    pub margin_right_mm: f64,
    pub margin_bottom_mm: f64,
    pub parts: Vec<Part2dDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentDto {
    pub metadata: DocumentMetadata,
    pub materials: Vec<MaterialDto>,
    pub geometry_3d: Geometry3dDto,
    pub pages: Vec<Page2dDto>,
    pub warnings: Vec<String>,
}
