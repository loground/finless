import React, { useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { Plane, Vector3 } from 'three'

function DraggableMesh({ geometry, material }) {
  const [position, setPosition] = useState([0, 0, 0])
  const [dragging, setDragging] = useState(false)
  const dragPlane = useMemo(() => new Plane(), [])
  const dragOffset = useMemo(() => new Vector3(), [])
  const dragPoint = useMemo(() => new Vector3(), [])

  const onPointerDown = (event) => {
    event.stopPropagation()
    event.target.setPointerCapture(event.pointerId)

    dragPlane.setFromNormalAndCoplanarPoint(
      event.camera.getWorldDirection(new Vector3()),
      new Vector3(...position),
    )
    dragOffset.copy(new Vector3(...position).sub(event.point))
    setDragging(true)
  }

  const onPointerMove = (event) => {
    if (!dragging) return
    event.stopPropagation()
    if (event.ray.intersectPlane(dragPlane, dragPoint)) {
      setPosition([
        dragPoint.x + dragOffset.x,
        dragPoint.y + dragOffset.y,
        dragPoint.z + dragOffset.z,
      ])
    }
  }

  const onPointerUp = (event) => {
    event.stopPropagation()
    event.target.releasePointerCapture(event.pointerId)
    setDragging(false)
  }

  return (
    <mesh
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

export function Model(props) {
  const { nodes, materials } = useGLTF('/surfboard.glb')

  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <DraggableMesh
            geometry={nodes.defaultMaterial.geometry}
            material={materials.phong1SG}
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
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/surfboard.glb')
