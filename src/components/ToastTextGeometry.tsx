"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { TextPoint } from "../types/toast";
import { deformToast } from "../lib/deformToast";
import { AtlasResult } from "../lib/assignCharacters";
import { TOAST_GEOMETRY } from "../config/toastPhysics";

export function ToastTextGeometry({
  points,
  atlas,
  isCameraMode,
  resetTrigger
}: {
  points: TextPoint[];
  atlas: AtlasResult;
  isCameraMode: boolean;
  resetTrigger: number;
}) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const hitMeshRef = useRef<THREE.Mesh>(null);

  const pointerDown = useRef(false);
  const interactionCenter = useRef<THREE.Vector3 | null>(null);
  const lastInteractionCenter = useRef<THREE.Vector3 | null>(null);
  const interactionDelta = useRef<THREE.Vector3 | null>(null);

  const [birthStartTime, setBirthStartTime] = useState<number>(0);
  const BIRTH_DURATION = 3.0;

  useEffect(() => {
    setBirthStartTime(performance.now() / 1000);
    for (let i = 0; i < points.length; i++) {
        points[i].currentPosition = [...points[i].spawnPosition];
        points[i].velocity = [0, 0, 0];
    }
  }, [points, resetTrigger]);

  const vertexCount = points.length * 4;
  const indexCount = points.length * 6;

  const { positions, uvs, colors, indices } = useMemo(() => {
    const pos = new Float32Array(vertexCount * 3);
    const uv = new Float32Array(vertexCount * 2);
    const col = new Float32Array(vertexCount * 3);
    const ind = new Uint32Array(indexCount);

    for (let i = 0; i < points.length; i++) {
      const vIdx = i * 4;
      const iIdx = i * 6;
      ind[iIdx + 0] = vIdx + 0;
      ind[iIdx + 1] = vIdx + 1;
      ind[iIdx + 2] = vIdx + 2;
      ind[iIdx + 3] = vIdx + 2;
      ind[iIdx + 4] = vIdx + 3;
      ind[iIdx + 5] = vIdx + 0;
      
      const pt = points[i];
      // Color coded: crumb = white, crust = orange
      const color = pt.region === "crust" ? new THREE.Color(0xff8800) : new THREE.Color(0xffffff);
      const cIdx = i * 4 * 3;
      for (let v = 0; v < 4; v++) {
        col[cIdx + v*3 + 0] = color.r;
        col[cIdx + v*3 + 1] = color.g;
        col[cIdx + v*3 + 2] = color.b;
      }
    }

    return { positions: pos, uvs: uv, colors: col, indices: ind };
  }, [points.length, points]); 

  useMemo(() => {
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const { x, y, w, h } = pt.atlasRect;
      const vIdx = i * 4 * 2;
      
      uvs[vIdx + 0] = x;
      uvs[vIdx + 1] = y;
      
      uvs[vIdx + 2] = x + w;
      uvs[vIdx + 3] = y;
      
      uvs[vIdx + 4] = x + w;
      uvs[vIdx + 5] = y + h;
      
      uvs[vIdx + 6] = x;
      uvs[vIdx + 7] = y + h;
    }
  }, [points, uvs]);

  useFrame((state, delta) => {
    if (!geometryRef.current) return;

    const currentTime = state.clock.elapsedTime;
    let birthProgress = 1.0;
    
    if (birthStartTime > 0) {
      birthProgress = Math.min(1.0, (currentTime - birthStartTime) / BIRTH_DURATION);
    }

    if (birthProgress >= 1.0 && !isCameraMode) {
      deformToast(points, pointerDown.current ? interactionCenter.current : null, interactionDelta.current, delta);
    } else if (birthProgress < 1.0) {
      const ease = 1 - Math.pow(1 - birthProgress, 3);
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const spawn = new THREE.Vector3(...pt.spawnPosition);
        const orig = new THREE.Vector3(...pt.originalPosition);
        const curr = new THREE.Vector3().lerpVectors(spawn, orig, ease);
        pt.currentPosition = [curr.x, curr.y, curr.z];
      }
    }

    if (interactionDelta.current) {
        interactionDelta.current.set(0, 0, 0);
    }

    const charSize = 0.05;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const cp = new THREE.Vector3(...pt.currentPosition);
      const vIdx = i * 4 * 3;

      const tangent = new THREE.Vector3(...pt.tangent).multiplyScalar(charSize / 2);
      const bitangent = new THREE.Vector3(...pt.bitangent).multiplyScalar(charSize / 2);

      positions[vIdx + 0] = cp.x - tangent.x - bitangent.x;
      positions[vIdx + 1] = cp.y - tangent.y - bitangent.y;
      positions[vIdx + 2] = cp.z - tangent.z - bitangent.z;

      positions[vIdx + 3] = cp.x + tangent.x - bitangent.x;
      positions[vIdx + 4] = cp.y + tangent.y - bitangent.y;
      positions[vIdx + 5] = cp.z + tangent.z - bitangent.z;

      positions[vIdx + 6] = cp.x + tangent.x + bitangent.x;
      positions[vIdx + 7] = cp.y + tangent.y + bitangent.y;
      positions[vIdx + 8] = cp.z + tangent.z + bitangent.z;

      positions[vIdx + 9] = cp.x - tangent.x + bitangent.x;
      positions[vIdx + 10] = cp.y - tangent.y + bitangent.y;
      positions[vIdx + 11] = cp.z - tangent.z + bitangent.z;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
  });

  const handlePointerDown = (e: any) => {
    if (isCameraMode || birthStartTime > 0 && performance.now() / 1000 - birthStartTime < BIRTH_DURATION) return;
    e.stopPropagation();
    
    if (hitMeshRef.current && e.pointerId) {
      (e.target as any).setPointerCapture(e.pointerId);
    }

    pointerDown.current = true;
    interactionCenter.current = e.point.clone();
    lastInteractionCenter.current = e.point.clone();
    interactionDelta.current = new THREE.Vector3(0,0,0);
  };

  const handlePointerMove = (e: any) => {
    if (!pointerDown.current || isCameraMode) return;
    e.stopPropagation();

    if (lastInteractionCenter.current) {
        interactionDelta.current = new THREE.Vector3().subVectors(e.point, lastInteractionCenter.current);
    }
    
    interactionCenter.current = e.point.clone();
    lastInteractionCenter.current = e.point.clone();
  };

  const handlePointerUp = (e: any) => {
    if (isCameraMode) return;
    pointerDown.current = false;
    interactionDelta.current = new THREE.Vector3(0,0,0);
    
    if (hitMeshRef.current && e.pointerId) {
      try {
        (e.target as any).releasePointerCapture(e.pointerId);
      } catch(err) {}
    }
  };

  return (
    <group>
      <mesh frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            usage={THREE.DynamicDrawUsage}
          />
          <bufferAttribute
            attach="attributes-uv"
            args={[uvs, 2]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="index"
            args={[indices, 1]}
          />
        </bufferGeometry>
        <meshBasicMaterial 
          map={atlas.texture} 
          transparent={true} 
          side={THREE.FrontSide} // Render as single-sided!
          alphaTest={0.1}
          vertexColors={true}  // Use our crumb/crust colors
        />
      </mesh>

      <mesh
        ref={hitMeshRef}
        visible={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      >
        <boxGeometry args={[TOAST_GEOMETRY.width, TOAST_GEOMETRY.height, TOAST_GEOMETRY.thickness + 0.2]} />
        <meshBasicMaterial transparent opacity={0.0} />
      </mesh>
    </group>
  );
}
