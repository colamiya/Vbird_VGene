import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
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

const EntitySwarm: React.FC<{ entities: Entity[], onEntityClick?: (entity: Entity) => void, isLeaping?: boolean }> = ({ entities, onEntityClick, isLeaping }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId !== undefined && onEntityClick) {
      onEntityClick(entities[e.instanceId]);
    }
  };

  // 🔒 只在实体列表变化时更新
  const prevEntitiesRef = useRef<Entity[]>([]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 🔒 降频：每 3 帧更新一次 (20 FPS 对人眼足够)
    const frameCount = Math.floor(state.clock.elapsedTime * 60);
    if (frameCount % 3 !== 0 && !isLeaping) return;

    const hasChanged = entities.length !== prevEntitiesRef.current.length
      || entities.some((e, i) => {
        const prev = prevEntitiesRef.current[i];
        return !prev || e.id !== prev.id || e.energy !== prev.energy;
      });

    if (!hasChanged && !isLeaping) return; // 🔒 无变化时跳过更新

    entities.forEach((entity, i) => {
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
      if (isLeaping) scale *= 2.0; // 坍缩时变亮变大
      
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // 基于道德值的颜色（红色 = 邪恶，蓝色 = 善良）
      const colorA = new THREE.Color('#ff4d4d'); // 邪恶 (Red)
      const colorB = new THREE.Color('#00eaff'); // 善良 (Neon Blue)
      
      tempColor.copy(colorA).lerp(colorB, entity.ethics.altruism);
      
      if (isLeaping) {
        tempColor.lerp(new THREE.Color('#ffffff'), 0.5); // 跃迁时变白
      } else if (entity.score > 50) {
        tempColor.multiplyScalar(1.5);
      }

      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
    prevEntitiesRef.current = entities;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 2000]}
      onClick={handleClick}
    >
      <icosahedronGeometry args={[0.12, 1]} />
      <meshStandardMaterial 
        toneMapped={false} 
        emissive="#ffffff" 
        emissiveIntensity={0.5} 
      />
    </instancedMesh>
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
