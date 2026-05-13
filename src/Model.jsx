import React, { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Color, DoubleSide, Plane, Vector3 } from 'three'

const burnVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const burnFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uBurn;
uniform vec3 uBaseColor;
varying vec2 vUv;
varying vec3 vPosition;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += noise(p) * amp;
    p *= 2.15;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec3 p = vPosition * 7.5 + vec3(0.0, uTime * 4.5, uTime * 1.25);
  float burnNoise = fbm(p);
  float emberNoise = fbm(vPosition * 16.0 + vec3(uTime * 1.7, uTime * 3.8, 0.0));
  float verticalSweep = smoothstep(-0.28, 1.12, vUv.y + burnNoise * 0.48);
  float dissolveMask = mix(1.0, verticalSweep, clamp(uBurn, 0.0, 1.0));
  float edge = 1.0 - smoothstep(0.0, 0.22, abs(dissolveMask - uBurn));
  float hotEdge = pow(edge, 2.4);
  float flameShape = smoothstep(0.05, 0.8, edge + emberNoise * 0.55);
  float flameFlicker = 0.65 + 0.35 * sin(uTime * 32.0 + burnNoise * 18.0);
  float flame = flameShape * flameFlicker;
  float sparks = step(0.965, emberNoise) * edge * (1.0 - smoothstep(0.7, 1.0, uBurn));

  if (dissolveMask < uBurn) discard;

  vec3 deepRed = vec3(0.95, 0.04, 0.0);
  vec3 ember = vec3(1.0, 0.28, 0.0);
  vec3 hotCore = vec3(1.0, 0.95, 0.28);
  vec3 whiteHot = vec3(1.0, 0.98, 0.82);
  vec3 smokeChar = vec3(0.012, 0.008, 0.006);
  float charAmount = smoothstep(0.0, 0.55, uBurn) * (1.0 - edge * 0.95);
  vec3 color = mix(uBaseColor, smokeChar, charAmount);
  color += deepRed * edge * 1.9;
  color += ember * flame * 3.8;
  color += hotCore * hotEdge * 5.8;
  color += whiteHot * pow(edge, 7.0) * 5.2;
  color += vec3(1.0, 0.45, 0.08) * sparks * 8.0;

  float alpha = 1.0 - smoothstep(0.9, 1.0, uBurn);
  gl_FragColor = vec4(color, alpha);
}
`

function BurnMaterial({ sourceMaterial, burning }) {
  const materialRef = React.useRef(null)
  const progressRef = React.useRef(0)
  const baseColor = useMemo(
    () => sourceMaterial?.color?.clone?.() ?? new Color('#f5f5f5'),
    [sourceMaterial],
  )
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uBaseColor: { value: baseColor },
    }),
    [baseColor],
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return
    if (burning) {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.85)
    }
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uBurn.value = progressRef.current
  })

  if (!burning) return <primitive object={sourceMaterial} attach="material" />

  return (
    <shaderMaterial
      ref={materialRef}
      attach="material"
      vertexShader={burnVertexShader}
      fragmentShader={burnFragmentShader}
      uniforms={uniforms}
      transparent
      side={DoubleSide}
      depthWrite={false}
    />
  )
}

function DraggableMesh({ geometry, material, onRemove }) {
  const [position, setPosition] = useState([0, 0, 0])
  const [dragging, setDragging] = useState(false)
  const [burning, setBurning] = useState(false)
  const [gone, setGone] = useState(false)
  const dragPlane = useMemo(() => new Plane(), [])
  const dragOffset = useMemo(() => new Vector3(), [])
  const dragPoint = useMemo(() => new Vector3(), [])
  const worldPos = useMemo(() => new Vector3(), [])
  const localHit = useMemo(() => new Vector3(), [])
  const lockedZ = useMemo(() => ({ value: 0 }), [])
  const latestPositionRef = React.useRef([0, 0, 0])
  const meshRef = React.useRef(null)

  useFrame(() => {
    if (!burning || gone) return
    const burnComplete = meshRef.current?.material?.uniforms?.uBurn?.value >= 0.995
    if (burnComplete) setGone(true)
  })

  const onPointerDown = (event) => {
    if (burning || gone) return
    event.stopPropagation()
    event.target.setPointerCapture(event.pointerId)

    if (!meshRef.current || !meshRef.current.parent) return

    meshRef.current.getWorldPosition(worldPos)
    dragPlane.setFromNormalAndCoplanarPoint(
      new Vector3(0, 0, 1),
      worldPos,
    )

    if (event.ray.intersectPlane(dragPlane, dragPoint)) {
      localHit.copy(meshRef.current.parent.worldToLocal(dragPoint.clone()))
      dragOffset.set(
        position[0] - localHit.x,
        position[1] - localHit.y,
        0,
      )
    }

    lockedZ.value = position[2]
    setDragging(true)
  }

  const onPointerMove = (event) => {
    if (!dragging || burning || gone) return
    event.stopPropagation()
    if (event.ray.intersectPlane(dragPlane, dragPoint)) {
      if (!meshRef.current || !meshRef.current.parent) return
      localHit.copy(meshRef.current.parent.worldToLocal(dragPoint.clone()))
      const nextPosition = [
        localHit.x + dragOffset.x,
        localHit.y + dragOffset.y,
        lockedZ.value,
      ]
      latestPositionRef.current = nextPosition
      setPosition(nextPosition)
    }
  }

  const onPointerUp = (event) => {
    event.stopPropagation()
    if (event.target.hasPointerCapture(event.pointerId)) {
      event.target.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    if (burning || gone) return
    if (onRemove && onRemove(latestPositionRef.current)) setBurning(true)
  }

  if (gone) return null

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      position={position}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <BurnMaterial sourceMaterial={material} burning={burning} />
    </mesh>
  )
}

export function Model({ onPrimaryMovedFar, onSecondaryMovedFar, ...props }) {
  const { nodes, materials } = useGLTF('/surfboard.glb')
  const primaryTriggeredRef = React.useRef(false)
  const secondaryTriggeredRef = React.useRef(false)
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  const removeThreshold = isMobile ? 0.1 : 0.1

  const handlePrimaryDragEnd = (position) => {
    if (primaryTriggeredRef.current) return false
    const distanceFromStart = Math.hypot(position[0], position[1], position[2])
    if (distanceFromStart >= removeThreshold) {
      primaryTriggeredRef.current = true
      if (onPrimaryMovedFar) onPrimaryMovedFar()
      return true
    }
    return false
  }

  const handleSecondaryDragEnd = (position) => {
    if (secondaryTriggeredRef.current) return false
    const distanceFromStart = Math.hypot(position[0], position[1], position[2])
    if (distanceFromStart >= removeThreshold) {
      secondaryTriggeredRef.current = true
      if (onSecondaryMovedFar) onSecondaryMovedFar()
      return true
    }
    return false
  }

  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <DraggableMesh
            geometry={nodes.defaultMaterial.geometry}
            material={materials.phong1SG}
            onRemove={handlePrimaryDragEnd}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_1.geometry}
            material={materials.phong1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_2.geometry}
            material={materials.blinn1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_3.geometry}
            material={materials.anisotropic1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_4.geometry}
            material={materials.anisotropic1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_5.geometry}
            material={materials.phong1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_6.geometry}
            material={materials.phong1SG}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_7.geometry}
            material={materials.phong1SG}
          />
          <DraggableMesh
            geometry={nodes.defaultMaterial_8.geometry}
            material={materials.phong1SG}
            onRemove={handleSecondaryDragEnd}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/surfboard.glb')
