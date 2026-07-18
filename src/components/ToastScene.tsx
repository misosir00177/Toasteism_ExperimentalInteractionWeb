"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { loadSourceText } from "../lib/loadSourceText";
import { createCharacterAtlas, AtlasResult } from "../lib/assignCharacters";
import { createToastGeometry } from "../lib/createToastGeometry";
import { TextPoint } from "../types/toast";
import { ToastTextGeometry } from "./ToastTextGeometry";
import { CameraController } from "./CameraController";

export function ToastScene({ resetTrigger }: { resetTrigger: number }) {
  const [points, setPoints] = useState<TextPoint[] | null>(null);
  const [atlas, setAtlas] = useState<AtlasResult | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const text = await loadSourceText();
        if (!active) return;

        const newAtlas = await createCharacterAtlas(text);
        if (!active) return;
        
        const newPoints = createToastGeometry(text, newAtlas);
        if (!active) return;

        setAtlas(newAtlas);
        setPoints(newPoints);
      } catch (err) {
        console.error(err);
        if (active) setError("Failed to initialize 3D scene.");
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500 font-mono">
        {error}
      </div>
    );
  }

  if (!points || !atlas) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 font-mono text-sm tracking-widest">
        [ INITIALIZING STRUCTURAL DATA ]
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.0} />
      <ToastTextGeometry 
        points={points} 
        atlas={atlas} 
        isCameraMode={isCameraMode} 
        resetTrigger={resetTrigger}
      />
      <CameraController onModeChange={setIsCameraMode} />
    </Canvas>
  );
}
