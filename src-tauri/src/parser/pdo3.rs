use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use flate2::read::ZlibDecoder;
use std::io::Read;

use super::binary::{BinaryReader, ParseError};
use crate::models::{DocumentDto, DocumentMetadata, Edge3d, Geometry3dDto, MaterialDto, SubMesh3d};

// Internal structures mirroring binary format
#[derive(Debug)]
pub struct Pdo3Header {
    pub version: u32,
    pub is_multibyte: bool,
    pub designer_id: String,
    pub string_shift: u8,
    pub locale: String,
    pub codepage: String,
    pub tex_lock: u32,
    pub show_startup_notes: bool,
    pub password_flag: bool,
    pub key: String,
    pub assembled_height: f64,
    pub origin_offset: [f64; 3],
}

#[derive(Debug, Clone)]
pub struct Pdo2DVertex {
    pub id_vertex: i32,
    pub x: f64,
    pub y: f64,
    pub u: f64,
    pub v: f64,
    pub has_flap: bool,
    pub flap_height: f64,
    pub flap_a_angle: f64,
    pub flap_b_angle: f64,
}

#[derive(Debug, Clone)]
pub struct PdoFace {
    pub material_index: i32,
    pub part_index: i32,
    pub normal: [f64; 3],
    pub coord: f64,
    pub vertices: Vec<Pdo2DVertex>,
}

#[derive(Debug, Clone)]
pub struct PdoEdge {
    pub face1_index: i32,
    pub face2_index: i32,
    pub vertex1_index: i32,
    pub vertex2_index: i32,
    pub connects_faces: i16,
    pub no_connected_face: i32,
    pub line_type: i32, // 0 = cut, 1 = mountain, 2 = valley
}

#[derive(Debug, Clone)]
pub struct PdoObject {
    pub name: String,
    pub visible: bool,
    pub vertices: Vec<[f64; 3]>,
    pub faces: Vec<PdoFace>,
    pub edges: Vec<PdoEdge>,
}

#[derive(Debug, Clone)]
pub struct PdoTexture {
    pub width: u32,
    pub height: u32,
    pub data_size: u32,
    pub raw_data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct PdoMaterial {
    pub name: String,
    pub color_rgba: [f32; 4],
    pub diffuse_rgba: [f32; 4],
    pub has_texture: bool,
    pub texture: Option<PdoTexture>,
}

#[derive(Debug, Clone)]
pub struct PdoLine {
    pub hidden: bool,
    pub line_type: i32,
    pub face_index: i32,
    pub vertex_index: i32,
    pub is_connecting_faces: bool,
    pub face2_index: i32,
    pub vertex2_index: i32,
}

#[derive(Debug, Clone)]
pub struct PdoPart {
    pub object_index: usize,
    pub bounding_box: [f64; 4],
    pub name: String,
    pub lines: Vec<PdoLine>,
}

#[derive(Debug, Clone)]
pub struct PdoSettings {
    pub show_flaps: bool,
    pub show_edge_id: bool,
    pub edge_id_placement: bool,
    pub face_material: bool,
    pub hide_almost_flat: bool,
    pub fold_lines_hiding_angle: i32,
    pub page_type: u32,
    pub page_custom_width: f64,
    pub page_custom_height: f64,
    pub page_orientation: u32, // 0 = portrait, 1 = landscape
    pub page_margin_side: f64,
    pub page_margin_top: f64,
    pub scale_factor: f64,
    pub author: String,
    pub comment: String,
}

pub struct Pdo3Parser<'a> {
    reader: BinaryReader<'a>,
    file_name: String,
    file_size: usize,
}

impl<'a> Pdo3Parser<'a> {
    pub fn new(data: &'a [u8], file_name: String) -> Self {
        let file_size = data.len();
        Self {
            reader: BinaryReader::new(data),
            file_name,
            file_size,
        }
    }

    pub fn parse(mut self) -> Result<DocumentDto, ParseError> {
        let header = self.read_header()?;
        let objects = self.read_objects(&header)?;
        let materials = self.read_materials(&header)?;
        let (parts, unfold_scale) = self.read_unfold_data(&header, objects.len())?;
        let settings = self.read_settings(&header, parts.len())?;

        self.build_document(header, objects, materials, parts, unfold_scale, settings)
    }

