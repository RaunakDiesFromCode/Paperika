use crate::models::{LineClassification, Page2dDto};

pub fn export_page_to_svg(page: &Page2dDto) -> String {
    let mut svg = String::new();
    svg.push_str(&format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{}mm" height="{}mm" viewBox="0 0 {} {}">"#,
        page.width_mm, page.height_mm, page.width_mm, page.height_mm
    ));
    svg.push('\n');

    // CSS Styling
    svg.push_str(r#"  <style>
    .page-bg { fill: #ffffff; }
    .margin-border { fill: none; stroke: #e5e7eb; stroke-width: 0.1; stroke-dasharray: 2, 2; }
    .cut-line { stroke: #111827; stroke-width: 0.35; stroke-linecap: round; stroke-linejoin: round; fill: none; }
    .mountain-fold { stroke: #dc2626; stroke-width: 0.25; stroke-dasharray: 3.0, 1.0, 1.0, 1.0; fill: none; }
    .valley-fold { stroke: #2563eb; stroke-width: 0.25; stroke-dasharray: 2.0, 2.0; fill: none; }
    .neutral-fold { stroke: #6b7280; stroke-width: 0.2; stroke-dasharray: 1.5, 1.5; fill: none; }
    .glue-tab { fill: #f3f4f6; stroke: #9ca3af; stroke-width: 0.2; stroke-dasharray: 1.5, 1.0; }
    .edge-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 2.2px; fill: #4b5563; }
    .face-poly { fill: rgba(240, 240, 240, 0.4); stroke: none; }
  </style>
"#);

    // Background and margin rect
    svg.push_str(&format!(
        r#"  <rect width="{}" height="{}" class="page-bg" />
"#,
        page.width_mm, page.height_mm
    ));
    svg.push_str(&format!(
        r#"  <rect x="{}" y="{}" width="{}" height="{}" class="margin-border" />
"#,
        page.margin_left_mm,
        page.margin_top_mm,
        page.width_mm - (page.margin_left_mm + page.margin_right_mm),
        page.height_mm - (page.margin_top_mm + page.margin_bottom_mm),
    ));

    // 1. Glue Tabs (rendered beneath lines)
    svg.push_str(r#"  <g id="glue-tabs">"#);
    svg.push('\n');
    for part in &page.parts {
        for tab in &part.glue_tabs {
            if tab.polygon.len() >= 3 {
                let points_str: Vec<String> = tab
                    .polygon
                    .iter()
                    .map(|pt| format!("{:.3},{:.3}", pt[0], pt[1]))
                    .collect();
                svg.push_str(&format!(
                    r#"    <polygon points="{}" class="glue-tab" />"#,
                    points_str.join(" ")
                ));
                svg.push('\n');
            }
        }
    }
    svg.push_str("  </g>\n");

    // 2. Part Faces (subtle fill)
    svg.push_str(r#"  <g id="part-faces">"#);
    svg.push('\n');
    for part in &page.parts {
        for face in &part.faces {
            if face.polygon.len() >= 3 {
                let points_str: Vec<String> = face
                    .polygon
                    .iter()
                    .map(|pt| format!("{:.3},{:.3}", pt[0], pt[1]))
                    .collect();
                svg.push_str(&format!(
                    r#"    <polygon points="{}" class="face-poly" />"#,
                    points_str.join(" ")
                ));
                svg.push('\n');
            }
        }
    }
    svg.push_str("  </g>\n");

    // 3. Fold Lines (Mountain, Valley, Neutral)
    svg.push_str(r#"  <g id="fold-lines">"#);
    svg.push('\n');
    for part in &page.parts {
        for line in &part.fold_lines {
            let class_name = match line.classification {
                LineClassification::Mountain => "mountain-fold",
                LineClassification::Valley => "valley-fold",
                _ => "neutral-fold",
            };
            svg.push_str(&format!(
                r#"    <line x1="{:.3}" y1="{:.3}" x2="{:.3}" y2="{:.3}" class="{}" />"#,
                line.start[0], line.start[1], line.end[0], line.end[1], class_name
            ));
            svg.push('\n');
        }
    }
    svg.push_str("  </g>\n");

    // 4. Cut Lines (outer perimeters)
    svg.push_str(r#"  <g id="cut-lines">"#);
    svg.push('\n');
    for part in &page.parts {
        for line in &part.cut_lines {
            svg.push_str(&format!(
                r#"    <line x1="{:.3}" y1="{:.3}" x2="{:.3}" y2="{:.3}" class="cut-line" />"#,
                line.start[0], line.start[1], line.end[0], line.end[1]
            ));
            svg.push('\n');
        }
    }
    svg.push_str("  </g>\n");

    // 5. Edge Labels
    svg.push_str(r#"  <g id="edge-labels">"#);
    svg.push('\n');
    for part in &page.parts {
        for label in &part.edge_labels {
            svg.push_str(&format!(
                r#"    <text x="{:.3}" y="{:.3}" class="edge-label" text-anchor="middle" dominant-baseline="central">{}</text>"#,
                label.position[0], label.position[1], label.text
            ));
            svg.push('\n');
        }
    }
    svg.push_str("  </g>\n");

    svg.push_str("</svg>\n");
    svg
}
