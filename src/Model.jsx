import React, { useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { Plane, Vector3 } from 'three'

function DraggableMesh({ geometry, material, onDragEnd }) {
  const [position, setPosition] = useState([0, 0, 0])
  const [dragging, setDragging] = useState(false)
  const dragPlane = useMemo(() => new Plane(), [])
  const dragOffset = useMemo(() => new Vector3(), [])
  const dragPoint = useMemo(() => new Vector3(), [])
  const worldPos = useMemo(() => new Vector3(), [])
  const localHit = useMemo(() => new Vector3(), [])
  const lockedZ = useMemo(() => ({ value: 0 }), [])
  const latestPositionRef = React.useRef([0, 0, 0])
  const meshRef = React.useRef(null)

  const onPointerDown = (event) => {
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
    if (!dragging) return
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
    event.target.releasePointerCapture(event.pointerId)
    setDragging(false)
    if (onDragEnd) onDragEnd(latestPositionRef.current)
  }

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
    />
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
    if (primaryTriggeredRef.current) return
    const distanceFromStart = Math.hypot(position[0], position[1], position[2])
    if (distanceFromStart >= removeThreshold) {
      primaryTriggeredRef.current = true
      if (onPrimaryMovedFar) onPrimaryMovedFar()
    }
  }

  const handleSecondaryDragEnd = (position) => {
    if (secondaryTriggeredRef.current) return
    const distanceFromStart = Math.hypot(position[0], position[1], position[2])
    if (distanceFromStart >= removeThreshold) {
      secondaryTriggeredRef.current = true
      if (onSecondaryMovedFar) onSecondaryMovedFar()
    }
  }

  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <DraggableMesh
            geometry={nodes.defaultMaterial.geometry}
            material={materials.phong1SG}
            onDragEnd={handlePrimaryDragEnd}
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
            onDragEnd={handleSecondaryDragEnd}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/surfboard.glb')