    fn read_header(&mut self) -> Result<Pdo3Header, ParseError> {
        let magic = self.reader.read_bytes(10)?;
        if magic != b"version 3\n" {
            return Err(ParseError::InvalidHeader(format!(
                "Expected 'version 3\\n', got {:?}",
                String::from_utf8_lossy(magic)
            )));
        }

        let version = self.reader.read_u32()?;
        if !(4..=6).contains(&version) {
            return Err(ParseError::UnsupportedVersion(format!(
                "PDO v3 subversion {} is not recognized (expected 4, 5, or 6)",
                version
            )));
        }

        let mbsf = self.reader.read_u32()?;
        let is_multibyte = mbsf != 0;

        let _release_int = self.reader.read_u32()?;

        let mut designer_id = String::new();
        let mut string_shift = 0u8;

        if version > 4 {
            designer_id = self.reader.read_pdo_string(is_multibyte, 0)?;
            string_shift = self.reader.read_u32()? as u8;
        }

        let locale = self.reader.read_pdo_string(is_multibyte, string_shift)?;
        let codepage = self.reader.read_pdo_string(is_multibyte, string_shift)?;
        let tex_lock = self.reader.read_u32()?;

        let mut show_startup_notes = false;
        let mut password_flag = false;

        if version == 6 {
            show_startup_notes = self.reader.read_u8()? == 1;
            password_flag = self.reader.read_u8()? == 1;
        }

        let key = self.reader.read_pdo_string(is_multibyte, string_shift)?;

        if version == 6 {
            let v6_lock = self.reader.read_u32()?;
            for _ in 0..v6_lock {
                self.reader.skip(8)?;
            }
        } else if version > 4 {
            show_startup_notes = self.reader.read_u8()? == 1;
            password_flag = self.reader.read_u8()? == 1;
        }

        let assembled_height = self.reader.read_f64()?;
        let ox = self.reader.read_f64()?;
        let oy = self.reader.read_f64()?;
        let oz = self.reader.read_f64()?;

        Ok(Pdo3Header {
            version,
            is_multibyte,
            designer_id,
            string_shift,
            locale,
            codepage,
            tex_lock,
            show_startup_notes,
            password_flag,
            key,
            assembled_height,
            origin_offset: [ox, oy, oz],
        })
    }

