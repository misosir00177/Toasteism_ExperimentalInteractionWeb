import * as THREE from 'three';

export type AtlasResult = {
  texture: THREE.CanvasTexture;
  atlasMap: Map<string, { x: number; y: number; w: number; h: number }>;
  uniqueChars: string[];
};

export async function createCharacterAtlas(text: string, maxTextureSize: number = 4096): Promise<AtlasResult> {
  // Wait for fonts to be ready
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // Unicode-safe array
  const chars = Array.from(text);
  const uniqueChars = Array.from(new Set(chars));

  const fontSize = 64; // Hi-res for crispness
  const padding = 8;
  const cellSize = fontSize + padding * 2;
  
  // Calculate grid dimensions
  let cols = Math.ceil(Math.sqrt(uniqueChars.length));
  let rows = Math.ceil(uniqueChars.length / cols);

  // Protect against exceeding max texture size
  while (cols * cellSize > maxTextureSize) {
    cols--;
    rows = Math.ceil(uniqueChars.length / cols);
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = THREE.MathUtils.ceilPowerOfTwo(cols * cellSize);
  canvas.height = THREE.MathUtils.ceilPowerOfTwo(rows * cellSize);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not create 2d context for atlas.");

  // Clear background (transparent)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Post-human aesthetic style font
  ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw text
  ctx.fillStyle = '#E5E7EB'; // Light gray
  
  const atlasMap = new Map<string, { x: number; y: number; w: number; h: number }>();

  uniqueChars.forEach((char, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * cellSize;
    const y = row * cellSize;
    
    // Draw char at center of cell
    ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
    
    // UV rect in 0-1 space
    atlasMap.set(char, {
      x: x / canvas.width,
      y: 1.0 - (y + cellSize) / canvas.height, // Three.js texture coordinate system Y is inverted
      w: cellSize / canvas.width,
      h: cellSize / canvas.height,
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; // Can use Linear for smoother downscaling
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  return {
    texture,
    atlasMap,
    uniqueChars
  };
}
