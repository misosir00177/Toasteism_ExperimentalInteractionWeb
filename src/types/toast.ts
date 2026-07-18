export type ToastRegion = "crumb" | "crust";

export type TextPoint = {
  id: number;
  character: string;
  originalPosition: [number, number, number];
  currentPosition: [number, number, number];
  velocity: [number, number, number];
  spawnPosition: [number, number, number]; // Added for stable birth animation
  normal: [number, number, number];
  tangent: [number, number, number]; // Added for surface basis
  bitangent: [number, number, number]; // Added for surface basis
  surfaceUV: [number, number]; // UV of the point on the toast surface
  atlasRect: { x: number; y: number; w: number; h: number }; // Added for separate glyph texture coordinates
  region: ToastRegion;
};
