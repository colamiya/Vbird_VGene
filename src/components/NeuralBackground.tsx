
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const ParticleSwarm = () => {
  const points = useRef<THREE.Points>(null!);
  
  // 生成粒子数据
  const [positions, colors] = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // 螺旋分布
      const theta = 0.1 * i;
      const r = 5 * Math.sqrt(theta);
      pos[i * 3] = r * Math.cos(theta) + (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (i / count) * 40 - 20;
      pos[i * 3 + 2] = r * Math.sin(theta) + (Math.random() - 0.5) * 2;

      color.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.5);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return [pos, cols];
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    points.current.rotation.y = time * 0.05;
    points.current.rotation.z = time * 0.02;
  });

  return (
    <Points ref={points} positions={positions} colors={colors} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

const NeuralBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 25]} />
        <ParticleSwarm />
      </Canvas>
    </div>
  );
};

export default NeuralBackground;
