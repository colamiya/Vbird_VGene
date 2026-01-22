import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';

interface Entity {
  id: number;
  position: [number, number, number];
  ethics: {
    altruism: number; // 0.0 到 1.0
  };
  score: number;
  energy: number;
  metabolic_toxin: number;
  generation: number;
}

interface ArenaProps {
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  isLeaping?: boolean;
}

const InterferenceRipple = ({ position }: { position: THREE.Vector3 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.addScalar(0.2);
      setOpacity(prev => Math.max(0, prev - 0.02));
    }
  });

  if (opacity <= 0) return null;

  return (
    <mesh position={position} ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.1, 0.2, 32]} />
      <meshBasicMaterial color="#00f3ff" transparent opacity={opacity} />
    </mesh>
  );
};

const EntitySwarm: React.FC<{ entities: Entity[], onEntityClick?: (entity: Entity) => void, isLeaping?: boolean }> = ({ entities, onEntityClick, isLeaping }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [ripples, setRipples] = useState<{ id: number, pos: THREE.Vector3 }[]>([]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const handleClick = async (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    
    // 🔒 观察者干扰 (Law #18)
    const clickPos = e.point;
    setRipples(prev => [...prev, { id: Date.now(), pos: clickPos.clone() }].slice(-5));
    
    try {
      await invoke('interfere_at', { x: clickPos.x, y: clickPos.y, z: clickPos.z });
    } catch (err) {
      console.error("Interference failed:", err);
    }

    if (e.instanceId !== undefined && onEntityClick) {
      onEntityClick(entities[e.instanceId]);
    }
  };

  // 🔒 优化后的状态追踪，减少内存压力
  const lastStateRef = useRef<Map<number, { energy: number, x: number, y: number, z: number }>>(new Map());

  useFrame((state) => {
    if (!meshRef.current) return;

    // 🔒 降频：每 3 帧更新一次 (20 FPS 对人眼足够)
    const frameCount = Math.floor(state.clock.elapsedTime * 60);
    if (frameCount % 3 !== 0 && !isLeaping) return;

    // 🔒 识别变化的实体索引 (脏检查)
    const changedIndices: number[] = [];
    entities.forEach((e, i) => {
      const prev = lastStateRef.current.get(e.id);
      if (
        !prev || 
        e.energy !== prev.energy || 
        e.position[0] !== prev.x ||
        e.position[1] !== prev.y ||
        e.position[2] !== prev.z ||
        isLeaping
      ) {
        changedIndices.push(i);
        // 更新记录
        lastStateRef.current.set(e.id, { 
          energy: e.energy, 
          x: e.position[0], 
          y: e.position[1], 
          z: e.position[2] 
        });
      }
    });

    if (changedIndices.length === 0 && !isLeaping) return; 

    // 清理已不存在的实体记录
    if (lastStateRef.current.size > entities.length * 2) {
      const currentIds = new Set(entities.map(e => e.id));
      for (const id of lastStateRef.current.keys()) {
        if (!currentIds.has(id)) lastStateRef.current.delete(id);
      }
    }

    changedIndices.forEach(i => {
      const entity = entities[i];
      if (!entity) return;

      // 位置
      let [x, y, z] = entity.position;
      
      // 跃迁效果：所有粒子向中心坍缩
      if (isLeaping) {
        const factor = 0.95;
        x *= factor;
        y *= factor;
        z *= factor;
      }

      tempObject.position.set(x, y, z);
      
      let scale = entity.energy / 100 * 1.5 + 0.5;
      if (isLeaping) scale *= 2.0; 
      
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // 基于道德值的颜色
      const colorA = new THREE.Color('#ff4d4d'); 
      const colorB = new THREE.Color('#00eaff'); 
      
      tempColor.copy(colorA).lerp(colorB, entity.ethics.altruism);
      
      if (isLeaping) {
        tempColor.lerp(new THREE.Color('#ffffff'), 0.5); 
      } else if (entity.score > 50) {
        tempColor.multiplyScalar(1.5);
      }

      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group onClick={handleClick}>
      {ripples.map(r => <InterferenceRipple key={r.id} position={r.pos} />)}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, 2000]}
      >
      <icosahedronGeometry args={[0.12, 1]} />
      <meshStandardMaterial 
        toneMapped={false} 
        emissive="#ffffff" 
        emissiveIntensity={0.5} 
      />
    </instancedMesh>
    </group>
  );
};

const Arena: React.FC<ArenaProps> = ({ entities, onEntityClick, isLeaping }) => {
  return (
    <div className="w-full h-full absolute inset-0 -z-10 bg-black">
      <Canvas gl={{ antialias: false, powerPreference: "high-performance" }}>
        <PerspectiveCamera makeDefault position={[0, 0, 20]} />
        <OrbitControls 
            autoRotate 
            autoRotateSpeed={0.05} 
            maxDistance={50}
            minDistance={2}
            enablePan={false}
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#00eaff" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#bd00ff" />
        
        <Stars radius={150} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />
        
        <EntitySwarm entities={entities} onEntityClick={onEntityClick} isLeaping={isLeaping} />
        
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.2} radius={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Arena;
