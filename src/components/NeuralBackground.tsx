import { useEffect, useRef } from 'react';

interface Particle {
  angle: number;
  radius: number;
  height: number;
  speed: number;
  hue: number;
  size: number;
}

const PARTICLE_COUNT = 180;
const TWO_PI = Math.PI * 2;

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createParticles() {
  const random = seededRandom(0x5647454e);
  return Array.from({ length: PARTICLE_COUNT }, (_, index): Particle => {
    const t = index / PARTICLE_COUNT;
    return {
      angle: t * 18 + random() * 0.75,
      radius: 0.08 + Math.sqrt(t) * 0.45 + random() * 0.08,
      height: random(),
      speed: 0.12 + random() * 0.22,
      hue: 176 + random() * 32,
      size: 0.7 + random() * 1.8,
    };
  });
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  particles: Particle[],
  time: number,
) {
  context.clearRect(0, 0, width, height);

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const scale = Math.min(width, height);

  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, scale * 0.72);
  gradient.addColorStop(0, 'rgba(0, 230, 255, 0.10)');
  gradient.addColorStop(0.42, 'rgba(0, 80, 110, 0.055)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.sin(time * 0.00008) * 0.05);

  for (const particle of particles) {
    const phase = particle.angle + time * 0.00012 * particle.speed;
    const yWave = Math.sin(time * 0.0002 * particle.speed + particle.height * TWO_PI);
    const x = Math.cos(phase) * particle.radius * scale;
    const y = (particle.height - 0.5) * height * 1.18 + yWave * 12;
    const z = Math.sin(phase) * 0.5 + 0.5;
    const alpha = 0.16 + z * 0.34;
    const size = particle.size * (0.75 + z * 1.8);

    context.beginPath();
    context.fillStyle = `hsla(${particle.hue}, 96%, ${58 + z * 16}%, ${alpha})`;
    context.arc(x, y, size, 0, TWO_PI);
    context.fill();
  }

  context.strokeStyle = 'rgba(34, 211, 238, 0.055)';
  context.lineWidth = 1;
  for (let index = 0; index < particles.length; index += 18) {
    const a = particles[index];
    const b = particles[(index + 37) % particles.length];
    const aPhase = a.angle + time * 0.00012 * a.speed;
    const bPhase = b.angle + time * 0.00012 * b.speed;
    const ax = Math.cos(aPhase) * a.radius * scale;
    const ay = (a.height - 0.5) * height * 1.18;
    const bx = Math.cos(bPhase) * b.radius * scale;
    const by = (b.height - 0.5) * height * 1.18;
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.stroke();
  }

  context.restore();
}

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    particlesRef.current = createParticles();
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = Math.max(1, Math.floor(rect.width * dpr));
      height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawBackground(context, width, height, particlesRef.current, performance.now());
    };

    const animate = (time: number) => {
      drawBackground(context, width, height, particlesRef.current, time);
      animationFrame = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!prefersReducedMotion) {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full opacity-80"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.08),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.72))]" />
    </div>
  );
}
