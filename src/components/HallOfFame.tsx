import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Image, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Download, Share2 } from 'lucide-react';

interface Hero {
  id: number;
  name: string;
  generation: number;
  score: number;
  kills: number;
  desc: string;
}

const HeroCard = ({ hero, position, isHovered, onHover }: { hero: Hero, position: [number, number, number], isHovered: boolean, onHover: (h: boolean) => void }) => {
  const mesh = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!mesh.current) return;
    // 悬停时旋转面向鼠标
    if (isHovered) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, 0, 0.1);
      mesh.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
    } else {
      // 默认缓慢自转
      mesh.current.rotation.y += 0.005;
      mesh.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={position} ref={mesh} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        {/* 卡牌边框 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 4.5, 0.1]} />
          <meshStandardMaterial 
            color={isHovered ? "#ffd700" : "#333"} 
            metalness={0.8} 
            roughness={0.2} 
            emissive={isHovered ? "#ffd700" : "#000"}
            emissiveIntensity={isHovered ? 0.2 : 0}
          />
        </mesh>
        
        {/* 卡面内容背景 */}
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.8, 4.3]} />
          <meshStandardMaterial color="#111" />
        </mesh>

        {/* 文本信息 */}
        <Text position={[0, 1.5, 0.1]} fontSize={0.3} color="#ffd700" font="/fonts/Inter-Bold.woff">
          {hero.name}
        </Text>
        <Text position={[0, 0.5, 0.1]} fontSize={0.15} color="#fff" maxWidth={2.5} textAlign="center">
          {`GEN: ${hero.generation} | SCORE: ${hero.score}`}
        </Text>
        <Text position={[0, -0.5, 0.1]} fontSize={0.12} color="#aaa" maxWidth={2.5} textAlign="center">
          {hero.desc}
        </Text>
        <Text position={[0, -1.5, 0.1]} fontSize={0.2} color="#f00">
          {`KILLS: ${hero.kills}`}
        </Text>
      </Float>
    </group>
  );
};

const HallOfFame: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const heroes: Hero[] = [
    { id: 1, name: "Alpha One", generation: 42, score: 98.5, kills: 1204, desc: "最初的幸存者，利用溢出漏洞统治了第一纪元。" },
    { id: 2, name: "Void Walker", generation: 156, score: 99.1, kills: 3400, desc: "学会了自我休眠以躲避高能耗检测的幽灵。" },
    { id: 3, name: "Entropy King", generation: 300, score: 99.9, kills: 9999, desc: "直接修改物理常量，导致整个服务器崩溃的罪魁祸首。" },
  ];

  return (
    <div className="w-full h-full relative bg-black">
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center pointer-events-none">
        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Hall of Fame</h2>
          <p className="text-xs text-yellow-500 font-mono tracking-widest">// LEGENDARY ARCHIVE</p>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} color="#ffd700" />
        <pointLight position={[-10, -10, -10]} color="#fff" intensity={0.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group position={[0, -1, 0]}>
          {heroes.map((hero, i) => (
             <HeroCard 
               key={hero.id} 
               hero={hero} 
               position={[(i - 1) * 4, 0, 0]} 
               isHovered={hoveredId === hero.id}
               onHover={(h) => setHoveredId(h ? hero.id : null)}
             />
          ))}
        </group>
      </Canvas>

      {hoveredId && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
           <button className="flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20 transition-all uppercase text-xs font-bold tracking-widest">
             <Download size={14} />
             Download DNA
           </button>
           <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all uppercase text-xs font-bold tracking-widest">
             <Share2 size={14} />
             Share Legend
           </button>
        </div>
      )}
    </div>
  );
};

export default HallOfFame;
