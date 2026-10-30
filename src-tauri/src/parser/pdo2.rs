use super::binary::ParseError;
use super::pdo3::{Pdo2DVertex, PdoEdge, PdoFace, PdoMaterial, PdoObject, PdoPart, PdoSettings};
use crate::models::{DocumentDto, DocumentMetadata, Geometry3dDto, MaterialDto};

pub struct Pdo2Parser {
    text: String,
    file_name: String,
    file_size: usize,
}

impl Pdo2Parser {
    pub fn new(data: &[u8], file_name: String) -> Self {
        let file_size = data.len();
        let text = String::from_utf8_lossy(data).to_string();
        Self {
            text,
            file_name,
            file_size,
        }
    }

    pub fn parse(self) -> Result<DocumentDto, ParseError> {
        let mut lines = self
            .text
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty());

        let first = lines
            .next()
            .ok_or_else(|| ParseError::InvalidHeader("Empty PDO v2 file".to_string()))?;
        if !first.starts_with("# Pepakura Designer Work Info ver 2") {
            return Err(ParseError::InvalidHeader(format!(
                "Invalid PDO v2 header: {}",
                first
            )));
        }

        let mut objects: Vec<PdoObject> = Vec::new();
        let mut materials: Vec<PdoMaterial> = Vec::new();
        let mut parts: Vec<PdoPart> = Vec::new();

        while let Some(line) = lines.next() {
            if let Some(stripped) = line.strip_prefix("solids ") {
                let count: usize = stripped.parse().unwrap_or(0);
                for _ in 0..count {
                    if let Some(obj) = Self::parse_solid(&mut lines)? {
                        objects.push(obj);
                    }
                }
            } else if let Some(stripped) = line.strip_prefix("materials ") {
                let count: usize = stripped.parse().unwrap_or(0);
                for i in 0..count {
                    materials.push(PdoMaterial {
                        name: format!("Material_{}", i + 1),
                        color_rgba: [0.8, 0.8, 0.8, 1.0],
                        diffuse_rgba: [0.9, 0.9, 0.9, 1.0],
                        has_texture: false,
                        texture: None,
                    });
                }
            } else if let Some(stripped) = line.strip_prefix("parts ") {
                let count: usize = stripped.parse().unwrap_or(0);
                for i in 0..count {
                    if let Some(part_line) = lines.next() {
                        let tokens: Vec<&str> = part_line.split_whitespace().collect();
                        if tokens.len() >= 5 {
                            let obj_idx: usize = tokens[0].parse().unwrap_or(0);
                            let left: f64 = tokens[1].parse().unwrap_or(0.0);
                            let top: f64 = tokens[2].parse().unwrap_or(0.0);
                            let width: f64 = tokens[3].parse().unwrap_or(10.0);
                            let height: f64 = tokens[4].parse().unwrap_or(10.0);

                            parts.push(PdoPart {
                                object_index: obj_idx,
                                bounding_box: [left, top, width, height],
                                name: format!("Part_{}", i + 1),
                                lines: Vec::new(),
                            });
                        }
                    }
                }
            }
        }

        let settings = PdoSettings {
            show_flaps: true,
            show_edge_id: true,
            edge_id_placement: true,
            face_material: true,
            hide_almost_flat: true,
            fold_lines_hiding_angle: 175,
            page_type: 0,
            page_custom_width: 210.0,
            page_custom_height: 297.0,
            page_orientation: 0,
            page_margin_side: 10.0,
            page_margin_top: 10.0,
            scale_factor: 1.0,
            author: String::new(),
            comment: String::new(),
        };

        let pages = crate::geometry::pages::build_pages(&objects, &parts, &settings, 1.0);

        let metadata = DocumentMetadata {
            file_name: self.file_name,
            file_path: None,
            file_size_bytes: self.file_size,
            format_version: "PDO v2 (Text-based)".to_string(),
            designer_id: Some("Pepakura Designer 1.x".to_string()),
            author: None,
            comment: None,
            locale: None,
            codepage: None,
            assembled_height_mm: 100.0,
            model_dimensions_mm: [100.0, 100.0, 100.0],
            model_origin: [0.0, 0.0, 0.0],
            scale_factor: 1.0,
            total_objects: objects.len(),
            total_vertices_3d: objects.iter().map(|o| o.vertices.len()).sum(),
            total_faces_3d: objects.iter().map(|o| o.faces.len()).sum(),
            total_unfolded_parts: parts.len(),
            total_pages: pages.len(),
            has_textures: false,
        };

