use std::collections::HashMap;

use super::tabs::calculate_glue_tab;
use crate::models::{
    EdgeLabel2d, Face2d, GlueTab2d, Line2d, LineClassification, Page2dDto, Part2dDto,
};
use crate::parser::pdo3::{PdoObject, PdoPart, PdoSettings};

pub fn get_page_dimensions(page_type: u32, custom_w: f64, custom_h: f64) -> (f64, f64) {
    match page_type {
        0 => (210.0, 297.0),  // A4
        1 => (297.0, 420.0),  // A3
        2 => (420.0, 594.0),  // A2
        3 => (594.0, 841.0),  // A1
        4 => (176.0, 250.0),  // B5
        5 => (250.0, 353.0),  // B4
        6 => (353.0, 500.0),  // B3
        7 => (500.0, 707.0),  // B2
        8 => (707.0, 1000.0), // B1
        9 => (215.9, 279.4),  // Letter
        10 => (215.9, 355.6), // Legal
        _ => {
            if custom_w > 10.0 && custom_h > 10.0 {
                (custom_w, custom_h)
            } else {
                (210.0, 297.0) // fallback A4
            }
        }
    }
}

pub fn build_pages(
    objects: &[PdoObject],
    parts: &[PdoPart],
    settings: &PdoSettings,
    _unfold_scale: f64,
) -> Vec<Page2dDto> {
    let (mut raw_w, mut raw_h) = get_page_dimensions(
        settings.page_type,
        settings.page_custom_width,
        settings.page_custom_height,
    );

    // Landscape orientation
    if settings.page_orientation == 1 {
        std::mem::swap(&mut raw_w, &mut raw_h);
    }

    let margin_side = settings.page_margin_side.max(5.0);
    let margin_top = settings.page_margin_top.max(5.0);

    let clipped_w = (raw_w - 2.0 * margin_side).max(10.0);
    let clipped_h = (raw_h - 2.0 * margin_top).max(10.0);

    // Group parts by (page_y, page_x)
    let mut parts_by_page: HashMap<(i32, i32), Vec<Part2dDto>> = HashMap::new();

    // Map: (object_idx, part_idx) -> List of faces in that part
    let mut part_faces_map: HashMap<(usize, i32), Vec<(usize, &crate::parser::pdo3::PdoFace)>> =
        HashMap::new();
    for (obj_idx, obj) in objects.iter().enumerate() {
        for (face_idx, face) in obj.faces.iter().enumerate() {
            part_faces_map
                .entry((obj_idx, face.part_index))
                .or_default()
                .push((face_idx, face));
        }
    }

    for (part_idx, part) in parts.iter().enumerate() {
        let obj_idx = part.object_index;
        let obj = if obj_idx < objects.len() {
            &objects[obj_idx]
        } else {
            continue;
        };

        // Determine which page this part belongs to
        let part_left = part.bounding_box[0];
        let part_top = part.bounding_box[1];

        let page_col = (part_left / clipped_w).floor() as i32;
        let page_row = (part_top / clipped_h).floor() as i32;

        let page_offset_x = (page_col as f64) * clipped_w - margin_side;
        let page_offset_y = (page_row as f64) * clipped_h - margin_top;

        // Transform bounding box to page coordinates
        let page_bb = [
            part_left - page_offset_x,
            part_top - page_offset_y,
            part.bounding_box[2],
            part.bounding_box[3],
        ];

        let mut part_faces = Vec::new();
        let mut cut_lines = Vec::new();
        let mut fold_lines = Vec::new();
        let mut glue_tabs = Vec::new();
        let mut edge_labels = Vec::new();

        // 1. Process 2D Faces for this part
        if let Some(face_list) = part_faces_map.get(&(obj_idx, part_idx as i32)) {
            for &(face_idx, face) in face_list {
                let global_face_id = ((obj_idx as u32) << 16) | (face_idx as u32);

                let mut poly = Vec::with_capacity(face.vertices.len());
                let mut uvs = Vec::with_capacity(face.vertices.len());

                for fv in &face.vertices {
                    let page_x = (part_left + fv.x) - page_offset_x;
                    let page_y = (part_top + fv.y) - page_offset_y;
                    poly.push([page_x, page_y]);
                    uvs.push([fv.u, fv.v]);
                }

                part_faces.push(Face2d {
                    face_id: global_face_id,
                    part_id: part_idx as u32,
                    object_index: obj_idx,
                    material_index: face.material_index,
                    polygon: poly,
                    uvs,
                });

                // Check for glue tabs on face vertices
                if settings.show_flaps {
                    let nvf = face.vertices.len();
                    for i in 0..nvf {
                        let fv1 = &face.vertices[i];
                        let fv2 = &face.vertices[(i + 1) % nvf];

                        if fv1.has_flap {
                            let p1 = [
                                (part_left + fv1.x) - page_offset_x,
                                (part_top + fv1.y) - page_offset_y,
                            ];
                            let p2 = [
                                (part_left + fv2.x) - page_offset_x,
                                (part_top + fv2.y) - page_offset_y,
                            ];

                            let tab_poly = calculate_glue_tab(
                                p1,
                                p2,
                                fv1.flap_height,
                                fv1.flap_a_angle,
                                fv1.flap_b_angle,
                            );

                            if !tab_poly.is_empty() {
                                glue_tabs.push(GlueTab2d {
                                    polygon: tab_poly,
                                    base_edge: [p1, p2],
                                    face_id: global_face_id,
                                    part_id: part_idx as u32,
                                    target_face_id: None,
                                    label: None,
                                });
                            }
                        }
                    }
                }
            }
        }

        // 2. Process Lines (cut lines, fold lines)
        for line in &part.lines {
            if line.hidden {
                continue;
            }

            let face_idx = line.face_index as usize;
            if face_idx >= obj.faces.len() {
                continue;
            }
            let face = &obj.faces[face_idx];
            let global_face_id = ((obj_idx as u32) << 16) | (face_idx as u32);

            // Find vertex index in face
            let mut v1_opt = None;
            let mut _v2_opt = None;

            for (vi, fv) in face.vertices.iter().enumerate() {
                if fv.id_vertex == line.vertex_index {
                    v1_opt = Some((fv, vi));
                    break;
                }
            }

            if let Some((fv1, vi1)) = v1_opt {
                let next_idx = (vi1 + 1) % face.vertices.len();
                let fv2 = &face.vertices[next_idx];
                _v2_opt = Some(fv2);

                let p1 = [
                    (part_left + fv1.x) - page_offset_x,
                    (part_top + fv1.y) - page_offset_y,
                ];
                let p2 = [
                    (part_left + fv2.x) - page_offset_x,
                    (part_top + fv2.y) - page_offset_y,
                ];

                let classification = match line.line_type {
                    0 => LineClassification::Cut,
                    1 => LineClassification::Mountain,
                    2 => LineClassification::Valley,
                    _ => LineClassification::Neutral,
                };

                let line_dto = Line2d {
                    start: p1,
                    end: p2,
                    classification,
                    face_id: global_face_id,
                    part_id: part_idx as u32,
                };

                if classification == LineClassification::Cut {
                    cut_lines.push(line_dto);
                } else {
                    fold_lines.push(line_dto);
                }

                // Add edge labels if enabled and line is a cut edge with a tab or partner
                if settings.show_edge_id && line.line_type == 0 {
                    let mid_x = (p1[0] + p2[0]) * 0.5;
                    let mid_y = (p1[1] + p2[1]) * 0.5;
                    let angle = (p2[1] - p1[1]).atan2(p2[0] - p1[0]).to_degrees();

                    // Generate a label from face/vertex IDs
                    let label_text = format!("{}", (line.vertex_index % 999) + 1);
                    edge_labels.push(EdgeLabel2d {
                        position: [mid_x, mid_y],
                        text: label_text,
                        angle_deg: angle,
                        face_id: global_face_id,
                        part_id: part_idx as u32,
                    });
                }
            }
        }

        let part_dto = Part2dDto {
            part_id: part_idx as u32,
            object_index: obj_idx,
            name: if part.name.is_empty() {
                format!("Part_{}", part_idx + 1)
            } else {
                part.name.clone()
            },
            page_number: 1, // Will be updated when pages are numbered
            bounding_box: page_bb,
            faces: part_faces,
            cut_lines,
            fold_lines,
            glue_tabs,
            edge_labels,
        };

        parts_by_page
            .entry((page_row, page_col))
            .or_default()
            .push(part_dto);
    }

    // Sort page keys by row, then column
    let mut page_keys: Vec<(i32, i32)> = parts_by_page.keys().copied().collect();
    page_keys.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)));

    let mut result_pages = Vec::with_capacity(page_keys.len());

    for (page_num, key) in page_keys.into_iter().enumerate() {
        if let Some(mut page_parts) = parts_by_page.remove(&key) {
            let actual_page_number = page_num + 1;
            for part in &mut page_parts {
                part.page_number = actual_page_number;
            }

            result_pages.push(Page2dDto {
                page_number: actual_page_number,
                width_mm: raw_w,
                height_mm: raw_h,
                margin_left_mm: margin_side,
                margin_top_mm: margin_top,
                margin_right_mm: margin_side,
                margin_bottom_mm: margin_top,
                parts: page_parts,
            });
        }
    }

    // If no pages were generated (e.g. unfold data missing), provide at least one empty template page
    if result_pages.is_empty() {
        result_pages.push(Page2dDto {
            page_number: 1,
            width_mm: raw_w,
            height_mm: raw_h,
            margin_left_mm: margin_side,
            margin_top_mm: margin_top,
            margin_right_mm: margin_side,
            margin_bottom_mm: margin_top,
            parts: Vec::new(),
        });
    }

    result_pages
}
