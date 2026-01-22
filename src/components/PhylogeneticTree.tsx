import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Node {
  id: number;
  position: [number, number, number];
  parentId: number | null;
  generation: number;
  fitness: number;
}

const EvolutionGalaxy = ({ nodes, onNodeClick }: { nodes: Node[], onNodeClick: (node: Node) => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const lines = useMemo(() => {
    const l: any[] = [];
    nodes.forEach(node => {
      if (node.parentId !== null) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          l.push([new THREE.Vector3(...parent.position), new THREE.Vector3(...node.position)]);
        }
      }
    });
    return l;
  }, [nodes]);

  return (
    <group ref={groupRef}>
      {/* 连线 */}
      {lines.map((points, i) => (
        <Line 
          key={`line-${i}`} 
          points={points} 
          color="#1e293b" 
          lineWidth={1} 
          transparent 
          opacity={0.3} 
        />
      ))}

      {/* 节点 */}
      {nodes.map((node) => {
        const isKeyframe = node.fitness > 80;
        const color = isKeyframe ? '#00f3ff' : (node.fitness > 50 ? '#ffffff' : '#64748b');
        const size = isKeyframe ? 0.3 : 0.1;

        return (
          <mesh 
            key={node.id} 
            position={node.position} 
            onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
          >
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color={color} />
            {isKeyframe && (
              <pointLight distance={2} intensity={2} color={color} />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

const PhylogeneticTree: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 生成模拟数据
  const nodes = useMemo(() => {
    const n: Node[] = [];
    n.push({ id: 0, position: [0, 0, 0], parentId: null, generation: 0, fitness: 10 });
    
    for (let i = 1; i < 100; i++) {
      const parentId = Math.floor(Math.random() * i);
      const parent = n[parentId];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 2 + 1;
      const yOffset = (Math.random() - 0.5) * 2;
      
      n.push({
        id: i,
        position: [
          parent.position[0] + Math.cos(angle) * dist,
          parent.position[1] + yOffset,
          parent.position[2] + Math.sin(angle) * dist
        ],
        parentId,
        generation: parent.generation + 1,
        fitness: parent.fitness + (Math.random() - 0.3) * 10
      });
    }
    return n;
  }, []);

  return (
    <div className="w-full h-full relative bg-[#050505]">
      <div className="absolute top-6 left-6 z-10">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Phylogenetic Map</h2>
        <p className="text-[10px] text-white/40 font-mono">Evolutionary Path Visualization</p>
      </div>

      <Canvas camera={{ position: [0, 10, 20], fov: 60 }}>
        <OrbitControls autoRotate autoRotateSpeed={0.5} />
        <ambientLight intensity={0.2} />
        <EvolutionGalaxy nodes={nodes} onNodeClick={setSelectedNode} />
      </Canvas>

      {selectedNode && (
        <div className="absolute top-20 right-6 w-64 glass-card p-6 border-l-2 border-l-neon-blue animate-in slide-in-from-right-4">
          <h3 className="text-neon-blue font-mono text-xs uppercase tracking-widest mb-4">Node Inspector</h3>
          <div className="space-y-2 text-xs font-mono text-white/60">
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="text-white">#{selectedNode.id}</span>
            </div>
            <div className="flex justify-between">
              <span>GEN:</span>
              <span className="text-white">{selectedNode.generation}</span>
            </div>
            <div className="flex justify-between">
              <span>FITNESS:</span>
              <span className="text-white">{selectedNode.fitness.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>PARENT:</span>
              <span className="text-white">#{selectedNode.parentId}</span>
            </div>
          </div>
          <button className="w-full mt-6 py-2 border border-white/20 hover:bg-white/10 text-white text-[10px] uppercase tracking-widest transition-colors">
            Replay Evolution
          </button>
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTree;
