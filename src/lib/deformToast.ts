import { TextPoint } from "../types/toast";
import { TOAST_PHYSICS } from "../config/toastPhysics";
import * as THREE from "three";

export function deformToast(
  points: TextPoint[],
  interactionCenter: THREE.Vector3 | null,
  interactionDelta: THREE.Vector3 | null, // The movement delta of the cursor
  dt: number
) {
  // We use dt (delta time in seconds) to make physics frame-rate independent
  // Limit dt to avoid explosions on lag spikes
  const safeDt = Math.min(dt, 0.1);
  const timeScale = safeDt * 60.0; // scale based on 60fps baseline

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    
    // Stiffness based on region
    const stiffness = pt.region === "crust" ? TOAST_PHYSICS.crustStiffness : TOAST_PHYSICS.crumbStiffness;

    // Apply interaction force
    if (interactionCenter && interactionDelta) {
      const dist = interactionCenter.distanceTo(new THREE.Vector3(...pt.currentPosition));
      
      if (dist < TOAST_PHYSICS.interactionRadius) {
        // Falloff
        let influence = Math.max(0, 1 - dist / TOAST_PHYSICS.interactionRadius);
        // Smooth falloff
        influence = influence * influence * (3 - 2 * influence);
        
        // Force calculation
        // 1. Normal compression (pushing inwards based on cursor movement)
        // Note: interactionDelta here is the movement of the pointer. 
        // We push points along their negative normal if the delta goes into the surface
        
        // Alternatively, a simpler approach: just move points along interactionDelta
        // but limit tangential movement and maximize normal movement.
        const normalVec = new THREE.Vector3(...pt.normal);
        
        const deltaProjNormal = interactionDelta.clone().projectOnVector(normalVec);
        const deltaProjTangent = interactionDelta.clone().sub(deltaProjNormal);

        // Apply force
        const force = new THREE.Vector3()
          .add(deltaProjNormal)
          .add(deltaProjTangent.multiplyScalar(TOAST_PHYSICS.tangentialDrag))
          .multiplyScalar(influence * (1.0 - stiffness));

        pt.velocity[0] += force.x * timeScale;
        pt.velocity[1] += force.y * timeScale;
        pt.velocity[2] += force.z * timeScale;
      }
    }

    // Spring logic towards permanent deformation
    // Permanent deformation target: a fraction of the distance from current to original
    const orig = new THREE.Vector3(...pt.originalPosition);
    const curr = new THREE.Vector3(...pt.currentPosition);
    
    const displacement = curr.clone().sub(orig);
    const displacementLength = displacement.length();

    // Cap max displacement
    if (displacementLength > TOAST_PHYSICS.maxDisplacement) {
       displacement.setLength(TOAST_PHYSICS.maxDisplacement);
       curr.copy(orig).add(displacement);
       pt.currentPosition = [curr.x, curr.y, curr.z];
    }

    // The rest position incorporates permanent deformation
    const permanentTarget = orig.clone().add(displacement.clone().multiplyScalar(TOAST_PHYSICS.permanentDeformation));

    // Spring force towards permanentTarget
    const springForce = permanentTarget.clone().sub(curr).multiplyScalar(TOAST_PHYSICS.springStrength);
    
    pt.velocity[0] += springForce.x * timeScale;
    pt.velocity[1] += springForce.y * timeScale;
    pt.velocity[2] += springForce.z * timeScale;

    // Apply damping
    const dampingFactor = Math.pow(TOAST_PHYSICS.damping, timeScale);
    pt.velocity[0] *= dampingFactor;
    pt.velocity[1] *= dampingFactor;
    pt.velocity[2] *= dampingFactor;

    // Apply velocity to position
    pt.currentPosition[0] += pt.velocity[0] * timeScale;
    pt.currentPosition[1] += pt.velocity[1] * timeScale;
    pt.currentPosition[2] += pt.velocity[2] * timeScale;
  }
}
