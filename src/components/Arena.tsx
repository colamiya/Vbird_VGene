import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { EntityFateLine, EntityView, InterventionOutcome, InterventionTrace, LiveInteractionNetwork, PlayerInterventionKind, VisualFidelity, WorldEvent } from '../types/world';
import type { ActiveMoment } from '../utils/activeMoment';
import type { DirectorCue, DirectorCueTone } from '../utils/directorCues';
import type { ExperienceDirectorCue, ExperienceTone } from '../utils/experienceDirector';

const ArenaPostEffects = React.lazy(() => import('./ArenaPostEffects'));

type Entity = EntityView;

interface ArenaProps {
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  onInterferenceError?: (message: string) => void;
  canInterfere?: boolean;
  activeIntervention?: PlayerInterventionKind;
  activeMoment?: ActiveMoment | null;
  directorCue?: DirectorCue | null;
  experienceCue?: ExperienceDirectorCue | null;
  interactionNetwork?: LiveInteractionNetwork | null;
  interventionTraces?: InterventionTrace[];
  fateLine?: EntityFateLine | null;
  latestWorldEvent?: WorldEvent | null;
  onWorldIntervention?: (point: [number, number, number], entity?: Entity) => InterventionOutcome | void | Promise<InterventionOutcome | void>;
  isLeaping?: boolean;
  visualFidelity?: VisualFidelity;
}

const directorToneColor: Record<DirectorCueTone, string> = {
  calm: '#ffffff',
  growth: '#6ee7b7',
  warning: '#fde047',
  danger: '#f87171',
  ascend: '#bd00ff',
};

const interactionColor: Record<LiveInteractionNetwork['edges'][number]['kind'], string> = {
  MUTUAL_AID: '#6ee7b7',
  RESOURCE_TRANSFER: '#00eaff',
  PREDATION: '#ff4d4d',
  TOXIC_CONFLICT: '#facc15',
};

const traceColor: Record<PlayerInterventionKind, string> = {
  BLESS: '#6ee7b7',
  POISON: '#fb7185',
  QUARANTINE: '#38bdf8',
  EXILE: '#facc15',
  PIN_OBSERVE: '#ffffff',
};

const eventSeverityColor: Record<WorldEvent['severity'], string> = {
  info: '#ffffff',
  good: '#6ee7b7',
  warning: '#facc15',
  danger: '#ff4d4d',
};

const activeMomentColor: Record<WorldEvent['severity'], string> = {
  info: '#00eaff',
  good: '#6ee7b7',
  warning: '#facc15',
  danger: '#ff4d4d',
};

const fateLineColor: Record<WorldEvent['severity'], string> = {
  info: '#00eaff',
  good: '#6ee7b7',
  warning: '#facc15',
  danger: '#fb7185',
};

const interventionLabel: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选',
};

type ArenaClickFeedbackKind = 'observe' | 'armed' | 'success' | 'miss';

const clickFeedbackColor: Record<ArenaClickFeedbackKind, string> = {
  observe: '#8aa0aa',
  armed: '#00eaff',
  success: '#6ee7b7',
  miss: '#fb7185',
};

const experienceToneColor: Record<ExperienceTone, string> = {
  calm: '#8aa0aa',
  momentum: '#00eaff',
  danger: '#ff4d4d',
  triumph: '#6ee7b7',
  void: '#facc15',
};

const arenaInteractionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

type SceneLinePoint = [number, number, number] | THREE.Vector3;

function seededUnit(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function toVector3(point: SceneLinePoint) {
  return point instanceof THREE.Vector3
    ? point
    : new THREE.Vector3(point[0], point[1], point[2]);
}

const SceneLine: React.FC<{
  points: SceneLinePoint[];
  color: string;
  lineWidth?: number;
  transparent?: boolean;
  opacity?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
}> = ({
  points,
  color,
  lineWidth = 1,
  transparent = true,
  opacity = 1,
  dashed = false,
  dashSize = 0.12,
  gapSize = 0.08,
}) => {
  const geometry = useMemo(() => {
    const item = new THREE.BufferGeometry().setFromPoints(points.map(toVector3));
    return item;
  }, [points]);
  const material = useMemo(() => {
    const options = {
      color,
      linewidth: lineWidth,
      transparent,
      opacity,
      depthWrite: false,
      toneMapped: false,
    };
    return dashed
      ? new THREE.LineDashedMaterial({ ...options, dashSize, gapSize })
      : new THREE.LineBasicMaterial(options);
  }, [color, dashSize, dashed, gapSize, lineWidth, opacity, transparent]);
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

  useEffect(() => {
    if (dashed) {
      lineObject.computeLineDistances();
    }
  }, [dashed, lineObject]);

  return (
    <primitive object={lineObject} />
  );
};

const SceneOrbitControls: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 2;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
};

