import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

function seededUnit(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const LightweightStars: React.FC<{ count?: number }> = ({ count = 4200 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const random = seededUnit(0x5041_4e54);
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const depth = 24 + random() * 100;
      const item = index * 3;
      positions[item] = Math.sin(phi) * Math.cos(theta) * depth;
      positions[item + 1] = Math.sin(phi) * Math.sin(theta) * depth;
      positions[item + 2] = Math.cos(phi) * depth;
    }
    const item = new THREE.BufferGeometry();
    item.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return item;
  }, [count]);
  const material = useMemo(() => new THREE.PointsMaterial({
    color: '#dffcff',
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  useEffect(() => () => {
    material.dispose();
  }, [material]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.002;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} raycast={() => undefined} />;
};

const HeroCard = ({
  hero,
  position,
  isHovered,
  onHover,
  onSelect,
}: {
  hero: Hero;
  position: [number, number, number];
  isHovered: boolean;
  onHover: (h: boolean) => void;
  onSelect: () => void;
}) => {
  const mesh = useRef<THREE.Group>(null);
  const plate = useRef<THREE.Group>(null);
  const scoreRatio = Math.max(0.04, Math.min(1, hero.score / 100));
  const techRatio = Math.max(0.04, Math.min(1, hero.stats.tech_level / 100));
  const attackRatio = Math.max(0.04, Math.min(1, hero.stats.attack / 100));
  
  useFrame((state) => {
    if (!mesh.current) return;
    if (isHovered) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, 0, 0.1);
      mesh.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
    } else {
      mesh.current.rotation.y += 0.005;
      mesh.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
    if (plate.current) {
      plate.current.position.y = Math.sin(state.clock.elapsedTime * 1.4 + hero.id) * 0.12;
    }
  });

  return (
    <group
      position={position}
      ref={mesh}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => onHover(true)}
      onPointerOut={() => onHover(false)}
    >
      <group ref={plate}>
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

        <mesh position={[0, 1.7, 0.12]}>
          <boxGeometry args={[2.2, 0.08, 0.04]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={isHovered ? 0.92 : 0.58} />
        </mesh>
        <mesh position={[-1.1 + scoreRatio * 1.1, 0.62, 0.12]}>
          <boxGeometry args={[2.2 * scoreRatio, 0.12, 0.035]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.78} />
        </mesh>
        <mesh position={[-1.1 + techRatio * 1.1, -0.22, 0.12]}>
          <boxGeometry args={[2.2 * techRatio, 0.08, 0.035]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.68} />
        </mesh>
        <mesh position={[-1.1 + attackRatio * 1.1, -0.62, 0.12]}>
          <boxGeometry args={[2.2 * attackRatio, 0.08, 0.035]} />
          <meshBasicMaterial color="#ff4d4d" transparent opacity={0.62} />
        </mesh>
        <mesh position={[0, -1.45, 0.12]}>
          <ringGeometry args={[0.34, 0.41, 6]} />
          <meshBasicMaterial color={isHovered ? '#00f3ff' : '#ffffff'} transparent opacity={isHovered ? 0.8 : 0.35} />
        </mesh>
        {isHovered && (
          <mesh position={[0, -1.86, 0.13]}>
            <boxGeometry args={[1.2, 0.05, 0.04]} />
            <meshBasicMaterial color="#00f3ff" transparent opacity={0.86} />
          </mesh>
        )}
      </group>
    </group>
  );
};

const HallOfFame: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState('');
  const [loadStatus, setLoadStatus] = useState('');

  const activeHeroId = hoveredId ?? selectedId;
  const activeHero = activeHeroId === null ? null : heroes.find((hero) => hero.id === activeHeroId) ?? null;
  const keyboardHeroes = useMemo(() => heroes.slice(0, 12), [heroes]);

  useEffect(() => {
    const fetchFame = async () => {
      try {
        const data = await invoke<Hero[]>('get_hall_of_fame');
        setHeroes(data);
        setLoadStatus('');
      } catch (e) {
        console.error("Failed to fetch Hall of Fame:", e);
        setLoadStatus('英灵殿同步失败，请稍后重试或查看运行日志。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFame();
  }, []);

  const downloadWatArchive = async (hero: Hero) => {
    try {
      const blob = new Blob([hero.dna], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VGENE_HERO_${hero.id}_CORE.wat`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`英雄 #${hero.id} 的 WAT 源文件已导出。`);
    } catch (e) {
      console.error("WAT export failed:", e);
      setExportStatus(`英雄 #${hero.id} 导出失败，请查看控制台。`);
    }
  };

  const downloadDNA = (hero: Hero) => {
    try {
      const blob = new Blob([hero.dna], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VGENE_HERO_${hero.id}_DNA.wat`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`英雄 #${hero.id} 的 DNA 序列已导出。`);
    } catch (e) {
      console.error("DNA export failed:", e);
      setExportStatus(`英雄 #${hero.id} DNA 导出失败，请查看控制台。`);
    }
  };

  return (
    <div className="w-full h-full relative bg-[#020205]">
      <div className="absolute top-6 left-4 right-4 sm:top-10 sm:left-10 sm:right-10 p-2 sm:p-6 z-10 flex justify-between items-center pointer-events-none">
        <div className="min-w-0 space-y-2">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-black text-white italic uppercase tracking-normal leading-tight sm:gap-4 sm:text-5xl">
            <Award className="h-7 w-7 shrink-0 text-neon-blue sm:h-12 sm:w-12" aria-hidden="true" />
            万神殿 <span className="text-neon-blue">/ PANTHEON</span>
          </h2>
          <p className="text-[9px] text-white/40 font-mono tracking-[0.18em] uppercase leading-relaxed sm:text-[10px] sm:tracking-[0.32em]">
            // LEGENDARY ARCHIVE | 已收录传奇: {heroes.length}
          </p>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#00f3ff" />
        <LightweightStars />
        
        <group position={[0, 0, 0]}>
          {heroes.length > 0 && (
            heroes.map((hero, i) => (
              <HeroCard
                key={hero.id}
                hero={hero}
                position={[(i - (heroes.length-1)/2) * 4, 0, 0]}
                isHovered={activeHeroId === hero.id}
                onHover={(h) => setHoveredId(h ? hero.id : null)}
                onSelect={() => setSelectedId(hero.id)}
              />
            ))
          )}
        </group>
      </Canvas>

      {heroes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <p className="border border-white/10 bg-black/70 px-5 py-4 text-center text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 backdrop-blur-md">
            {isLoading ? "正在同步英灵殿…" : "暂无传奇个体被收录"}
          </p>
        </div>
      )}

      {keyboardHeroes.length > 0 && (
        <div
          role="group"
          aria-label="英灵键盘选择"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-28 focus-within:z-20 focus-within:flex focus-within:max-w-[min(28rem,calc(100vw-2rem))] focus-within:flex-wrap focus-within:gap-2 focus-within:bg-black/80 focus-within:p-3 focus-within:backdrop-blur-md"
        >
          {keyboardHeroes.map((hero) => (
            <button
              key={hero.id}
              type="button"
              onClick={() => setSelectedId(hero.id)}
              className="interactive-focus rounded-sm border border-white/10 px-3 py-2 text-[9px] font-mono text-white/60 hover:border-neon-blue/40 hover:text-neon-blue"
            >
              #{hero.id} / {hero.score.toFixed(1)}
            </button>
          ))}
        </div>
      )}

      {activeHeroId !== null && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex w-[min(42rem,calc(100vw-2rem))] flex-col sm:flex-row gap-3 sm:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           {activeHero && (
             <div className="w-full border border-white/10 bg-black/80 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45 backdrop-blur-md sm:w-56">
               <span className="block text-neon-blue">ARCHIVE #{activeHero.id}</span>
               <span className="mt-1 block">G{activeHero.generation} / S {activeHero.score.toFixed(1)}</span>
             </div>
           )}
           <button
             type="button"
             onClick={() => {
               const hero = heroes.find(h => h.id === activeHeroId);
               if (hero) downloadDNA(hero);
             }}
             className="interactive-focus flex flex-1 items-center justify-center gap-3 px-6 sm:px-10 py-4 bg-neon-blue/10 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/20 transition-colors uppercase text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em]"
           >
             <Download size={16} aria-hidden="true" />
             提取 DNA 序列
           </button>
           <button
             type="button"
             onClick={() => {
               const hero = heroes.find(h => h.id === activeHeroId);
               if (hero) downloadWatArchive(hero);
             }}
             className="interactive-focus flex flex-1 items-center justify-center gap-3 px-6 sm:px-10 py-4 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-[border-color,color,background-color] uppercase text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em]"
           >
             <Share2 size={16} aria-hidden="true" />
             导出 WAT 文件
           </button>
        </div>
      )}
      {(loadStatus || exportStatus) && (
        <p aria-live="polite" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-white/40 font-mono uppercase tracking-widest">
          {loadStatus || exportStatus}
        </p>
      )}
    </div>
  );
};

export default HallOfFame;