    fn read_objects(&mut self, header: &Pdo3Header) -> Result<Vec<PdoObject>, ParseError> {
        let num_objects = self.reader.read_u32()? as usize;
        if num_objects > 10_000 {
            return Err(ParseError::ExcessiveAllocation(num_objects));
        }

        let mut objects = Vec::with_capacity(num_objects);

        for _ in 0..num_objects {
            let name = self
                .reader
                .read_pdo_string(header.is_multibyte, header.string_shift)?;
            let visible = self.reader.read_u8()? == 1;

            let num_vertices = self.reader.read_u32()? as usize;
            if num_vertices > 5_000_000 {
                return Err(ParseError::ExcessiveAllocation(num_vertices));
            }
            let mut vertices = Vec::with_capacity(num_vertices);
            for _ in 0..num_vertices {
                let x = self.reader.read_f64()?;
                let y = self.reader.read_f64()?;
                let z = self.reader.read_f64()?;
                vertices.push([x, y, z]);
            }

            let num_faces = self.reader.read_u32()? as usize;
            if num_faces > 5_000_000 {
                return Err(ParseError::ExcessiveAllocation(num_faces));
            }
            let mut faces = Vec::with_capacity(num_faces);
            for _ in 0..num_faces {
                let material_index = self.reader.read_i32()?;
                let part_index = self.reader.read_i32()?;
                let nx = self.reader.read_f64()?;
                let ny = self.reader.read_f64()?;
                let nz = self.reader.read_f64()?;
                let coord = self.reader.read_f64()?;

                let nvf = self.reader.read_u32()? as usize;
                if nvf > 100 {
                    return Err(ParseError::CorruptedData(format!(
                        "Face has {} vertices (expected 3 or 4)",
                        nvf
                    )));
                }

                let mut face_verts = Vec::with_capacity(nvf);
                for _ in 0..nvf {
                    let id_vertex = self.reader.read_i32()?;
                    let x = self.reader.read_f64()?;
                    let y = self.reader.read_f64()?;
                    let u = self.reader.read_f64()?;
                    let v = self.reader.read_f64()?;
                    let has_flap = self.reader.read_u8()? == 1;
                    let flap_height = self.reader.read_f64()?;
                    let flap_a_angle = self.reader.read_f64()?;
                    let flap_b_angle = self.reader.read_f64()?;
                    // flap lines RGB (3*4) and fold lines RGB (3*4) = 24 bytes
                    self.reader.skip(24)?;

                    face_verts.push(Pdo2DVertex {
                        id_vertex,
                        x,
                        y,
                        u,
                        v,
                        has_flap,
                        flap_height,
                        flap_a_angle,
                        flap_b_angle,
                    });
                }

                faces.push(PdoFace {
                    material_index,
                    part_index,
                    normal: [nx, ny, nz],
                    coord,
                    vertices: face_verts,
                });
            }

            let num_edges = self.reader.read_u32()? as usize;
            if num_edges > 10_000_000 {
                return Err(ParseError::ExcessiveAllocation(num_edges));
            }
            let mut edges = Vec::with_capacity(num_edges);
            for _ in 0..num_edges {
                let face1_index = self.reader.read_i32()?;
                let face2_index = self.reader.read_i32()?;
                let vertex1_index = self.reader.read_i32()?;
                let vertex2_index = self.reader.read_i32()?;
                let connects_faces = self.reader.read_u16()? as i16;
                let no_connected_face = self.reader.read_i32()?;

                edges.push(PdoEdge {
                    face1_index,
                    face2_index,
                    vertex1_index,
                    vertex2_index,
                    connects_faces,
                    no_connected_face,
                    line_type: 0,
                });
            }

            objects.push(PdoObject {
                name,
                visible,
                vertices,
                faces,
                edges,
            });
        }

        Ok(objects)
    }

    fn read_materials(&mut self, header: &Pdo3Header) -> Result<Vec<PdoMaterial>, ParseError> {
        let num_materials = self.reader.read_u32()? as usize;
        if num_materials > 10_000 {
            return Err(ParseError::ExcessiveAllocation(num_materials));
        }

        let mut materials = Vec::with_capacity(num_materials);

        for i in 0..num_materials {
            let mut name = self
                .reader
                .read_pdo_string(header.is_multibyte, header.string_shift)?;
            if name.is_empty() {
                name = format!("Material_{}", i + 1);
            }

            // 16 floats (4x4): material, 3D, light, diffuse
            let mut color_3d = [0f32; 4];
            for c in &mut color_3d {
                *c = self.reader.read_f32()?;
            }
            self.reader.skip(4 * 4)?; // 3D color
            self.reader.skip(4 * 4)?; // light color

            let mut diffuse = [0f32; 4];
            for c in &mut diffuse {
                *c = self.reader.read_f32()?;
            }

            // 2D material color ARGB (4 * 4B)
            self.reader.skip(16)?;

            let has_texture = self.reader.read_u8()? == 1;
            let mut texture = None;

            if has_texture {
                let width = self.reader.read_u32()?;
                let height = self.reader.read_u32()?;
                let wrapped_size = self.reader.read_u32()? as usize;

                if wrapped_size > 100 * 1024 * 1024 {
                    return Err(ParseError::ExcessiveAllocation(wrapped_size));
                }

                let compressed_data = self.reader.read_bytes(wrapped_size)?;
                texture = Some(PdoTexture {
                    width,
                    height,
                    data_size: wrapped_size as u32,
                    raw_data: compressed_data.to_vec(),
                });
            }

            materials.push(PdoMaterial {
                name,
                color_rgba: color_3d,
                diffuse_rgba: diffuse,
                has_texture,
                texture,
            });
        }

        Ok(materials)
    }

