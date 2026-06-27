import { Bloom, EffectComposer } from '@react-three/postprocessing';

interface ArenaPostEffectsProps {
  intensity: number;
  radius: number;
}

export default function ArenaPostEffects({ intensity, radius }: ArenaPostEffectsProps) {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom luminanceThreshold={1} mipmapBlur intensity={intensity} radius={radius} />
    </EffectComposer>
  );
}
