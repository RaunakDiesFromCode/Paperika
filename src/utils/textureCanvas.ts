import { Page2dDto, MaterialDto } from "@/types/document";

/**
 * Draw an affine-transformed textured triangle onto an HTML5 Canvas 2D context.
 */
export function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  u2: number,
  v2: number
) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  const s0 = u0 * w,
    t0 = v0 * h;
  const s1 = u1 * w,
    t1 = v1 * h;
  const s2 = u2 * w,
    t2 = v2 * h;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const ds1 = s1 - s0,
    dt1 = t1 - t0;
  const ds2 = s2 - s0,
    dt2 = t2 - t0;
  const dx1 = x1 - x0,
    dy1 = y1 - y0;
  const dx2 = x2 - x0,
    dy2 = y2 - y0;

  const det = ds1 * dt2 - ds2 * dt1;
  if (Math.abs(det) > 1e-6) {
    const a = (dx1 * dt2 - dx2 * dt1) / det;
    const b = (dy1 * dt2 - dy2 * dt1) / det;
    const c = (-dx1 * ds2 + dx2 * ds1) / det;
    const d = (-dy1 * ds2 + dy2 * ds1) / det;
    const e = x0 - a * s0 - c * t0;
    const f = y0 - b * s0 - d * t0;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
  }
  ctx.restore();
}

/**
 * Convert material diffuse or color RGBA to CSS string
 */
export function getMaterialColor(mat?: MaterialDto, fallback = "#f8fafc"): string {
  if (!mat) return fallback;
  const [r, g, b, a] = mat.diffuse_rgba;
  if (r > 0 || g > 0 || b > 0) {
    const rInt = Math.min(255, Math.max(0, Math.round(r <= 1.0 ? r * 255 : r)));
    const gInt = Math.min(255, Math.max(0, Math.round(g <= 1.0 ? g * 255 : g)));
    const bInt = Math.min(255, Math.max(0, Math.round(b <= 1.0 ? b * 255 : b)));
    const alpha = a !== undefined && a > 0 ? (a <= 1.0 ? a : a / 255) : 1.0;
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${alpha})`;
  }
  const [cr, cg, cb, ca] = mat.color_rgba;
  if (cr > 0 || cg > 0 || cb > 0) {
    const rInt = Math.min(255, Math.max(0, Math.round(cr <= 1.0 ? cr * 255 : cr)));
    const gInt = Math.min(255, Math.max(0, Math.round(cg <= 1.0 ? cg * 255 : cg)));
    const bInt = Math.min(255, Math.max(0, Math.round(cb <= 1.0 ? cb * 255 : cb)));
    const alpha = ca !== undefined && ca > 0 ? (ca <= 1.0 ? ca : ca / 255) : 1.0;
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${alpha})`;
  }
  return fallback;
}

/**
 * Draw all faces (textured triangles & solid colors) for a single page onto an HTML5 canvas.
 */
export function drawPageFacesToCanvas(
  canvas: HTMLCanvasElement,
  page: Page2dDto,
  materials: MaterialDto[],
  loadedImages: Map<number, HTMLImageElement>,
  scale = 3.78, // 3.78 px per mm (standard 96 DPI)
  showTextures = true,
  showFaceFills = true
) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const width = Math.round(page.width_mm * scale);
  const height = Math.round(page.height_mm * scale);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  // Pure white paper background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (!showFaceFills) return;

  // Draw all faces
  for (const part of page.parts) {
    for (const face of part.faces) {
      const n = face.polygon.length;
      if (n < 3) continue;

      const mat = materials[face.material_index];
      const img = showTextures && mat?.has_texture ? loadedImages.get(mat.id) : null;

      if (img && face.uvs && face.uvs.length >= n) {
        // Triangulate n-gon as a triangle fan from vertex 0
        const x0 = face.polygon[0][0] * scale;
        const y0 = face.polygon[0][1] * scale;
        const u0 = face.uvs[0][0];
        const v0 = face.uvs[0][1];

        for (let i = 1; i < n - 1; i++) {
          const x1 = face.polygon[i][0] * scale;
          const y1 = face.polygon[i][1] * scale;
          const u1 = face.uvs[i][0];
          const v1 = face.uvs[i][1];

          const x2 = face.polygon[i + 1][0] * scale;
          const y2 = face.polygon[i + 1][1] * scale;
          const u2 = face.uvs[i + 1][0];
          const v2 = face.uvs[i + 1][1];

          drawTexturedTriangle(
            ctx,
            img,
            x0,
            y0,
            x1,
            y1,
            x2,
            y2,
            u0,
            v0,
            u1,
            v1,
            u2,
            v2
          );
        }
      } else {
        // Draw solid colored polygon
        const color = getMaterialColor(mat, "#f1f5f9");
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(face.polygon[0][0] * scale, face.polygon[0][1] * scale);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(face.polygon[i][0] * scale, face.polygon[i][1] * scale);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}
