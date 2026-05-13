import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import './App.css'
import { Model } from './Model'

function AnimatedModel({ onPrimarySolved, onSecondarySolved }) {
  const groupRef = useRef(null)
  const [rotateToSecond, setRotateToSecond] = useState(false)
  const initialRotationY = 0.2
  const targetRotationY = rotateToSecond ? 2.8 : initialRotationY

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const currentY = groupRef.current.rotation.y
    const lerpFactor = 1 - Math.exp(-4 * delta)
    groupRef.current.rotation.y =
      currentY + (targetRotationY - currentY) * lerpFactor
  })

  return (
    <group ref={groupRef} position={[0, 1.1, 1.8]} rotation={[0, initialRotationY, 0]}>
      <Model
        scale={1}
        onPrimaryMovedFar={() => {
          setRotateToSecond(true)
          if (onPrimarySolved) onPrimarySolved()
        }}
        onSecondaryMovedFar={() => {
          if (onSecondarySolved) onSecondarySolved()
        }}
      />
    </group>
  )
}

function App() {
  const [primarySolved, setPrimarySolved] = useState(false)
  const [secondarySolved, setSecondarySolved] = useState(false)
  const puzzleSolved = primarySolved && secondarySolved

  return (
    <main className="scene-wrap">
      <div className="status-text">{puzzleSolved ? "let's get itttttttt!!" : 'solve the puzzle'}</div>
      <Canvas camera={{ position: [0, 0.8, 4], fov: 45 }} shadows>
        <color attach="background" args={['#e8f2ff']} />
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow
          position={[4, 6, 4]}
          intensity={1}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <AnimatedModel
          onPrimarySolved={() => setPrimarySolved(true)}
          onSecondarySolved={() => setSecondarySolved(true)}
        />
      </Canvas>
    </main>
  )
}

export default App