    fn read_unfold_data(
        &mut self,
        header: &Pdo3Header,
        total_objects: usize,
    ) -> Result<(Vec<PdoPart>, f64), ParseError> {
        let has_unfold = self.reader.read_u8()? == 1;
        if !has_unfold {
            return Ok((Vec::new(), 1.0));
        }

        let scale = self.reader.read_f64()?;
        self.reader.skip(1)?; // zero padding
        let _unfold_bbox = self.reader.read_bounding_box()?;

        let num_parts = self.reader.read_u32()? as usize;
        if num_parts > 50_000 {
            return Err(ParseError::ExcessiveAllocation(num_parts));
        }

        let mut parts = Vec::with_capacity(num_parts);

        for _ in 0..num_parts {
            let object_index = self.reader.read_u32()? as usize;
            if object_index >= total_objects && total_objects > 0 {
                // Warning, but keep going with clamping
            }
            let bounding_box = self.reader.read_bounding_box()?;
            let mut name = String::new();
            if header.version > 4 {
                name = self
                    .reader
                    .read_pdo_string(header.is_multibyte, header.string_shift)?;
            }

            let num_lines = self.reader.read_u32()? as usize;
            if num_lines > 100_000 {
                return Err(ParseError::ExcessiveAllocation(num_lines));
            }
            let mut lines = Vec::with_capacity(num_lines);
            for _ in 0..num_lines {
                let hidden = self.reader.read_u8()? == 1;
                let line_type = self.reader.read_i32()?;
                self.reader.skip(1)?; // padding
                let face_index = self.reader.read_i32()?;
                let vertex_index = self.reader.read_i32()?;
                let is_connecting_faces = self.reader.read_u8()? == 1;
                let mut face2_index = -1;
                let mut vertex2_index = -1;
                if is_connecting_faces {
                    face2_index = self.reader.read_i32()?;
                    vertex2_index = self.reader.read_i32()?;
                }

                lines.push(PdoLine {
                    hidden,
                    line_type,
                    face_index,
                    vertex_index,
                    is_connecting_faces,
                    face2_index,
                    vertex2_index,
                });
            }

            parts.push(PdoPart {
                object_index,
                bounding_box,
                name,
                lines,
            });
        }

        // Read text blocks
        let num_text_blocks = self.reader.read_u32()? as usize;
        for _ in 0..num_text_blocks {
            self.reader.skip(32)?; // bounding box
            self.reader.skip(8)?; // line spacing
            self.reader.skip(4)?; // color
            self.reader.skip(4)?; // font size
            let _font_name = self
                .reader
                .read_pdo_string(header.is_multibyte, header.string_shift)?;
            let num_lines = self.reader.read_u32()? as usize;
            for _ in 0..num_lines {
                let _ = self
                    .reader
                    .read_pdo_string(header.is_multibyte, header.string_shift)?;
            }
        }

        // Read image blocks (2 arrays)
        for _ in 0..2 {
            let num_images = self.reader.read_u32()? as usize;
            for _ in 0..num_images {
                self.reader.skip(32)?; // bounding box
                let _w = self.reader.read_u32()?;
                let _h = self.reader.read_u32()?;
                let wsz = self.reader.read_u32()? as usize;
                self.reader.skip(wsz)?;
            }
        }

        Ok((parts, scale))
    }

