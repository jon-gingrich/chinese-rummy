"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PodiumEntry } from "../../lib/celebrationRanking";

const FELT = "#2d5240";
const WOOD = "#5c3d2e";
const WOOD_DARK = "#3e291f";
const GOLD = "#c9a227";
const SILVER = "#c0c7d0";
const BRONZE = "#b87333";
const CREAM = "#faf6f0";

const SUIT_COLORS = ["#c0392b", "#2c3e50", "#c0392b", "#2c3e50"] as const;
const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7"] as const;

export const CELEBRATION_SEQUENCE_MS = 7200;

type CelebrationSceneProps = {
  podium: PodiumEntry[];
  skip: boolean;
  onSequenceComplete: () => void;
};

type RevealState = { third: number; second: number; first: number };

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function CardMesh({
  baseY,
  startZ,
  color,
  rank,
  speed,
  radius,
  phase,
}: {
  baseY: number;
  startZ: number;
  color: string;
  rank: string;
  speed: number;
  radius: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const t = state.clock.elapsedTime * speed + phase;
    group.position.x = Math.cos(t) * radius;
    group.position.y = Math.sin(t * 1.3) * (radius * 0.35) + baseY * 0.15;
    group.position.z = startZ + ((state.clock.elapsedTime * 4 + phase * 3) % 28) - 18;
    group.rotation.x += 0.01 * speed;
    group.rotation.y += 0.018 * speed;
    group.rotation.z += 0.008 * speed;
  });

  return (
    <group ref={ref} position={[0, baseY, startZ]}>
      <mesh>
        <planeGeometry args={[0.72, 1.05]} />
        <meshStandardMaterial color={CREAM} side={THREE.DoubleSide} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.58, 0.88]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>
      <Html center transform distanceFactor={8} style={{ pointerEvents: "none" }} position={[0, 0, 0.02]}>
        <div
          style={{
            color: CREAM,
            fontWeight: 800,
            fontSize: 18,
            fontFamily: "Georgia, serif",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {rank}
        </div>
      </Html>
    </group>
  );
}

function FlyingCards({ count = 42 }: { count?: number }) {
  const cards = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const radius = 2.2 + (index % 5) * 0.55;
        return {
          id: index,
          baseY: ((index % 7) - 3) * 0.35,
          startZ: -12 + (index % 11) * 1.4,
          color: SUIT_COLORS[index % SUIT_COLORS.length]!,
          rank: RANKS[index % RANKS.length]!,
          speed: 0.35 + (index % 6) * 0.08,
          radius,
          phase: index * 0.37,
        };
      }),
    [count],
  );

  return (
    <group>
      {cards.map((card) => (
        <CardMesh key={card.id} {...card} />
      ))}
    </group>
  );
}

