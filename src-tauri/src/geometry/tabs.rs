use std::f64::consts::PI;

pub fn calculate_glue_tab(
    p1: [f64; 2],
    p2: [f64; 2],
    height: f64,
    angle_a: f64,
    angle_b: f64,
) -> Vec<[f64; 2]> {
    let vx1 = p1[0];
    let vy1 = p1[1];
    let vx2 = p2[0];
    let vy2 = p2[1];

    let dx = vx2 - vx1;
    let dy = vy2 - vy1;
    let len = (dx * dx + dy * dy).sqrt();

    if len < 1e-4 || height < 1e-4 {
        return Vec::new();
    }

    // Default flap angles if not provided or degenerate
    let safe_angle_a = if angle_a.is_nan() || angle_a.abs() < 1e-3 {
        PI / 3.0 // 60 degrees default
    } else {
        angle_a.clamp(0.1, PI - 0.1)
    };

    let safe_angle_b = if angle_b.is_nan() || angle_b.abs() < 1e-3 {
        PI / 3.0 // 60 degrees default
    } else {
        angle_b.clamp(0.1, PI - 0.1)
    };

    // Calculate 1st tab vertex (near p2)
    let cos_alpha = (dx / len).clamp(-1.0, 1.0);
    let mut alpha = cos_alpha.acos();
    if dy < 0.0 {
        alpha = -alpha;
    }

    let sin_a = safe_angle_a.sin();
    let radius_a = if sin_a.abs() > 1e-4 {
        height / sin_a
    } else {
        height
    };

    let angle1 = alpha + (PI - safe_angle_a);
    let tab_x1 = vx2 + radius_a * angle1.cos();
    let tab_y1 = vy2 + radius_a * angle1.sin();

    // Calculate 2nd tab vertex (near p1)
    let sin_b = safe_angle_b.sin();
    let radius_b = if sin_b.abs() > 1e-4 {
        height / sin_b
    } else {
        height
    };

    let angle2 = alpha + safe_angle_b;
    let tab_x2 = vx1 + radius_b * angle2.cos();
    let tab_y2 = vy1 + radius_b * angle2.sin();

    // Check if the quad crosses / self-intersects (which creates inverted wings)
    let s1x = vx2 - vx1;
    let s1y = vy2 - vy1;
    let s2x = tab_x1 - tab_x2;
    let s2y = tab_y1 - tab_y2;

    let dot = s1x * s2x + s1y * s2y;
    if dot <= 0.0 {
        // Degenerates to triangle flap
        let mid_x = (vx1 + vx2) * 0.5;
        let mid_y = (vy1 + vy2) * 0.5;
        // Perpendicular vector
        let perp_x = -dy / len;
        let perp_y = dx / len;
        let tip_x = mid_x + perp_x * height;
        let tip_y = mid_y + perp_y * height;

        return vec![p1, p2, [tip_x, tip_y]];
    }

    // Quad flap polygon: p1 -> p2 -> tab_p1 -> tab_p2
    vec![p1, p2, [tab_x1, tab_y1], [tab_x2, tab_y2]]
}