    fn read_settings(
        &mut self,
        header: &Pdo3Header,
        num_parts: usize,
    ) -> Result<PdoSettings, ParseError> {
        if self.reader.remaining() < 10 {
            // Fallback default settings if truncated
            return Ok(PdoSettings {
                show_flaps: true,
                show_edge_id: true,
                edge_id_placement: true,
                face_material: true,
                hide_almost_flat: true,
                fold_lines_hiding_angle: 175,
                page_type: 0, // A4
                page_custom_width: 210.0,
                page_custom_height: 297.0,
                page_orientation: 0,
                page_margin_side: 10.0,
                page_margin_top: 10.0,
                scale_factor: 1.0,
                author: String::new(),
                comment: String::new(),
            });
        }

        if header.version == 6 && num_parts > 0 {
            let unknown_items_count = self.reader.read_u32()? as usize;
            for _ in 0..unknown_items_count {
                let unknown_item_parts = self.reader.read_u32()? as usize;
                self.reader.skip(4 * unknown_item_parts)?;
            }
        }

        let show_flaps = self.reader.read_u8()? == 1;
        let show_edge_id = self.reader.read_u8()? == 1;
        let edge_id_placement = self.reader.read_u8()? == 1;
        let face_material = self.reader.read_u8()? == 1;
        let hide_almost_flat = self.reader.read_u8()? == 1;
        let fold_lines_hiding_angle = self.reader.read_i32()?;
        let _draw_white_line = self.reader.read_u8()?;
        self.reader.skip(16)?; // line styles

        let page_type = self.reader.read_u32()?;
        let mut custom_width = 210.0;
        let mut custom_height = 297.0;
        if page_type == 11 {
            custom_width = self.reader.read_f64()?;
            custom_height = self.reader.read_f64()?;
        }

        let page_orientation = self.reader.read_u32()?;
        let page_margin_side = self.reader.read_u32()? as f64;
        let page_margin_top = self.reader.read_u32()? as f64;

        // Fold line patterns: 6*8*2 = 96 bytes
        self.reader.skip(96)?;

        let _outline_padding = self.reader.read_u8()?;
        let scale_factor = self.reader.read_f64()?;

        let mut author = String::new();
        let mut comment = String::new();
        if header.version > 4 && self.reader.remaining() >= 4 {
            author = self
                .reader
                .read_pdo_string(header.is_multibyte, header.string_shift)?;
            if self.reader.remaining() >= 4 {
                comment = self
                    .reader
                    .read_pdo_string(header.is_multibyte, header.string_shift)?;
            }
        }

        Ok(PdoSettings {
            show_flaps,
            show_edge_id,
            edge_id_placement,
            face_material,
            hide_almost_flat,
            fold_lines_hiding_angle,
            page_type,
            page_custom_width: custom_width,
            page_custom_height: custom_height,
            page_orientation,
            page_margin_side,
            page_margin_top,
            scale_factor,
            author,
            comment,
        })
    }

