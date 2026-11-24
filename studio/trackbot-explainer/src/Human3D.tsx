import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildRig, applyPose, type Look3D, type Pose3D } from './rigPose';
import { staticFile } from 'remotion';

export type { Look3D, Pose3D } from './rigPose';
// A 3D person built from the MPFB body (models/build_human_mpfb.py): detailed body and face, 53-bone rig with fingers,
// facial morph targets, skinned clothes. Colours come from the series bible (materials are recoloured by name) and every
// pose is driven by numbers, so the same acting values drive the 2D and the 3D cast. Faces +Z, feet at y = 0, about 1.66 m.
export type Held = { color: string; cap: string };
export const Person3D: React.FC<{ look: Look3D; pose?: Pose3D; position?: [number, number, number]; scale?: number; rotY?: number; held?: Held }> = ({ look, pose = {}, position = [0, 0, 0], scale = 1, rotY = 0, held }) => {
  const holdRef = useRef<THREE.Group>(null);
  const bounce = pose.cheer ? Math.abs(Math.sin((pose.walk ?? 0) * 1.5)) * 0.22 * pose.cheer : 0;   // (walking bounce comes from the gait IK)   // two bounces per stride cycle
  const gltf = useLoader(GLTFLoader, staticFile(`models/human_${look.model ?? look.body ?? 'm'}.glb`));
  const key = JSON.stringify(look);
  const rig = useMemo(() => buildRig(gltf.scene, look), [gltf, key]);
  const poseRef = useRef(pose); poseRef.current = pose;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => { applyPose(rig, pose); rig.root.updateMatrixWorld(true); placeHeld(); invalidate(); });
  const placeHeld = () => {          // keep the held object in the +x hand: world position of the hand bone, expressed in this group's frame
    const g = holdRef.current; if (!g || !held) return;
    rig.root.updateMatrixWorld(true);
    const hand = rig.bones[`hand${rig.suf.p}`].getWorldPosition(new THREE.Vector3());
    g.parent!.updateMatrixWorld(true); g.parent!.worldToLocal(hand);
    g.position.set(hand.x, hand.y + 0.09, hand.z + 0.045);
  };
  useFrame(() => { applyPose(rig, poseRef.current); placeHeld(); });
  return <group position={[position[0], position[1] + bounce, position[2]]} scale={scale * 1.08} rotation={[0, rotY, 0]}><primitive object={rig.root} />
    {held && <group ref={holdRef}>
      <mesh castShadow><cylinderGeometry args={[0.036, 0.036, 0.2, 24]} /><meshStandardMaterial color={held.color} roughness={0.35} metalness={0.1} /></mesh>
      <mesh position={[0, 0.115, 0]} castShadow><cylinderGeometry args={[0.03, 0.034, 0.03, 24]} /><meshStandardMaterial color={held.cap} roughness={0.5} /></mesh>
      <mesh position={[0, 0.145, 0]}><torusGeometry args={[0.014, 0.004, 8, 20]} /><meshStandardMaterial color={held.cap} /></mesh>
    </group>}
  </group>;
};