function Pedestal({
  place,
  height,
  color,
  x,
  visible,
  names,
  score,
}: {
  place: 1 | 2 | 3;
  height: number;
  color: string;
  x: number;
  visible: number;
  names: string;
  score: number;
}) {
  const opacity = THREE.MathUtils.clamp(visible, 0, 1);
  const rise = lerp(-0.45, 0, easeInOutCubic(opacity));

  if (opacity < 0.02) {
    return null;
  }

  return (
    <group position={[x, rise, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.35, height, 1.1]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, height + 0.08, 0]} castShadow>
        <boxGeometry args={[1.45, 0.16, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.25} />
      </mesh>
      <mesh position={[0, height + 0.22, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 24]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <Html
        position={[0, height + 0.85, 0]}
        center
        style={{
          opacity,
          pointerEvents: "none",
          userSelect: "none",
          textAlign: "center",
          width: 170,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: CREAM,
            textShadow: "0 2px 10px rgba(0,0,0,0.75)",
          }}
        >
          <div
            style={{
              fontSize: place === 1 ? 28 : 20,
              fontWeight: 800,
              letterSpacing: 1,
              color,
            }}
          >
            {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
          </div>
          <div style={{ fontSize: place === 1 ? 16 : 13, fontWeight: 700, marginTop: 4 }}>
            {names}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{score} pts</div>
        </div>
      </Html>
    </group>
  );
}

function Podium({ podium, reveal }: { podium: PodiumEntry[]; reveal: RevealState }) {
  const byPlace = (place: 1 | 2 | 3) => podium.find((entry) => entry.place === place);
  const first = byPlace(1);
  const second = byPlace(2);
  const third = byPlace(3);

  return (
    <group position={[0, -1.1, 2.2]}>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.3, 48]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>

      {second ? (
        <Pedestal
          place={2}
          height={1.15}
          color={SILVER}
          x={-1.55}
          visible={reveal.second}
          names={second.players.map((player) => player.displayName).join(" & ")}
          score={second.score}
        />
      ) : null}
      {first ? (
        <Pedestal
          place={1}
          height={1.65}
          color={GOLD}
          x={0}
          visible={reveal.first}
          names={first.players.map((player) => player.displayName).join(" & ")}
          score={first.score}
        />
      ) : null}
      {third ? (
        <Pedestal
          place={3}
          height={0.85}
          color={BRONZE}
          x={1.55}
          visible={reveal.third}
          names={third.players.map((player) => player.displayName).join(" & ")}
          score={third.score}
        />
      ) : null}
    </group>
  );
}

function CameraAndReveal({
  skip,
  onSequenceComplete,
  onRevealChange,
}: {
  skip: boolean;
  onSequenceComplete: () => void;
  onRevealChange: (reveal: RevealState) => void;
}) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const completed = useRef(false);
  const lastRevealKey = useRef("");

  useEffect(() => {
    if (!skip) {
      return;
    }
    done.current = true;
    onRevealChange({ third: 1, second: 1, first: 1 });
    camera.position.set(0, 1.6, 7.2);
    camera.lookAt(0, 0.4, 2.2);
    if (!completed.current) {
      completed.current = true;
      onSequenceComplete();
    }
  }, [skip, camera, onRevealChange, onSequenceComplete]);

  useFrame((state) => {
    if (done.current) {
      return;
    }
    if (start.current === null) {
      start.current = state.clock.elapsedTime;
    }
    const elapsed = (state.clock.elapsedTime - start.current) * 1000;
    const t = Math.min(1, elapsed / CELEBRATION_SEQUENCE_MS);

    const approachT = easeInOutCubic(THREE.MathUtils.clamp((t - 0.32) / 0.22, 0, 1));
    const flyT = easeInOutCubic(Math.min(1, t / 0.32));

    camera.position.set(0, lerp(0.2, 1.6, approachT), lerp(-8 + flyT * 6, 7.2, approachT));
    camera.lookAt(0, lerp(0, 0.4, approachT), lerp(-2, 2.2, approachT));

    const reveal: RevealState = {
      third: THREE.MathUtils.clamp((t - 0.52) / 0.12, 0, 1),
      second: THREE.MathUtils.clamp((t - 0.68) / 0.12, 0, 1),
      first: THREE.MathUtils.clamp((t - 0.84) / 0.12, 0, 1),
    };
    const key = `${reveal.third.toFixed(2)}:${reveal.second.toFixed(2)}:${reveal.first.toFixed(2)}`;
    if (key !== lastRevealKey.current) {
      lastRevealKey.current = key;
      onRevealChange(reveal);
    }

    if (t >= 1 && !completed.current) {
      done.current = true;
      completed.current = true;
      onSequenceComplete();
    }
  });

  return null;
}

function SceneContents({ podium, skip, onSequenceComplete }: CelebrationSceneProps) {
  const [reveal, setReveal] = useState<RevealState>({ third: 0, second: 0, first: 0 });
  const handleRevealChange = useMemo(() => setReveal, []);
  const handleComplete = useMemo(() => onSequenceComplete, [onSequenceComplete]);

  return (
    <>
      <color attach="background" args={[FELT]} />
      <fog attach="fog" args={[FELT, 8, 28]} />
      <ambientLight intensity={0.55} />
      <directionalLight castShadow position={[4, 8, 6]} intensity={1.25} />
      <pointLight position={[-3, 4, -4]} intensity={0.45} color="#e8d48b" />
      <FlyingCards />
      <Podium podium={podium} reveal={reveal} />
      <CameraAndReveal
        skip={skip}
        onSequenceComplete={handleComplete}
        onRevealChange={handleRevealChange}
      />
    </>
  );
}

export function CelebrationScene(props: CelebrationSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.2, -8], fov: 50, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100%", height: "100%" }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