const LightweightStarField: React.FC<{
  count: number;
  atmosphereIntensity: number;
}> = ({ count, atmosphereIntensity }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const random = seededUnit(0x765f_4745 ^ count);
    const positions = new Float32Array(count * 3);
    const radius = 130;
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const depth = 38 + random() * radius;
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
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.68,
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
    pointsRef.current.rotation.y = state.clock.elapsedTime * (0.002 + atmosphereIntensity * 0.003);
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.015;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} raycast={() => undefined} />;
};

const arenaVisualProfiles: Record<VisualFidelity, {
  dpr: [number, number];
  antialias: boolean;
  starMultiplier: number;
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomRadius: number;
  atmosphere: number;
}> = {
  Low: {
    dpr: [1, 1],
    antialias: false,
    starMultiplier: 0.28,
    bloomEnabled: false,
    bloomIntensity: 0,
    bloomRadius: 0,
    atmosphere: 0.72,
  },
  Medium: {
    dpr: [1, 1.15],
    antialias: false,
    starMultiplier: 0.55,
    bloomEnabled: true,
    bloomIntensity: 0.62,
    bloomRadius: 0.72,
    atmosphere: 0.88,
  },
  High: {
    dpr: [1, 1.5],
    antialias: false,
    starMultiplier: 1,
    bloomEnabled: true,
    bloomIntensity: 1,
    bloomRadius: 1,
    atmosphere: 1,
  },
  Ultra: {
    dpr: [1, 2],
    antialias: true,
    starMultiplier: 1.12,
    bloomEnabled: true,
    bloomIntensity: 1.18,
    bloomRadius: 1.08,
    atmosphere: 1.08,
  },
};

