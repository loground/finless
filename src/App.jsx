import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import './App.css'
import { Model } from './Model'

function App() {
  return (
    <main className="scene-wrap">
      <Canvas camera={{ position: [0, 0.8, 4], fov: 45 }} shadows>
        <color attach="background" args={['#e8f2ff']} />
        <ambientLight intensity={0.5} />
        <Stage intensity={0.8} environment="city" adjustCamera={false}>
          <Model scale={1} position={[0, 0, 0]} />
        </Stage>
        <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} />
      </Canvas>
    </main>
  )
}

export default App
