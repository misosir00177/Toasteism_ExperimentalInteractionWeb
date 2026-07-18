import { TextPoint, ToastRegion } from "../types/toast";
import { TOAST_GEOMETRY } from "../config/toastPhysics";
import * as THREE from "three";
import { AtlasResult } from "./assignCharacters";

export function createToastGeometry(
  text: string,
  atlas: AtlasResult,
  maxPoints: number = TOAST_GEOMETRY.glyphCount
): TextPoint[] {
  const points: TextPoint[] = [];
  const chars = Array.from(text);
  
  if (chars.length === 0 || maxPoints <= 0) return points;

  // We want to distribute points over front, back, and sides.
  // Area approx:
  // Front: W * H (minus top corners, but we'll simplify to rectangle with rounded top)
  // Back: W * H
  // Sides: 2*H*T + W*T + top_arc*T
  // We'll use a deterministic approach.
  
  const w = TOAST_GEOMETRY.width;
  const h = TOAST_GEOMETRY.height;
  const t = TOAST_GEOMETRY.thickness;
  const r = TOAST_GEOMETRY.radius;

  // Let's create a 2D shape for the toast to see if a point is inside
  const isInsideToast = (x: number, y: number, inset: number = 0) => {
    const w_in = w - 2 * inset;
    const h_in = h - 2 * inset;
    const r_in = r - inset;
    
    if (r_in < 0 || w_in <= 0 || h_in <= 0) return false;
    
    // x in [-w_in/2, w_in/2]
    if (Math.abs(x) > w_in / 2) return false;
    // y in [-h_in/2, h_in/2]
    if (y < -h_in / 2) return false;
    
    // Top part is rounded
    if (y > h_in / 2 - r_in) {
      // Check distance to top corners centers
      const cx = w_in / 2 - r_in;
      const cy = h_in / 2 - r_in;
      if (x > cx && Math.pow(x - cx, 2) + Math.pow(y - cy, 2) > r_in * r_in) return false;
      if (x < -cx && Math.pow(x + cx, 2) + Math.pow(y - cy, 2) > r_in * r_in) return false;
    }
    // Bottom taper
    if (y < -h_in / 2 + r_in) {
        // slightly tapered
        const bottomIndent = 0.1;
        const progress = ((-h_in / 2 + r_in) - y) / r_in; // 0 to 1
        if (Math.abs(x) > (w_in / 2) - bottomIndent * progress) return false;
    }
    return true;
  };

  const margin = 0.25; // crust thickness

  // We will distribute points systematically to consume `maxPoints`
  // We need to figure out total surface area to set spacing.
  const frontBackArea = 2 * (w * h);
  const sideArea = (w + 2 * h + Math.PI * r) * t;
  const totalArea = frontBackArea + sideArea;
  
  // N points over totalArea -> Area per point = totalArea / N
  // spacing = sqrt(Area per point)
  const spacing = Math.sqrt(totalArea / maxPoints);

  let charIndex = 0;
  let idCount = 0;

  const addPoint = (
    x: number, y: number, z: number, 
    nx: number, ny: number, nz: number, 
    region: ToastRegion,
    surfaceU: number, surfaceV: number
  ) => {
    if (idCount >= maxPoints) return;

    const char = chars[charIndex % chars.length];
    const atlasRect = atlas.atlasMap.get(char) || atlas.atlasMap.get(chars[0]) || { x: 0, y: 0, w: 1, h: 1 };
    
    // Spawn positions: slightly exploded radially
    const spread = 5.0;
    const sx = x + (Math.random() - 0.5) * spread;
    const sy = y + (Math.random() - 0.5) * spread;
    const sz = z + (Math.random() - 0.5) * spread;

    // Basis vectors
    let tx = 1, ty = 0, tz = 0;
    let bx = 0, by = 1, bz = 0;

    const normal = new THREE.Vector3(nx, ny, nz).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    if (Math.abs(normal.dot(up)) > 0.99) {
      // Top or bottom side
      const right = new THREE.Vector3(1, 0, 0);
      const forward = new THREE.Vector3().crossVectors(normal, right).normalize();
      tx = right.x; ty = right.y; tz = right.z;
      bx = forward.x; by = forward.y; bz = forward.z;
    } else {
      // General case: compute robust orthonormal basis.
      // right = cross(up, normal) ensures tangent x bitangent = normal (correct CCW winding)
      const right = new THREE.Vector3().crossVectors(up, normal).normalize();
      const forward = new THREE.Vector3().crossVectors(normal, right).normalize();
      
      tx = right.x; ty = right.y; tz = right.z;
      bx = forward.x; by = forward.y; bz = forward.z;
    }

    points.push({
      id: idCount++,
      character: char,
      originalPosition: [x, y, z],
      currentPosition: [x, y, z],
      velocity: [0, 0, 0],
      spawnPosition: [sx, sy, sz],
      normal: [normal.x, normal.y, normal.z],
      tangent: [tx, ty, tz],
      bitangent: [bx, by, bz],
      surfaceUV: [surfaceU, surfaceV],
      atlasRect,
      region
    });

    charIndex++;
  };

  // Generate Front Face (+z) - Crumb Only
  for (let y = h / 2; y >= -h / 2; y -= spacing) {
    for (let x = -w / 2; x <= w / 2; x += spacing) {
      if (isInsideToast(x, y, margin)) {
        addPoint(
          x, y, t / 2,
          0, 0, 1,
          "crumb",
          (x + w / 2) / w, (y + h / 2) / h
        );
      }
    }
  }

  // Generate Back Face (-z) - Crumb Only
  for (let y = h / 2; y >= -h / 2; y -= spacing) {
    for (let x = w / 2; x >= -w / 2; x -= spacing) { 
      if (isInsideToast(x, y, margin)) {
        addPoint(
          x, y, -t / 2,
          0, 0, -1,
          "crumb",
          1.0 - (x + w / 2) / w, (y + h / 2) / h
        );
      }
    }
  }

  // Generate Sides
  // Trace the perimeter accurately, including rounded corners and bottom tapers
  const perimeterPoints: {x: number, y: number, nx: number, ny: number}[] = [];
  
  // Left side
  for (let y = -h/2 + r; y <= h/2 - r; y += spacing) {
      perimeterPoints.push({ x: -w/2, y, nx: -1, ny: 0 });
  }
  
  // Top-left corner
  const cxLeft = -w/2 + r;
  const cyTop = h/2 - r;
  const cornerSteps = Math.max(1, Math.ceil((Math.PI / 2 * r) / spacing));
  for (let i = 1; i < cornerSteps; i++) {
      const angle = Math.PI - (Math.PI / 2) * (i / cornerSteps);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      perimeterPoints.push({ x: cxLeft + r * nx, y: cyTop + r * ny, nx, ny });
  }

  // Top side
  for (let x = -w/2 + r; x <= w/2 - r; x += spacing) {
      perimeterPoints.push({ x, y: h/2, nx: 0, ny: 1 });
  }

  // Top-right corner
  const cxRight = w/2 - r;
  for (let i = 1; i < cornerSteps; i++) {
      const angle = Math.PI / 2 - (Math.PI / 2) * (i / cornerSteps);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      perimeterPoints.push({ x: cxRight + r * nx, y: cyTop + r * ny, nx, ny });
  }

  // Right side
  for (let y = h/2 - r; y >= -h/2 + r; y -= spacing) {
      perimeterPoints.push({ x: w/2, y, nx: 1, ny: 0 });
  }

  // Bottom-right taper
  const bottomIndent = 0.1;
  const taperLength = Math.hypot(bottomIndent, r);
  const taperSteps = Math.max(1, Math.ceil(taperLength / spacing));
  for (let i = 1; i < taperSteps; i++) {
      const progress = i / taperSteps;
      const y = (-h/2 + r) - r * progress;
      const x = (w/2) - bottomIndent * progress;
      const nx = r / taperLength;
      const ny = -bottomIndent / taperLength;
      perimeterPoints.push({ x, y, nx, ny });
  }

  // Bottom side
  for (let x = w/2 - bottomIndent; x >= -w/2 + bottomIndent; x -= spacing) {
      perimeterPoints.push({ x, y: -h/2, nx: 0, ny: -1 });
  }

  // Bottom-left taper
  for (let i = 1; i < taperSteps; i++) {
      const progress = 1 - (i / taperSteps);
      const y = (-h/2 + r) - r * progress;
      const x = - (w/2 - bottomIndent * progress);
      const nx = -r / taperLength;
      const ny = -bottomIndent / taperLength;
      perimeterPoints.push({ x, y, nx, ny });
  }

  // Generate Continuous Crust Loop (Front Bevel -> Side Band -> Back Bevel)
  const L_bevel = (Math.PI / 2) * margin;
  const L_side = t - 2 * margin;
  const totalCrustLength = 2 * L_bevel + L_side;

  for (const pp of perimeterPoints) {
    for (let s = 0; s <= totalCrustLength; s += spacing) {
        let d = 0, z = 0, nx = 0, ny = 0, nz = 0;

        if (s <= L_bevel) {
            // Front curved bevel
            const theta = (s / L_bevel) * (Math.PI / 2); // 0 to PI/2
            d = margin * (1 - Math.sin(theta));
            z = t/2 - margin * (1 - Math.cos(theta));
            nx = pp.nx * Math.sin(theta);
            ny = pp.ny * Math.sin(theta);
            nz = Math.cos(theta);
        } else if (s <= L_bevel + L_side) {
            // Side flat band
            const s_side = s - L_bevel;
            d = 0;
            z = (t/2 - margin) - s_side;
            nx = pp.nx;
            ny = pp.ny;
            nz = 0;
        } else {
            // Back curved bevel
            const s_back = s - L_bevel - L_side;
            const theta = (s_back / L_bevel) * (Math.PI / 2); // 0 to PI/2
            d = margin * (1 - Math.cos(theta));
            z = -t/2 + margin * (1 - Math.sin(theta));
            nx = pp.nx * Math.cos(theta);
            ny = pp.ny * Math.cos(theta);
            nz = -Math.sin(theta);
        }

        const x = pp.x - d * pp.nx;
        const y = pp.y - d * pp.ny;

        addPoint(
            x, y, z,
            nx, ny, nz,
            "crust",
            s / totalCrustLength, (pp.y + h/2)/h
        );
    }
  }

  return points;
}
