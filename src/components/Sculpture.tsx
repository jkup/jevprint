import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  ShaderMaterial,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { positions, SEGMENTS, STRANDS, type Fingerprint } from '../../shared/fingerprint';
import { StaticFingerprint } from './StaticFingerprint';

const vertexShader = `
  attribute vec3 target;
  attribute float strand;
  attribute float phase;
  uniform float blend;
  uniform float time;
  uniform float pulse;
  uniform float coherence;
  uniform float explode;
  uniform float pointScale;
  varying float vStrand;
  varying float vPhase;
  varying float vDepth;
  void main() {
    vec3 p = mix(position, target, blend);
    float wave = sin(time * 0.7 + phase * (1.0 - coherence) * 2.0);
    p *= 1.0 + wave * pulse * 0.045;
    p.y += (strand - 0.5) * explode * 1.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = pointScale * (4.0 / -mv.z);
    vStrand = strand;
    vPhase = phase;
    vDepth = clamp((mv.z + 7.0) / 4.0, 0.1, 1.0);
  }
`;
const fragmentShader = `
  uniform vec3 ink;
  uniform float density;
  uniform float sharpness;
  uniform float anchors;
  uniform bool points;
  varying float vStrand;
  varying float vPhase;
  varying float vDepth;
  void main() {
    float keep = fract(vStrand * 137.0);
    float visibility = 1.0 - smoothstep(0.30 + density * 0.65, 0.38 + density * 0.65, keep);
    float alpha = (0.24 + sharpness * 0.26) * vDepth * visibility;
    vec3 color = mix(ink, vec3(0.95, 0.92, 0.85), 0.18 + 0.18 * sin(vPhase));
    if (points) {
      if (fract(vPhase * 13.0 + vStrand * 79.0) > 0.015 + anchors * 0.018) discard;
      float d = length(gl_PointCoord - 0.5);
      alpha = (1.0 - smoothstep(0.1, 0.5, d)) * 0.9 * visibility;
    }
    gl_FragColor = vec4(color, alpha);
  }
`;

function Filaments({ a, b, blend, xray, reduced, reset }: Props) {
  const group = useRef<Group>(null);
  const { gl, camera, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.enablePan = false;
    orbit.enableDamping = !reduced;
    orbit.minDistance = 3.2;
    orbit.maxDistance = 7;
    const onChange = () => invalidate();
    orbit.addEventListener('change', onChange);
    return () => {
      orbit.removeEventListener('change', onChange);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate, reduced]);
  useEffect(() => {
    camera.position.set(0, 0.15, 4.8);
    group.current?.rotation.set(0.3, 0.15, -0.3);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [reset, camera, invalidate]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions(a), 3));
    g.setAttribute('target', new BufferAttribute(positions(b), 3));
    const strands = new Float32Array(STRANDS * (SEGMENTS + 1));
    const phases = new Float32Array(strands.length);
    const indices: number[] = [];
    for (let s = 0; s < STRANDS; s++)
      for (let j = 0; j <= SEGMENTS; j++) {
        const i = s * (SEGMENTS + 1) + j;
        strands[i] = (s + 0.5) / STRANDS;
        phases[i] = (j / SEGMENTS) * Math.PI * 2;
        if (j < SEGMENTS) indices.push(i, i + 1);
      }
    g.setAttribute('strand', new BufferAttribute(strands, 1));
    g.setAttribute('phase', new BufferAttribute(phases, 1));
    g.setIndex(indices);
    g.computeBoundingSphere();
    return g;
  }, [a, b]);
  const pointGeometry = useMemo(() => {
    const g = geometry.clone();
    g.setIndex(null);
    return g;
  }, [geometry]);
  const materials = useMemo(
    () =>
      [false, true].map(
        (points) =>
          new ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            uniforms: {
              blend: { value: blend },
              time: { value: 0 },
              pulse: { value: 0 },
              coherence: { value: 0.5 },
              explode: { value: 0 },
              pointScale: { value: 3 },
              ink: { value: new Color() },
              density: { value: 0.7 },
              sharpness: { value: 0.5 },
              anchors: { value: 0 },
              points: { value: points },
            },
          }),
      ),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      pointGeometry.dispose();
    },
    [geometry, pointGeometry],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  useEffect(() => {
    invalidate();
  }, [a, b, blend, xray, reduced, visible, invalidate]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const mix = (x: number, y: number) => x + (y - x) * blend;
    for (const material of materials) {
      const u = material.uniforms;
      u.blend.value = reduced
        ? blend
        : u.blend.value + (blend - u.blend.value) * (1 - Math.exp(-dt * 9));
      u.explode.value = reduced
        ? Number(xray)
        : u.explode.value + (Number(xray) - u.explode.value) * (1 - Math.exp(-dt * 6));
      u.pulse.value = reduced ? 0 : mix(a.values.emotional_intensity, b.values.emotional_intensity);
      u.coherence.value =
        mix(a.coherence, b.coherence) * 0.5 + mix(a.values.certainty, b.values.certainty) * 0.5;
      u.density.value = mix(a.values.technical_density, b.values.technical_density);
      u.sharpness.value = mix(a.values.specificity, b.values.specificity);
      u.anchors.value = mix(a.values.factual_claims, b.values.factual_claims);
      u.ink.value.setRGB(
        ...(a.color.map((v, i) => mix(v, b.color[i])) as [number, number, number]),
      );
      if (!reduced && visible)
        u.time.value += dt * (0.4 + mix(a.values.urgency, b.values.urgency) * 1.2);
    }
    if (group.current && !reduced && visible) group.current.rotation.y += dt * 0.035;
    controls.current?.update();
    if (!reduced && visible) invalidate();
  });
  return (
    <group ref={group} rotation={[0.3, 0.15, -0.3]}>
      <lineSegments geometry={geometry} material={materials[0]} frustumCulled={false} />
      <points geometry={pointGeometry} material={materials[1]} frustumCulled={false} />
    </group>
  );
}
type Props = {
  a: Fingerprint;
  b: Fingerprint;
  blend: number;
  xray: boolean;
  reduced: boolean;
  reset: number;
};
export default function Sculpture(props: Props) {
  const [failed, setFailed] = useState(() => {
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
      return !probe;
    } catch {
      return true;
    }
  });
  const fallback = (
    <StaticFingerprint {...props} message="Static view · Every decision is available in X-RAY." />
  );
  if (failed) return fallback;
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.15, 4.8], fov: 43 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      fallback={fallback}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            setFailed(true);
          },
          { once: true },
        );
      }}
    >
      <Filaments {...props} />
    </Canvas>
  );
}
