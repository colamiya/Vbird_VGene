import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';

interface Node {
  id: number;
  parent_id: number | null;
  generation: number;
  score: number;
  dna_preview: string;
  position?: [number, number, number]; // 局部计算位置
}

function seededUnit(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const SceneOrbitControls: React.FC<{
  autoRotateSpeed?: number;
}> = ({ autoRotateSpeed = 0.2 }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.maxDistance = 96;
    controls.minDistance = 8;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [autoRotateSpeed, camera, gl]);

  useFrame(() => controlsRef.current?.update());

  return null;
};

const LightweightStars: React.FC<{ count?: number }> = ({ count = 4200 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const random = seededUnit(0x5745_4c4c);
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const depth = 30 + random() * 110;
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
    opacity: 0.72,
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

const SceneLine: React.FC<{
  points: THREE.Vector3[];
  color: string;
  opacity?: number;
}> = ({ points, color, opacity = 1 }) => {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  }), [color, opacity]);
  const lineObject = useMemo(() => {
    const item = new THREE.Line(geometry, material);
    item.raycast = () => undefined;
    return item;
  }, [geometry, material]);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  useEffect(() => () => {
    material.dispose();
  }, [material]);

  return <primitive object={lineObject} />;
};

const EvolutionGalaxy = ({ nodes, onNodeClick }: { nodes: Node[], onNodeClick: (node: Node) => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  // 🔒 为真实谱系数据计算 3D 布局 (星系螺旋算法)
  const processedNodes = useMemo(() => {
    const positioned: Node[] = [];
    nodes.forEach((node) => {
      const angle = (node.id * 0.5) % (Math.PI * 2);
      const radius = node.generation * 2 + (node.id % 5);
      const y = (node.score - 50) * 0.1;
      
      positioned.push({
        ...node,
        position: [
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ]
      });
    });
    return positioned;
  }, [nodes]);

  const lines = useMemo(() => {
    const l: any[] = [];
    // 🔒 优化：使用 Map 索引加速父节点查找 (O(N))
    const nodeMap = new Map<number, Node>();
    processedNodes.forEach(node => nodeMap.set(node.id, node));

    processedNodes.forEach(node => {
      if (node.parent_id !== null) {
        const parent = nodeMap.get(node.parent_id);
        if (parent && parent.position && node.position) {
          l.push([new THREE.Vector3(...parent.position), new THREE.Vector3(...node.position)]);
        }
      }
    });
    return l;
  }, [processedNodes]);

  return (
    <group ref={groupRef}>
      {lines.map((points, i) => (
        <SceneLine key={`line-${i}`} points={points} color="#00f3ff" opacity={0.1} />
      ))}

      {processedNodes.map((node) => {
        const isElite = node.score > 80;
        const color = isElite ? '#00f3ff' : '#ffffff';
        const size = isElite ? 0.2 : 0.05;

        return (
          <mesh 
            key={node.id} 
            position={node.position} 
            onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
          >
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
            {isElite && (
              <pointLight distance={3} intensity={5} color={color} />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

const PhylogeneticTree: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');
  const [loadStatus, setLoadStatus] = useState('');
  const keyboardNodes = useMemo(
    () =>
      nodes
        .slice()
        .sort((a, b) => b.generation - a.generation || b.score - a.score)
        .slice(0, 16),
    [nodes],
  );

  useEffect(() => {
    const fetchLineage = async () => {
      try {
        const data = await invoke<Node[]>('get_lineage');
        setNodes(data);
        setLoadStatus('');
      } catch (e) {
        console.error("Failed to fetch lineage:", e);
        setLoadStatus('谱系数据同步失败，请稍后重试或查看运行日志。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLineage();
  }, []);

  const copySelectedDnaPreview = async () => {
    if (!selectedNode) return;
    try {
      await navigator.clipboard.writeText(selectedNode.dna_preview);
      setActionStatus(`节点 #${selectedNode.id} 的 DNA 片段已复制。`);
    } catch (e) {
      console.error('Failed to copy lineage DNA preview:', e);
      setActionStatus('复制失败，请手动选中 DNA 片段。');
    }
  };

  return (
    <div className="w-full h-full relative bg-[#020205]">
      <div className="absolute left-4 right-4 top-4 z-10 max-w-[calc(100vw-2rem)] space-y-2 sm:left-8 sm:right-auto sm:top-8 sm:max-w-xl">
        <h2 className="text-lg font-black text-white tracking-normal uppercase italic leading-tight drop-shadow-neon sm:text-3xl sm:tracking-[0.12em]">
          进化星图 <span className="text-neon-blue">/ STELLAR LINEAGE</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <p className="text-[8px] text-white/40 font-mono uppercase tracking-[0.16em] sm:text-[9px] sm:tracking-widest">
            // 观测节点: {nodes.length} | 演化深度: {nodes.length > 0 ? Math.max(...nodes.map(n => n.generation)) : 0}
          </p>
          {isLoading && <div className="w-2 h-2 bg-neon-blue animate-ping rounded-full" />}
        </div>
        {loadStatus && (
          <p aria-live="polite" className="text-[8px] text-red-400 font-mono uppercase tracking-widest">
            {loadStatus}
          </p>
        )}
      </div>

      <Canvas camera={{ position: [0, 20, 40], fov: 45 }}>
        <SceneOrbitControls autoRotateSpeed={0.2} />
        <LightweightStars />
        <EvolutionGalaxy nodes={nodes} onNodeClick={setSelectedNode} />
      </Canvas>

      {keyboardNodes.length > 0 && (
        <div
          role="group"
          aria-label="谱系节点键盘选择"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-28 focus-within:z-20 focus-within:flex focus-within:max-w-[min(28rem,calc(100vw-2rem))] focus-within:flex-wrap focus-within:gap-2 focus-within:bg-black/80 focus-within:p-3 focus-within:backdrop-blur-md"
        >
          {keyboardNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelectedNode(node)}
              className="interactive-focus rounded-sm border border-white/10 px-3 py-2 text-[9px] font-mono text-white/60 hover:border-neon-blue/40 hover:text-neon-blue"
            >
              #{node.id} / G{node.generation}
            </button>
          ))}
        </div>
      )}

      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 max-h-[calc(100vh-8rem)] overflow-y-auto glass-card p-5 border-l-4 border-l-neon-blue animate-in slide-in-from-bottom-8 duration-500 backdrop-blur-xl custom-scrollbar sm:bottom-auto sm:left-auto sm:right-8 sm:top-24 sm:w-72 sm:p-8 sm:animate-in sm:slide-in-from-right-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-neon-blue font-mono text-[10px] uppercase tracking-[0.2em] font-bold">节点指纹</h3>
            <button
              type="button"
              aria-label="关闭节点指纹"
              onClick={() => {
                setSelectedNode(null);
                setActionStatus('');
              }}
              className="interactive-focus px-2 text-white/20 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4 text-[10px] font-mono">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/30 uppercase">标识码</span>
              <span className="text-white font-bold"># {selectedNode.id}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/30 uppercase">演化世代</span>
              <span className="text-white">{selectedNode.generation}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/30 uppercase">适应度</span>
              <span className="text-neon-blue font-bold">{selectedNode.score.toFixed(2)}</span>
            </div>
            
            <div className="pt-4">
              <span className="text-white/30 uppercase block mb-2">DNA 序列片段</span>
              <pre className="max-h-32 overflow-y-auto bg-black/50 p-3 rounded-sm text-[8px] text-white/40 break-all border border-white/5 leading-relaxed custom-scrollbar">
                {selectedNode.dna_preview}…
              </pre>
            </div>
          </div>

          <button
            type="button"
            className="interactive-focus w-full mt-8 py-3 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 text-[9px] font-bold uppercase tracking-[0.2em] transition-colors"
            onClick={copySelectedDnaPreview}
          >
            复制 DNA 片段
          </button>
          {actionStatus && (
            <p aria-live="polite" className="mt-3 text-[8px] text-white/40 font-mono leading-relaxed">
              {actionStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTree;
