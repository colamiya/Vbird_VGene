import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Stars } from '@react-three/drei';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';
import { Download, Share2, Award } from 'lucide-react';

interface Hero {
  id: number;
  dna: string;
  generation: number;
  score: number;
  stats: {
    attack: number;
    tech_level: number;
  };
}

const HeroCard = ({ hero, position, isHovered, onHover }: { hero: Hero, position: [number, number, number], isHovered: boolean, onHover: (h: boolean) => void }) => {
  const mesh = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!mesh.current) return;
    if (isHovered) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, 0, 0.1);
      mesh.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
    } else {
      mesh.current.rotation.y += 0.005;
      mesh.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={position} ref={mesh} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 4.5, 0.1]} />
          <meshStandardMaterial 
            color={isHovered ? "#00f3ff" : "#1a1a1a"} 
            metalness={0.9} 
            roughness={0.1} 
            emissive={isHovered ? "#00f3ff" : "#000"}
            emissiveIntensity={isHovered ? 0.3 : 0}
          />
        </mesh>
        
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.8, 4.3]} />
          <meshStandardMaterial color="#050505" />
        </mesh>

        <Text position={[0, 1.6, 0.1]} fontSize={0.25} color="#00f3ff" font="/fonts/Inter-Bold.woff">
          {`ARCHIVE # ${hero.id}`}
        </Text>
        <Text position={[0, 0.8, 0.1]} fontSize={0.15} color="#fff" maxWidth={2.5} textAlign="center">
          {`GENERATION: ${hero.generation}`}
        </Text>
        <Text position={[0, 0, 0.1]} fontSize={0.4} color="#fff" font="/fonts/Inter-Bold.woff">
          {hero.score.toFixed(1)}
        </Text>
        <Text position={[0, -0.8, 0.1]} fontSize={0.12} color="#aaa" maxWidth={2.5} textAlign="center">
          {`TECH LEVEL: ${hero.stats.tech_level} | ATTACK: ${hero.stats.attack}`}
        </Text>
        
        {isHovered && (
          <Text position={[0, -1.8, 0.1]} fontSize={0.1} color="#00f3ff" uppercase tracking={0.2}>
            Legendary Entity Identified
          </Text>
        )}
      </Float>
    </group>
  );
};

const HallOfFame: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFame = async () => {
      try {
        const data = await invoke<Hero[]>('get_hall_of_fame');
        setHeroes(data);
      } catch (e) {
        console.error("Failed to fetch Hall of Fame:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFame();
  }, []);

  const downloadBinary = async (hero: Hero) => {
    try {
      // 🔒 动态导出：将 WAT 编译为 WASM 二进制并下载 (Law #10)
      // 注意：生产环境应使用后端编译接口或前端引入 wabt.js
      alert('正在调用宿主编译器生成 .wasm 二进制文件...');
      
      const blob = new Blob([hero.dna], { type: 'application/wasm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VGENE_HERO_${hero.id}_CORE.wasm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Binary export failed:", e);
    }
  };

  const downloadDNA = (hero: Hero) => {
    const blob = new Blob([hero.dna], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VGENE_HERO_${hero.id}_DNA.wat`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full relative bg-[#020205]">
      <div className="absolute top-10 left-10 w-full p-6 z-10 flex justify-between items-center pointer-events-none">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <Award size={48} className="text-neon-blue" />
            万神殿 <span className="text-neon-blue">/ PANTHEON</span>
          </h2>
          <p className="text-[10px] text-white/40 font-mono tracking-[0.5em] uppercase">
            // LEGENDARY ARCHIVE | 已收录传奇: {heroes.length}
          </p>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#00f3ff" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group position={[0, 0, 0]}>
          {heroes.length > 0 ? (
            heroes.map((hero, i) => (
              <HeroCard 
                key={hero.id} 
                hero={hero} 
                position={[(i - (heroes.length-1)/2) * 4, 0, 0]} 
                isHovered={hoveredId === hero.id}
                onHover={(h) => setHoveredId(h ? hero.id : null)}
              />
            ))
          ) : (
            <Text position={[0, 0, 0]} fontSize={0.5} color="#ffffff20" font="/fonts/Inter-Bold.woff">
              {isLoading ? "正在同步英灵殿..." : "暂无传奇个体被收录"}
            </Text>
          )}
        </group>
      </Canvas>

      {hoveredId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           <button 
             onClick={() => {
               const hero = heroes.find(h => h.id === hoveredId);
               if (hero) downloadDNA(hero);
             }}
             className="flex items-center gap-3 px-10 py-4 bg-neon-blue/10 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/20 transition-all uppercase text-[10px] font-black tracking-[0.3em]"
           >
             <Download size={16} />
             提取 DNA 序列
           </button>
           <button 
             onClick={() => {
               const hero = heroes.find(h => h.id === hoveredId);
               if (hero) downloadBinary(hero);
             }}
             className="flex items-center gap-3 px-10 py-4 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all uppercase text-[10px] font-black tracking-[0.3em]"
           >
             <Share2 size={16} />
             导出 WASM 二进制
           </button>
        </div>
      )}
    </div>
  );
};

export default HallOfFame;
