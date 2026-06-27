import type { EntityView, ParsedWorldBinary, WorldStats } from '../types/world';

const ENTITY_RECORD_BYTES = 40;
const LEGACY_ENTITY_RECORD_BYTES = 36;
const STATS_RECORD_BYTES = 12;

const emptyStats: WorldStats = {
  avgScore: 0,
  population: 0,
  avgGeneration: 0,
  entropy: 0,
};

export function parseWorldBinary(input: number[] | Uint8Array): ParsedWorldBinary {
  const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buffer.byteLength === 0) {
    return { entities: [], stats: emptyStats };
  }

  const recordBytes = resolveEntityRecordBytes(buffer.byteLength);
  const hasStatsTail = buffer.byteLength > STATS_RECORD_BYTES && (buffer.byteLength - STATS_RECORD_BYTES) % recordBytes === 0;
  const entityBytes = hasStatsTail ? buffer.byteLength - STATS_RECORD_BYTES : buffer.byteLength;

  if (entityBytes % recordBytes !== 0) {
    throw new Error(`Invalid world binary length: ${buffer.byteLength}`);
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const entities: EntityView[] = [];

  for (let offset = 0; offset < entityBytes; offset += recordBytes) {
    const hasCollaboration = recordBytes === ENTITY_RECORD_BYTES;
    entities.push({
      id: view.getUint32(offset, true),
      position: [
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
        view.getFloat32(offset + 12, true),
      ],
      ethics: {
        altruism: view.getFloat32(offset + 16, true),
        collaboration: hasCollaboration ? view.getFloat32(offset + 20, true) : 0.5,
      },
      score: view.getFloat32(offset + (hasCollaboration ? 24 : 20), true),
      energy: view.getFloat32(offset + (hasCollaboration ? 28 : 24), true),
      metabolic_toxin: view.getFloat32(offset + (hasCollaboration ? 32 : 28), true),
      generation: view.getUint32(offset + (hasCollaboration ? 36 : 32), true),
    });
  }

  if (!hasStatsTail) {
    return {
      entities,
      stats: entities.length > 0 ? calculateFallbackStats(entities) : emptyStats,
    };
  }

  const statsOffset = buffer.byteLength - STATS_RECORD_BYTES;
  return {
    entities,
    stats: {
      entropy: view.getFloat32(statsOffset, true),
      avgScore: view.getFloat32(statsOffset + 4, true),
      avgGeneration: view.getFloat32(statsOffset + 8, true),
      population: entities.length,
    },
  };
}

function resolveEntityRecordBytes(byteLength: number) {
  if (byteLength > STATS_RECORD_BYTES) {
    const entityBytes = byteLength - STATS_RECORD_BYTES;
    if (entityBytes >= 0 && entityBytes % ENTITY_RECORD_BYTES === 0) return ENTITY_RECORD_BYTES;
    if (entityBytes >= 0 && entityBytes % LEGACY_ENTITY_RECORD_BYTES === 0) return LEGACY_ENTITY_RECORD_BYTES;
  }

  if (byteLength % ENTITY_RECORD_BYTES === 0) return ENTITY_RECORD_BYTES;
  if (byteLength % LEGACY_ENTITY_RECORD_BYTES === 0) return LEGACY_ENTITY_RECORD_BYTES;
  return ENTITY_RECORD_BYTES;
}

export function calculateFallbackStats(entities: EntityView[]): WorldStats {
  if (entities.length === 0) return emptyStats;
  const totals = entities.reduce(
    (acc, entity) => {
      acc.score += entity.score;
      acc.generation += entity.generation;
      return acc;
    },
    { score: 0, generation: 0 },
  );

  return {
    avgScore: totals.score / entities.length,
    avgGeneration: totals.generation / entities.length,
    population: entities.length,
    entropy: 0,
  };
}