const ArenaClickFeedback = ({ position, kind }: { position: THREE.Vector3; kind: ArenaClickFeedbackKind }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startedAtRef = useRef<number | null>(null);
  const color = clickFeedbackColor[kind];

  useFrame((state) => {
    if (startedAtRef.current === null) {
      startedAtRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startedAtRef.current;
    const progress = Math.min(1, elapsed / (kind === 'miss' ? 0.95 : 1.15));
    if (meshRef.current) {
      const base = kind === 'success' ? 1.4 : kind === 'miss' ? 0.85 : 1;
      const spread = kind === 'success' ? 10 : kind === 'armed' ? 7 : 5;
      meshRef.current.scale.setScalar(base + progress * spread);
      meshRef.current.visible = progress < 1;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(Math.max(0.12, 1 - progress * 0.55));
      coreRef.current.visible = progress < 0.7;
    }
    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, 1 - progress);
    }
    if (coreMaterialRef.current) {
      coreMaterialRef.current.opacity = Math.max(0, 0.72 - progress);
    }
  });

  return (
    <group position={position} raycast={() => undefined}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={kind === 'miss' ? [0.16, 0.22, 40] : [0.1, 0.2, 40]} />
        <meshBasicMaterial ref={materialRef} color={color} transparent opacity={1} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[kind === 'success' ? 0.08 : 0.05, 12, 12]} />
        <meshBasicMaterial ref={coreMaterialRef} color={color} transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const InteractionOverlay: React.FC<{
  entities: Entity[];
  network?: LiveInteractionNetwork | null;
}> = ({ entities, network }) => {
  const visibleEdges = useMemo(() => {
    const maxEdges = entities.length > 1800 ? 4 : 6;
    return network?.edges.slice(0, maxEdges) ?? [];
  }, [entities.length, network]);
  const entitiesById = useMemo(() => {
    const visibleIds = new Set<number>();
    visibleEdges.forEach((edge) => {
      visibleIds.add(edge.sourceId);
      visibleIds.add(edge.targetId);
    });
    const byId = new Map<number, Entity>();
    entities.forEach((entity) => {
      if (visibleIds.has(entity.id)) byId.set(entity.id, entity);
    });
    return byId;
  }, [entities, visibleEdges]);
  if (visibleEdges.length === 0) return null;

  return (
    <group>
      {visibleEdges.map((edge) => {
        const source = entitiesById.get(edge.sourceId);
        const target = entitiesById.get(edge.targetId);
        if (!source || !target) return null;
        const observed = edge.source === 'OBSERVED';
        const opacity = Math.max(observed ? 0.42 : 0.22, Math.min(observed ? 0.96 : 0.72, edge.strength / 100));
        const targetRadius = edge.kind === 'PREDATION' || edge.kind === 'TOXIC_CONFLICT' ? 0.34 : 0.26;
        const sourceRadius = edge.kind === 'MUTUAL_AID' || edge.kind === 'RESOURCE_TRANSFER' ? 0.22 : 0.16;
        return (
          <group key={`${edge.kind}-${edge.sourceId}-${edge.targetId}`}>
            <SceneLine
              points={[source.position, target.position]}
              color={interactionColor[edge.kind]}
              lineWidth={observed ? 2.3 : edge.kind === 'PREDATION' || edge.kind === 'TOXIC_CONFLICT' ? 1.8 : 1.2}
              transparent
              opacity={opacity}
              dashed={!observed && (edge.kind === 'PREDATION' || edge.kind === 'TOXIC_CONFLICT')}
              dashSize={0.14}
              gapSize={0.1}
            />
            {observed && (
              <SceneLine
                points={[source.position, target.position]}
                color="#ffffff"
                lineWidth={0.8}
                transparent
                opacity={0.18}
              />
            )}
            <mesh position={source.position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
              <ringGeometry args={[sourceRadius, sourceRadius + 0.035, 32]} />
              <meshBasicMaterial
                color={interactionColor[edge.kind]}
                transparent
                opacity={Math.max(0.16, opacity * 0.45)}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh position={target.position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
              <ringGeometry args={[targetRadius, targetRadius + 0.045, 40]} />
              <meshBasicMaterial
                color={interactionColor[edge.kind]}
                transparent
                opacity={Math.max(0.22, opacity * 0.72)}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {(edge.kind === 'PREDATION' || edge.kind === 'TOXIC_CONFLICT') && (
              <mesh position={target.position} raycast={() => undefined}>
                <sphereGeometry args={[0.045, 10, 10]} />
                <meshBasicMaterial
                  color={interactionColor[edge.kind]}
                  transparent
                  opacity={Math.max(0.3, opacity)}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

const InterventionTraceOverlay: React.FC<{
  traces?: InterventionTrace[];
}> = ({ traces = [] }) => {
  const activeTraces = traces
    .filter((trace) => trace.metrics.affected > 0)
    .slice(-5);
  if (activeTraces.length === 0) return null;

  return (
    <group>
      {activeTraces.map((trace) => {
        const age = Math.max(0, Math.min(1, (Date.now() - trace.startedAt) / 90_000));
        const opacity = Math.max(0.12, 0.62 - age * 0.42);
        const color = traceColor[trace.kind];
        const trackedSnapshots = trace.latest.slice(0, 6);
        return (
          <group key={trace.id}>
            <group position={trace.point}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
                <ringGeometry args={[1.2, 1.28, 64]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
              </mesh>
              <mesh raycast={() => undefined}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshBasicMaterial color={color} transparent opacity={Math.min(0.92, opacity + 0.2)} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
            {trackedSnapshots.map((snapshot) => {
              const snapshotColor = snapshot.alive ? color : '#64748b';
              const snapshotOpacity = snapshot.alive ? opacity * 0.72 : opacity * 0.36;
              return (
                <group key={`${trace.id}-${snapshot.entityId}`}>
                  <SceneLine
                    points={[trace.point, snapshot.position]}
                    color={snapshotColor}
                    lineWidth={0.8}
                    transparent
                    opacity={Math.max(0.08, snapshotOpacity * 0.34)}
                    dashed
                    dashSize={0.08}
                    gapSize={0.12}
                  />
                  <mesh position={snapshot.position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
                    <ringGeometry args={[0.2, 0.235, 32]} />
                    <meshBasicMaterial
                      color={snapshotColor}
                      transparent
                      opacity={Math.max(0.1, snapshotOpacity)}
                      depthWrite={false}
                      toneMapped={false}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

const FateLineNode: React.FC<{
  point: [number, number, number];
  color: string;
  progress: number;
}> = ({ point, color, progress }) => (
  <group position={point} raycast={() => undefined}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.16 + progress * 0.08, 0.19 + progress * 0.08, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2 + progress * 0.32}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  </group>
);

const FateLineHeadMarker: React.FC<{
  point: [number, number, number];
  color: string;
}> = ({ point, color }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const wave = (Math.sin(state.clock.elapsedTime * 4.2) + 1) / 2;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + wave * 0.16);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + wave * 0.18);
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.62 + wave * 0.22;
    }
  });

  return (
    <group position={point} raycast={() => undefined}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.41, 36]} />
        <meshBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.78}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.88} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const FateLineOverlay: React.FC<{
  fateLine?: EntityFateLine | null;
  entities: Entity[];
}> = ({ fateLine = null, entities }) => {
  const liveEntity = useMemo(
    () => fateLine ? entities.find((entity) => entity.id === fateLine.entityId) ?? null : null,
    [entities, fateLine],
  );
  const maxPoints = entities.length > 3000 ? 10 : entities.length > 1800 ? 14 : 18;
  const points = useMemo(() => {
    if (!fateLine) return [];
    const snapshotPoints = fateLine.snapshots
      .filter((snapshot) => snapshot.position.every(Number.isFinite))
      .map((snapshot) => snapshot.position);
    if (liveEntity) {
      const last = snapshotPoints[snapshotPoints.length - 1];
      const live = liveEntity.position;
      if (!last || last.some((value, index) => Math.abs(value - live[index]) > 0.01)) {
        snapshotPoints.push(live);
      }
    }
    return snapshotPoints.slice(-maxPoints);
  }, [fateLine, liveEntity, maxPoints]);

  if (!fateLine || points.length < 2) return null;

  const color = fateLineColor[fateLine.tone];
  const latest = fateLine.snapshots[fateLine.snapshots.length - 1];
  const head = points[points.length - 1];
  const dense = entities.length > 1800;

  return (
    <group raycast={() => undefined}>
      <SceneLine
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.78}
        dashed={!dense && (fateLine.tone === 'warning' || fateLine.tone === 'danger')}
        dashSize={0.22}
        gapSize={0.12}
      />
      {points.slice(0, -1).map((point, index) => {
        const progress = points.length <= 1 ? 1 : index / (points.length - 1);
        return (
          <FateLineNode
            key={`${fateLine.entityId}-${index}`}
            point={point}
            color={color}
            progress={progress}
          />
        );
      })}
      {head && <FateLineHeadMarker point={head} color={color} />}
      {latest && !latest.alive && (
        <mesh position={points[points.length - 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color="#fb7185" transparent opacity={0.68} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

const EventBeaconPulse: React.FC<{
  event: WorldEvent;
  entity?: Entity | null;
  global?: boolean;
}> = ({ event, entity = null, global = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const outerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!groupRef.current) return;

    const age = Math.max(0, Date.now() - event.timestamp);
    const progress = Math.min(1, age / 12_000);
    const pulse = 1 + Math.sin(Date.now() / 180) * 0.08;
    const baseOpacity = Math.max(0, 1 - progress);

    if (entity) {
      targetPosition.set(entity.position[0], entity.position[1], entity.position[2]);
    } else {
      targetPosition.set(0, 0, 0);
    }

    groupRef.current.position.lerp(targetPosition, 0.28);
    groupRef.current.scale.setScalar((global ? 8.5 : 1.8) * pulse * (1 + progress * 0.35));
    groupRef.current.visible = progress < 1;

    if (outerMaterialRef.current) outerMaterialRef.current.opacity = global ? baseOpacity * 0.28 : baseOpacity * 0.72;
    if (innerMaterialRef.current) innerMaterialRef.current.opacity = global ? baseOpacity * 0.08 : baseOpacity * 0.24;
  });

  const color = eventSeverityColor[event.severity];

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
      <mesh>
        <ringGeometry args={[0.8, 0.94, 80]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color={color}
          transparent
          opacity={0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[0.72, 80]} />
        <meshBasicMaterial
          ref={innerMaterialRef}
          color={color}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

function selectEventBeaconEntities(event: WorldEvent, entities: Entity[]) {
  if (typeof event.entityId === 'number') {
    const entity = entities.find((item) => item.id === event.entityId);
    return entity ? [entity] : [];
  }

  const sorted = entities.slice();
  if (event.kind === 'TOXIN_CRISIS') {
    return sorted.sort((a, b) => b.metabolic_toxin - a.metabolic_toxin).slice(0, 8);
  }
  if (event.kind === 'ENERGY_FAMINE' || event.kind === 'MASS_EXTINCTION') {
    return sorted.sort((a, b) => a.energy - b.energy).slice(0, 8);
  }
  if (event.kind === 'COOPERATION_CLUSTER') {
    return sorted
      .sort((a, b) => (b.ethics.altruism + b.ethics.collaboration) - (a.ethics.altruism + a.ethics.collaboration))
      .slice(0, 8);
  }
  if (event.kind === 'RESOURCE_BLOOM') {
    return sorted.sort((a, b) => b.energy - a.energy).slice(0, 8);
  }
  if (event.kind === 'GOLDEN_AGE' || event.kind === 'FIRST_APEX' || event.kind === 'HALL_OF_FAME') {
    return sorted.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  if (event.kind === 'GENERATION_LEAP' || event.kind === 'LINEAGE_FOUNDER') {
    return sorted.sort((a, b) => b.generation - a.generation || b.score - a.score).slice(0, 5);
  }
  return [];
}

const WorldEventBeacon: React.FC<{
  event?: WorldEvent | null;
  entities: Entity[];
}> = ({ event = null, entities }) => {
  const beaconEntities = useMemo(
    () => event ? selectEventBeaconEntities(event, entities) : [],
    [entities, event],
  );

  if (!event || event.kind === 'RUN_STARTED') return null;

  if (beaconEntities.length === 0) {
    return <EventBeaconPulse key={event.id} event={event} global />;
  }

  return (
    <group key={event.id}>
      {beaconEntities.map((entity) => (
        <EventBeaconPulse key={`${event.id}-${entity.id}`} event={event} entity={entity} />
      ))}
    </group>
  );
};

const ArenaAtmosphere: React.FC<{
  cue?: ExperienceDirectorCue | null;
}> = ({ cue }) => {
  const groupRef = useRef<THREE.Group>(null);
  const tone = cue?.tone ?? 'calm';
  const color = experienceToneColor[tone];
  const intensity = cue?.intensity ?? 0.18;

  useFrame((state) => {
    if (!groupRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (0.8 + intensity * 2.4)) * 0.018;
    groupRef.current.scale.setScalar(pulse);
    groupRef.current.rotation.z += 0.0008 + intensity * 0.0018;
  });

  return (
    <group ref={groupRef} position={[0, 0, -0.2]}>
      {[5.5, 9.5, 13.5].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
          <ringGeometry args={[radius, radius + 0.035, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={Math.max(0.035, 0.16 - index * 0.035 + intensity * 0.08)}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
        <circleGeometry args={[16, 128]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.018 + intensity * 0.035}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const EntitySwarm: React.FC<{
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  onInterferenceError?: (message: string) => void;
  canInterfere?: boolean;
  activeMoment?: ActiveMoment | null;
  directorCue?: DirectorCue | null;
  interactionNetwork?: LiveInteractionNetwork | null;
  interventionTraces?: InterventionTrace[];
  fateLine?: EntityFateLine | null;
  latestWorldEvent?: WorldEvent | null;
  onWorldIntervention?: (point: [number, number, number], entity?: Entity) => InterventionOutcome | void | Promise<InterventionOutcome | void>;
  isLeaping?: boolean;
}> = ({ entities, onEntityClick, onInterferenceError, canInterfere = false, activeMoment = null, directorCue = null, interactionNetwork = null, interventionTraces = [], fateLine = null, latestWorldEvent = null, onWorldIntervention, isLeaping }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [feedbacks, setFeedbacks] = useState<{ id: number; pos: THREE.Vector3; kind: ArenaClickFeedbackKind }[]>([]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const lowAltruismColor = useMemo(() => new THREE.Color('#ff4d4d'), []);
  const highAltruismColor = useMemo(() => new THREE.Color('#00eaff'), []);
  const dangerColor = useMemo(() => new THREE.Color('#ff3344'), []);
  const toxinColor = useMemo(() => new THREE.Color('#facc15'), []);
  const apexColor = useMemo(() => new THREE.Color('#ffffff'), []);
  const instanceCapacity = useMemo(() => getInstanceCapacity(entities.length), [entities.length]);
  const visualDensity = Math.min(1, entities.length / 2400);
  const directorTarget = useMemo(
    () => typeof directorCue?.entityId === 'number'
      ? entities.find((entity) => entity.id === directorCue.entityId) ?? null
      : null,
    [directorCue?.entityId, entities],
  );
  const activeMomentTarget = useMemo(
    () => typeof activeMoment?.target?.entityId === 'number'
      ? entities.find((entity) => entity.id === activeMoment.target?.entityId) ?? null
      : null,
    [activeMoment?.target?.entityId, entities],
  );

  const addFeedback = (pos: THREE.Vector3, kind: ArenaClickFeedbackKind) => {
    const feedbackId = Date.now() + Math.floor(Math.random() * 1000);
    setFeedbacks((prev) => [...prev, { id: feedbackId, pos: pos.clone(), kind }].slice(-8));
    window.setTimeout(() => {
      setFeedbacks((prev) => prev.filter((feedback) => feedback.id !== feedbackId));
    }, kind === 'miss' ? 1000 : 1300);
  };

  const findNearestRayEntity = (event: ThreeEvent<MouseEvent>) => {
    let nearestEntity: Entity | undefined;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;
    entities.forEach((entity) => {
      const point = new THREE.Vector3(entity.position[0], entity.position[1], entity.position[2]);
      const distanceSq = event.ray.distanceSqToPoint(point);
      const visualRadius = entity.energy / 100 * 1.5 + 0.5;
      const threshold = Math.max(0.7, Math.min(1.8, visualRadius * 0.72));
      const thresholdSq = threshold * threshold;
      if (distanceSq > thresholdSq) return;
      if (distanceSq < nearestDistanceSq) {
        nearestEntity = entity;
        nearestDistanceSq = distanceSq;
      }
    });
    return nearestEntity;
  };

  const resolveClickTarget = (event: ThreeEvent<MouseEvent>, selectedEntity?: Entity) => {
    const targetEntity = selectedEntity ?? findNearestRayEntity(event);
    if (targetEntity) {
      return {
        entity: targetEntity,
        position: new THREE.Vector3(targetEntity.position[0], targetEntity.position[1], targetEntity.position[2]),
      };
    }
    const projected = new THREE.Vector3();
    const hit = event.ray.intersectPlane(arenaInteractionPlane, projected);
    return {
      entity: undefined,
      position: hit ? projected : event.point.clone(),
    };
  };

  const handleClick = async (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (typeof e.delta === 'number' && e.delta > 8) return;

    const selectedEntity = e.instanceId !== undefined ? entities[e.instanceId] : undefined;
    const clickTarget = resolveClickTarget(e, selectedEntity);
    const clickPos = clickTarget.position;
    const targetEntity = clickTarget.entity;

    if (canInterfere && onWorldIntervention) {
      addFeedback(clickPos, 'armed');
      try {
        const outcome = await onWorldIntervention([clickPos.x, clickPos.y, clickPos.z], targetEntity);
        addFeedback(clickPos, outcome && outcome.affected > 0 ? 'success' : 'miss');
        return;
      } catch (err) {
        console.error("Interference failed:", err);
        addFeedback(clickPos, 'miss');
        onInterferenceError?.(`观察者干预失败：${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }

    addFeedback(clickPos, 'observe');

    if (onEntityClick) {
      if (targetEntity) {
        onEntityClick(targetEntity);
      }
    }
  };

  // 🔒 优化后的状态追踪，减少内存压力
  const lastStateRef = useRef<Map<number, {
    index: number;
    energy: number;
    score: number;
    toxin: number;
    altruism: number;
    collaboration: number;
    generation: number;
    x: number;
    y: number;
    z: number;
  }>>(new Map());

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.count = entities.length;
    if (entities.length === 0) return;

    // 🔒 降频：每 3 帧更新一次 (20 FPS 对人眼足够)
    const frameCount = Math.floor(state.clock.elapsedTime * 60);
    if (frameCount % 3 !== 0 && !isLeaping) return;

    // 🔒 识别变化的实体索引 (脏检查)
    const changedIndices: number[] = [];
    entities.forEach((e, i) => {
      const prev = lastStateRef.current.get(e.id);
      if (
        !prev ||
        prev.index !== i ||
        e.energy !== prev.energy ||
        e.score !== prev.score ||
        e.metabolic_toxin !== prev.toxin ||
        e.ethics.altruism !== prev.altruism ||
        e.ethics.collaboration !== prev.collaboration ||
        e.generation !== prev.generation ||
        e.position[0] !== prev.x ||
        e.position[1] !== prev.y ||
        e.position[2] !== prev.z ||
        isLeaping
      ) {
        changedIndices.push(i);
        // 更新记录
        lastStateRef.current.set(e.id, {
          index: i,
          energy: e.energy,
          score: e.score,
          toxin: e.metabolic_toxin,
          altruism: e.ethics.altruism,
          collaboration: e.ethics.collaboration,
          generation: e.generation,
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
      tempColor.copy(lowAltruismColor).lerp(highAltruismColor, entity.ethics.altruism);

      if (isLeaping) {
        tempColor.lerp(apexColor, 0.5);
      } else if (entity.energy <= 18 || entity.metabolic_toxin >= 0.85) {
        tempColor.copy(dangerColor);
      } else if (entity.metabolic_toxin >= 0.62) {
        tempColor.lerp(toxinColor, 0.72);
      } else if (entity.score >= 80) {
        tempColor.lerp(apexColor, 0.55);
      } else if (entity.score > 50) {
        tempColor.multiplyScalar(1.5);
      }

      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <group onClick={handleClick}>
        <mesh position={[0, 0, -40]}>
          <circleGeometry args={[64, 96]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
        {feedbacks.map((feedback) => (
          <ArenaClickFeedback key={feedback.id} position={feedback.pos} kind={feedback.kind} />
        ))}
        <instancedMesh
          key={instanceCapacity}
          ref={meshRef}
          args={[undefined, undefined, instanceCapacity]}
          visible={entities.length > 0}
        >
          <icosahedronGeometry args={[0.12, 1]} />
          <meshStandardMaterial
            toneMapped={false}
            emissive="#ffffff"
            emissiveIntensity={Math.max(0.22, 0.5 - visualDensity * 0.24)}
          />
        </instancedMesh>
      </group>
      <InteractionOverlay entities={entities} network={interactionNetwork} />
      <InterventionTraceOverlay traces={interventionTraces} />
      <FateLineOverlay fateLine={fateLine} entities={entities} />
      <WorldEventBeacon event={latestWorldEvent} entities={entities} />
      {activeMomentTarget && (
        <ActiveMomentBeacon
          entity={activeMomentTarget}
          tone={activeMoment?.tone ?? 'info'}
        />
      )}
      {directorTarget && directorTarget.id !== activeMomentTarget?.id && (
        <DirectorTargetBeacon
          entity={directorTarget}
          tone={directorCue?.tone ?? 'calm'}
        />
      )}
    </>
  );
};

function getInstanceCapacity(count: number) {
  if (count <= 0) return 1;
  let capacity = 64;
  while (capacity < count) capacity *= 2;
  return capacity;
}

function selectTopEntities(entities: Entity[], limit = 12) {
  const selected: Entity[] = [];
  entities.forEach((entity) => {
    const insertAt = selected.findIndex((candidate) => entity.score > candidate.score);
    if (insertAt === -1) {
      if (selected.length < limit) selected.push(entity);
      return;
    }
    selected.splice(insertAt, 0, entity);
    if (selected.length > limit) selected.pop();
  });
  return selected;
}

const DirectorTargetBeacon: React.FC<{
  entity: Entity;
  tone: DirectorCueTone;
}> = ({ entity, tone }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const color = directorToneColor[tone];

  useFrame((state) => {
    if (!groupRef.current) return;
    targetPosition.set(entity.position[0], entity.position[1], entity.position[2]);
    groupRef.current.position.lerp(targetPosition, 0.36);
    const pulse = Math.sin(state.clock.elapsedTime * 4.2) * 0.12;
    const baseScale = Math.max(1.2, entity.energy / 70 + 1.1);
    groupRef.current.scale.setScalar(baseScale + pulse);
    groupRef.current.rotation.y += 0.012;
    groupRef.current.rotation.z -= 0.008;
  });

  return (
    <group ref={groupRef}>
      <mesh raycast={() => undefined}>
        <ringGeometry args={[0.34, 0.39, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => undefined}>
        <ringGeometry args={[0.43, 0.47, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} raycast={() => undefined}>
        <ringGeometry args={[0.52, 0.56, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh raycast={() => undefined}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const ActiveMomentBeacon: React.FC<{
  entity: Entity;
  tone: WorldEvent['severity'];
}> = ({ entity, tone }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const color = activeMomentColor[tone];

  useFrame((state) => {
    if (!groupRef.current) return;
    targetPosition.set(entity.position[0], entity.position[1], entity.position[2]);
    groupRef.current.position.lerp(targetPosition, 0.42);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5.8) * 0.1;
    const baseScale = Math.max(1.65, entity.score / 62 + entity.energy / 140);
    groupRef.current.scale.setScalar(baseScale * pulse);
    groupRef.current.rotation.z += 0.018;
  });

  return (
    <group ref={groupRef} raycast={() => undefined}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.54, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.88} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[0.68, 0.72, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.38} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Arena: React.FC<ArenaProps> = ({
  entities,
  onEntityClick,
  onInterferenceError,
  canInterfere,
  activeIntervention,
  activeMoment = null,
  directorCue = null,
  experienceCue = null,
  interactionNetwork = null,
  interventionTraces = [],
  fateLine = null,
  latestWorldEvent = null,
  onWorldIntervention,
  isLeaping,
  visualFidelity = 'High',
}) => {
  const keyboardEntities = useMemo(
    () => selectTopEntities(entities),
    [entities],
  );
  const atmosphereColor = experienceToneColor[experienceCue?.tone ?? 'calm'];
  const atmosphereIntensity = experienceCue?.intensity ?? 0.18;
  const visualDensity = Math.min(1, entities.length / 2400);
  const visualProfile = arenaVisualProfiles[visualFidelity] ?? arenaVisualProfiles.High;
  const baseStarCount = entities.length > 2200 ? 1800 : entities.length > 1200 ? 3200 : 7000;
  const starCount = Math.max(400, Math.round(baseStarCount * visualProfile.starMultiplier));
  const bloomIntensity = Math.max(0.34, 1.2 - visualDensity * 0.58) * visualProfile.bloomIntensity;
  const bloomRadius = Math.max(0.18, 0.4 - visualDensity * 0.12) * visualProfile.bloomRadius;

  return (
    <div
      className="absolute inset-0 z-0 h-full w-full bg-black"
      title={canInterfere ? `当前干预: ${activeIntervention ?? 'BLESS'}` : undefined}
    >
      <Canvas
        dpr={visualProfile.dpr}
        gl={{ antialias: visualProfile.antialias, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 20], fov: 50, near: 0.1, far: 1000 }}
      >
        <SceneOrbitControls />
        
        <ambientLight intensity={(0.42 + atmosphereIntensity * 0.16) * visualProfile.atmosphere} />
        <pointLight position={[10, 10, 10]} intensity={(1.7 + atmosphereIntensity * 1.2) * visualProfile.atmosphere} color={atmosphereColor} />
        <pointLight position={[-10, -10, -10]} intensity={(1.5 + atmosphereIntensity * 0.8) * visualProfile.atmosphere} color="#bd00ff" />
        
        <LightweightStarField count={starCount} atmosphereIntensity={atmosphereIntensity} />
        <ArenaAtmosphere cue={experienceCue} />
        
        <EntitySwarm
          entities={entities}
          onEntityClick={onEntityClick}
          onInterferenceError={onInterferenceError}
          canInterfere={canInterfere}
          activeMoment={activeMoment}
          directorCue={directorCue}
          interactionNetwork={interactionNetwork}
          interventionTraces={interventionTraces}
          fateLine={fateLine}
          latestWorldEvent={latestWorldEvent}
          onWorldIntervention={onWorldIntervention}
          isLeaping={isLeaping}
        />

        {visualProfile.bloomEnabled && (
          <React.Suspense fallback={null}>
            <ArenaPostEffects intensity={bloomIntensity} radius={bloomRadius} />
          </React.Suspense>
        )}
      </Canvas>
      <div className="pointer-events-none absolute left-1/2 top-14 z-30 hidden max-w-[min(46rem,calc(100vw-56rem))] -translate-x-1/2 flex-wrap items-center justify-center gap-2 border border-white/10 bg-black/70 px-3 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-white/45 backdrop-blur-md 2xl:flex">
        <span className={canInterfere ? 'text-neon-blue' : 'text-white/45'}>
          {canInterfere ? `已武装 ${interventionLabel[activeIntervention ?? 'BLESS']}` : `观察模式 ${interventionLabel[activeIntervention ?? 'BLESS']}`}
        </span>
        {activeMoment && (
          <>
            <span className="h-3 w-px bg-white/10" />
            <span className="max-w-[18rem] truncate text-white/70">
              焦点 {activeMoment.title}
            </span>
          </>
        )}
        <span className="h-3 w-px bg-white/10" />
        <span><b className="text-emerald-300">绿</b>互助</span>
        <span><b className="text-cyan-300">青</b>转移</span>
        <span><b className="text-red-300">红</b>掠食</span>
        <span><b className="text-yellow-300">黄</b>毒压</span>
        <span><b className="text-rose-300">玫</b>投毒手痕</span>
        <span><b className="text-white">白</b>钉选</span>
        <span><b className="text-neon-blue">线</b>命运</span>
        <span>实线=后端碰撞</span>
        <span>虚线=态势预测</span>
        <span className="h-3 w-px bg-white/10" />
        <span>1-5 干预</span>
        <span>Space 暂停</span>
        <span>F 标记</span>
        <span>Esc 解除</span>
      </div>
      {onEntityClick && keyboardEntities.length > 0 && (
        <div
          role="group"
          aria-label="实体键盘选择"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-16 focus-within:z-40 focus-within:flex focus-within:max-w-[min(28rem,calc(100vw-2rem))] focus-within:flex-wrap focus-within:gap-2 focus-within:bg-black/80 focus-within:p-3 focus-within:backdrop-blur-md"
        >
          {keyboardEntities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={() => onEntityClick(entity)}
              className="interactive-focus rounded-sm border border-white/10 px-3 py-2 text-[9px] font-mono text-white/60 hover:border-neon-blue/40 hover:text-neon-blue"
            >
              #{entity.id} / {entity.score.toFixed(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Arena;