    fn build_document(
        self,
        header: Pdo3Header,
        objects: Vec<PdoObject>,
        raw_materials: Vec<PdoMaterial>,
        parts: Vec<PdoPart>,
        unfold_scale: f64,
        settings: PdoSettings,
    ) -> Result<DocumentDto, ParseError> {
        let mut warnings = Vec::new();

        // 1. Convert Materials and decode Textures
        let mut materials = Vec::with_capacity(raw_materials.len());
        for (idx, mat) in raw_materials.into_iter().enumerate() {
            let mut texture_data_url = None;
            let mut tw = 0;
            let mut th = 0;

            if mat.has_texture {
                if let Some(tex) = mat.texture {
                    tw = tex.width;
                    th = tex.height;
                    match decode_texture_to_png(&tex) {
                        Ok(data_url) => {
                            texture_data_url = Some(data_url);
                        }
                        Err(e) => {
                            warnings.push(format!(
                                "Failed to decompress texture for material '{}': {}",
                                mat.name, e
                            ));
                        }
                    }
                }
            }

            materials.push(MaterialDto {
                id: idx,
                name: mat.name,
                color_rgba: mat.color_rgba,
                diffuse_rgba: mat.diffuse_rgba,
                has_texture: texture_data_url.is_some(),
                texture_width: tw,
                texture_height: th,
                texture_data_url,
            });
        }

        // 2. Build 3D Geometry
        let mut submeshes = Vec::new();
        let mut all_edges = Vec::new();
        let mut min_bound = [f32::INFINITY; 3];
        let mut max_bound = [f32::NEG_INFINITY; 3];
        let mut total_vertices = 0;
        let mut total_faces = 0;

        for (obj_idx, obj) in objects.iter().enumerate() {
            if !obj.visible {
                continue;
            }

            total_vertices += obj.vertices.len();
            total_faces += obj.faces.len();

            // Track bounding box in model space
            for v in &obj.vertices {
                let x = (v[0] - header.origin_offset[0]) as f32;
                let y = (v[1] - header.origin_offset[1]) as f32;
                let z = (v[2] - header.origin_offset[2]) as f32;

                min_bound[0] = min_bound[0].min(x);
                min_bound[1] = min_bound[1].min(y);
                min_bound[2] = min_bound[2].min(z);

                max_bound[0] = max_bound[0].max(x);
                max_bound[1] = max_bound[1].max(y);
                max_bound[2] = max_bound[2].max(z);
            }

            // Group faces by material
            let mut faces_by_mat: std::collections::HashMap<i32, Vec<(usize, &PdoFace)>> =
                std::collections::HashMap::new();
            for (face_idx, face) in obj.faces.iter().enumerate() {
                faces_by_mat
                    .entry(face.material_index)
                    .or_default()
                    .push((face_idx, face));
            }

            for (mat_idx, face_list) in faces_by_mat {
                let mut positions = Vec::new();
                let mut normals = Vec::new();
                let mut uvs = Vec::new();
                let mut indices = Vec::new();
                let mut face_ids = Vec::new();
                let mut part_ids = Vec::new();

                for (face_idx, face) in face_list {
                    if face.vertices.len() < 3 {
                        continue;
                    }

                    let global_face_id = ((obj_idx as u32) << 16) | (face_idx as u32);
                    let part_id = face.part_index;

                    // Triangulate face fan: (0, i, i+1)
                    let base_v_idx = (positions.len() / 3) as u32;

                    for fv in &face.vertices {
                        let v3d = if (fv.id_vertex as usize) < obj.vertices.len() {
                            obj.vertices[fv.id_vertex as usize]
                        } else {
                            [0.0, 0.0, 0.0]
                        };

                        positions.push((v3d[0] - header.origin_offset[0]) as f32);
                        positions.push((v3d[1] - header.origin_offset[1]) as f32);
                        positions.push((v3d[2] - header.origin_offset[2]) as f32);

                        normals.push(face.normal[0] as f32);
                        normals.push(face.normal[1] as f32);
                        normals.push(face.normal[2] as f32);

                        uvs.push(fv.u as f32);
                        // Invert V for OpenGL / Three.js UV orientation
                        uvs.push((1.0 - fv.v) as f32);
                    }

                    for i in 1..(face.vertices.len() - 1) {
                        indices.push(base_v_idx);
                        indices.push(base_v_idx + i as u32);
                        indices.push(base_v_idx + i as u32 + 1);

                        face_ids.push(global_face_id);
                        part_ids.push(part_id);
                    }
                }

                if !indices.is_empty() {
                    submeshes.push(SubMesh3d {
                        object_index: obj_idx,
                        object_name: obj.name.clone(),
                        material_index: mat_idx,
                        positions,
                        normals,
                        uvs,
                        indices,
                        face_ids,
                        part_ids,
                    });
                }
            }

            // Extract 3D crease / boundary edges
            for edge in &obj.edges {
                let v1 = if (edge.vertex1_index as usize) < obj.vertices.len() {
                    obj.vertices[edge.vertex1_index as usize]
                } else {
                    continue;
                };
                let v2 = if (edge.vertex2_index as usize) < obj.vertices.len() {
                    obj.vertices[edge.vertex2_index as usize]
                } else {
                    continue;
                };

                let p1 = [
                    (v1[0] - header.origin_offset[0]) as f32,
                    (v1[1] - header.origin_offset[1]) as f32,
                    (v1[2] - header.origin_offset[2]) as f32,
                ];
                let p2 = [
                    (v2[0] - header.origin_offset[0]) as f32,
                    (v2[1] - header.origin_offset[1]) as f32,
                    (v2[2] - header.origin_offset[2]) as f32,
                ];

                let is_boundary = edge.face2_index == -1;
                let mut is_crease = is_boundary;

                if !is_boundary
                    && (edge.face1_index as usize) < obj.faces.len()
                    && (edge.face2_index as usize) < obj.faces.len()
                {
                    let n1 = obj.faces[edge.face1_index as usize].normal;
                    let n2 = obj.faces[edge.face2_index as usize].normal;
                    let dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
                    // Angle threshold: if angle > ~20 deg (dot < 0.94), treat as crease
                    if dot < 0.94 {
                        is_crease = true;
                    }
                }

                all_edges.push(Edge3d {
                    start: p1,
                    end: p2,
                    is_crease,
                    face_index1: edge.face1_index,
                    face_index2: edge.face2_index,
                });
            }
        }

        if min_bound[0].is_infinite() {
            min_bound = [0.0, 0.0, 0.0];
            max_bound = [0.0, 0.0, 0.0];
        }

        let center = [
            (min_bound[0] + max_bound[0]) * 0.5,
            (min_bound[1] + max_bound[1]) * 0.5,
            (min_bound[2] + max_bound[2]) * 0.5,
        ];
        let size = [
            (max_bound[0] - min_bound[0]).abs(),
            (max_bound[1] - min_bound[1]).abs(),
            (max_bound[2] - min_bound[2]).abs(),
        ];

        let geometry_3d = Geometry3dDto {
            meshes: submeshes,
            edges: all_edges,
            bounding_box_min: min_bound,
            bounding_box_max: max_bound,
            center,
            size,
        };

        // 3. Build 2D Pages and Unfolded Parts
        let pages = crate::geometry::pages::build_pages(&objects, &parts, &settings, unfold_scale);

        let metadata = DocumentMetadata {
            file_name: self.file_name,
            file_path: None,
            file_size_bytes: self.file_size,
            format_version: format!("PDO v3.{}", header.version),
            designer_id: if header.designer_id.is_empty() {
                None
            } else {
                Some(header.designer_id)
            },
            author: if settings.author.is_empty() {
                None
            } else {
                Some(settings.author)
            },
            comment: if settings.comment.is_empty() {
                None
            } else {
                Some(settings.comment)
            },
            locale: if header.locale.is_empty() {
                None
            } else {
                Some(header.locale)
            },
            codepage: if header.codepage.is_empty() {
                None
            } else {
                Some(header.codepage)
            },
            assembled_height_mm: header.assembled_height * unfold_scale,
            model_dimensions_mm: [
                (size[0] as f64) * unfold_scale,
                (size[1] as f64) * unfold_scale,
                (size[2] as f64) * unfold_scale,
            ],
            model_origin: header.origin_offset,
            scale_factor: settings.scale_factor,
            total_objects: objects.len(),
            total_vertices_3d: total_vertices,
            total_faces_3d: total_faces,
            total_unfolded_parts: parts.len(),
            total_pages: pages.len(),
            has_textures: materials.iter().any(|m| m.has_texture),
        };

        Ok(DocumentDto {
            metadata,
            materials,
            geometry_3d,
            pages,
            warnings,
        })
    }
}