        let material_dtos = materials
            .into_iter()
            .enumerate()
            .map(|(idx, m)| MaterialDto {
                id: idx,
                name: m.name,
                color_rgba: m.color_rgba,
                diffuse_rgba: m.diffuse_rgba,
                has_texture: false,
                texture_width: 0,
                texture_height: 0,
                texture_data_url: None,
            })
            .collect();

        Ok(DocumentDto {
            metadata,
            materials: material_dtos,
            geometry_3d: Geometry3dDto {
                meshes: Vec::new(),
                edges: Vec::new(),
                bounding_box_min: [0.0, 0.0, 0.0],
                bounding_box_max: [100.0, 100.0, 100.0],
                center: [50.0, 50.0, 50.0],
                size: [100.0, 100.0, 100.0],
            },
            pages,
            warnings: Vec::new(),
        })
    }

    fn parse_solid<'b>(
        lines: &mut impl Iterator<Item = &'b str>,
    ) -> Result<Option<PdoObject>, ParseError> {
        let name = lines.next().unwrap_or("solid").to_string();
        let visible_str = lines.next().unwrap_or("1");
        let visible = visible_str == "1";

        let mut vertices = Vec::new();
        let mut faces = Vec::new();
        let mut edges = Vec::new();

        if let Some(v_line) = lines.next() {
            if let Some(stripped) = v_line.strip_prefix("vertices ") {
                let v_count: usize = stripped.parse().unwrap_or(0);
                for _ in 0..v_count {
                    if let Some(coord_line) = lines.next() {
                        let coords: Vec<f64> = coord_line
                            .split_whitespace()
                            .filter_map(|s| s.parse().ok())
                            .collect();
                        if coords.len() >= 3 {
                            vertices.push([coords[0], coords[1], coords[2]]);
                        }
                    }
                }
            }
        }

        if let Some(f_line) = lines.next() {
            if let Some(stripped) = f_line.strip_prefix("faces ") {
                let f_count: usize = stripped.parse().unwrap_or(0);
                for _ in 0..f_count {
                    if let Some(face_hdr) = lines.next() {
                        let tokens: Vec<&str> = face_hdr.split_whitespace().collect();
                        if tokens.len() >= 7 {
                            let mat_idx: i32 = tokens[0].parse().unwrap_or(0);
                            let part_idx: i32 = tokens[1].parse().unwrap_or(0);
                            let nvf: usize = tokens[6].parse().unwrap_or(0);

                            let mut face_verts = Vec::new();
                            for _ in 0..nvf {
                                if let Some(v2d_line) = lines.next() {
                                    let v_tokens: Vec<&str> = v2d_line.split_whitespace().collect();
                                    if v_tokens.len() >= 8 {
                                        face_verts.push(Pdo2DVertex {
                                            id_vertex: v_tokens[0].parse().unwrap_or(0),
                                            x: v_tokens[1].parse().unwrap_or(0.0),
                                            y: v_tokens[2].parse().unwrap_or(0.0),
                                            u: v_tokens[3].parse().unwrap_or(0.0),
                                            v: v_tokens[4].parse().unwrap_or(0.0),
                                            has_flap: v_tokens[5] == "1",
                                            flap_height: v_tokens[7].parse().unwrap_or(5.0),
                                            flap_a_angle: 1.0,
                                            flap_b_angle: 1.0,
                                        });
                                    }
                                }
                            }

                            faces.push(PdoFace {
                                material_index: mat_idx,
                                part_index: part_idx,
                                normal: [0.0, 1.0, 0.0],
                                coord: 0.0,
                                vertices: face_verts,
                            });
                        }
                    }
                }
            }
        }

        if let Some(e_line) = lines.next() {
            if let Some(stripped) = e_line.strip_prefix("edges ") {
                let e_count: usize = stripped.parse().unwrap_or(0);
                for _ in 0..e_count {
                    if let Some(edge_str) = lines.next() {
                        let tokens: Vec<i32> = edge_str
                            .split_whitespace()
                            .filter_map(|s| s.parse().ok())
                            .collect();
                        if tokens.len() >= 4 {
                            edges.push(PdoEdge {
                                face1_index: tokens[0],
                                face2_index: tokens[1],
                                vertex1_index: tokens[2],
                                vertex2_index: tokens[3],
                                connects_faces: 1,
                                no_connected_face: 0,
                                line_type: 0,
                            });
                        }
                    }
                }
            }
        }

        Ok(Some(PdoObject {
            name,
            visible,
            vertices,
            faces,
            edges,
        }))
    }
}
