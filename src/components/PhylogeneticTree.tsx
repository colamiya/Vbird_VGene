import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Stars, Bloom, EffectComposer } from '@react-three/drei';
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
    nodes.forEach((node, i) => {
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
        <Line 
          key={`line-${i}`} 
          points={points} 
          color="#00f3ff" 
          lineWidth={0.5} 
          transparent 
          opacity={0.1} 
        />
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

  useEffect(() => {
    const fetchLineage = async () => {
      try {
        const data = await invoke<Node[]>('get_lineage');
        setNodes(data);
      } catch (e) {
        console.error("Failed to fetch lineage:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLineage();
  }, []);

  return (
    <div className="w-full h-full relative bg-[#020205]">
      <div className="absolute top-8 left-8 z-10 space-y-2">
        <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase italic drop-shadow-neon">
          进化星图 <span className="text-neon-blue">/ STELLAR LINEAGE</span>
        </h2>
        <div className="flex items-center gap-4">
          <p className="text-[9px] text-white/40 font-mono uppercase tracking-widest">
            // 观测节点: {nodes.length} | 演化深度: {nodes.length > 0 ? Math.max(...nodes.map(n => n.generation)) : 0}
          </p>
          {isLoading && <div className="w-2 h-2 bg-neon-blue animate-ping rounded-full" />}
        </div>
      </div>

      <Canvas camera={{ position: [0, 20, 40], fov: 45 }}>
        <OrbitControls autoRotate autoRotateSpeed={0.2} enableDamping />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <EvolutionGalaxy nodes={nodes} onNodeClick={setSelectedNode} />
      </Canvas>

      {selectedNode && (
        <div className="absolute top-24 right-8 w-72 glass-card p-8 border-l-4 border-l-neon-blue animate-in slide-in-from-right-8 duration-500 backdrop-blur-xl">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-neon-blue font-mono text-[10px] uppercase tracking-[0.3em] font-bold">节点指纹</h3>
            <button onClick={() => setSelectedNode(null)} className="text-white/20 hover:text-white transition-colors">×</button>
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
              <pre className="bg-black/50 p-3 rounded-sm text-[8px] text-white/40 break-all border border-white/5 leading-relaxed">
                {selectedNode.dna_preview}...
              </pre>
            </div>
          </div>
          
          <button 
            className="w-full mt-8 py-3 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 text-[9px] font-bold uppercase tracking-[0.3em] transition-all"
            onClick={() => alert(`已标记节点 #${selectedNode.id} 作为下一次创世的蓝本`)}
          >
            注入进化序列
          </button>
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTree;