// Decode texture zlib stream to standard PNG Base64 Data URL
fn decode_texture_to_png(tex: &PdoTexture) -> Result<String, ParseError> {
    if tex.raw_data.len() < 6 {
        return Err(ParseError::CorruptedData(
            "Texture data too small".to_string(),
        ));
    }

    // Strip 2 byte header and 4 byte trailing checksum for raw deflate or use zlib
    let mut decoder = ZlibDecoder::new(&tex.raw_data[..]);
    let mut decompressed = Vec::with_capacity((tex.width * tex.height * 3) as usize);

    decoder
        .read_to_end(&mut decompressed)
        .map_err(|e| ParseError::DecompressionFailed(e.to_string()))?;

    let expected_len = (tex.width * tex.height * 3) as usize;
    if decompressed.len() < expected_len {
        return Err(ParseError::CorruptedData(format!(
            "Decompressed texture size {} < expected {}",
            decompressed.len(),
            expected_len
        )));
    }

    // Convert RGB interleaved pixels to PNG buffer
    let mut png_bytes = Vec::new();
    let img_buffer =
        image::RgbImage::from_raw(tex.width, tex.height, decompressed[..expected_len].to_vec())
            .ok_or_else(|| {
                ParseError::CorruptedData("Failed to construct image buffer".to_string())
            })?;

    // Encode to PNG
    let dynamic_img = image::DynamicImage::ImageRgb8(img_buffer);
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| ParseError::CorruptedData(format!("PNG encoding error: {}", e)))?;

    let b64 = BASE64.encode(&png_bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}
