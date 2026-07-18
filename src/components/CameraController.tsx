"use client";

import { useEffect, useState } from "react";
import { OrbitControls } from "@react-three/drei";

export function CameraController({
  onModeChange,
}: {
  onModeChange: (isCameraMode: boolean) => void;
}) {
  const [ctrlPressed, setCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setCtrlPressed(true);
        onModeChange(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setCtrlPressed(false);
        onModeChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    // Also reset on window blur
    const handleBlur = () => {
      setCtrlPressed(false);
      onModeChange(false);
    };
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onModeChange]);

  return (
    <OrbitControls 
      enabled={ctrlPressed} 
      enablePan={false}
      minDistance={3}
      maxDistance={15}
    />
  );
}
