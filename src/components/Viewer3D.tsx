import { Environment, Lightformer } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { useCatalogo } from '../data'
import { useAtlasStore } from '../store/useAtlasStore'
import { CamadaBatched } from './3d/CamadaBatched'
import { RigCamera } from './3d/RigCamera'
import { IndicadorCorte } from './3d/IndicadorCorte'
import { RotuloSelecao } from './3d/RotuloSelecao'

/** Luz de estúdio suave, sem baixar HDR externo. */
function Iluminacao() {
  return (
    <>
      <hemisphereLight args={['#f1f5f9', '#1e293b', 0.6]} />
      <directionalLight position={[2, 4, 3]} intensity={1.8} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.7} color="#bae6fd" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 3]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#93c5fd" position={[-4, 1, -2]} scale={[3, 4, 1]} />
        <Lightformer form="ring" intensity={0.8} position={[3, 2, -3]} scale={2} />
      </Environment>
    </>
  )
}

function Camadas() {
  const { sistemas, porId } = useCatalogo()
  const camadas = useAtlasStore((s) => s.camadas)
  const raioX = useAtlasStore((s) => s.raioX)
  const selecionada = useAtlasStore((s) => s.selecionada)
  const sistemaSelecionado = selecionada ? porId.get(selecionada)?.sistema : undefined

  // Camadas são baixadas na primeira vez que ficam visíveis e depois permanecem em memória
  const [carregadas, setCarregadas] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    setCarregadas((c) => ([...camadas].every((id) => c.has(id)) ? c : new Set([...c, ...camadas])))
  }, [camadas])

  return (
    <>
      {sistemas
        .filter((s) => carregadas.has(s.id))
        .map((s) => (
          <Suspense key={s.id} fallback={null}>
            <CamadaBatched
              sistema={s}
              visivel={camadas.has(s.id)}
              translucida={raioX && !!s.raioX && s.id !== sistemaSelecionado}
            />
          </Suspense>
        ))}
    </>
  )
}

/** Canvas único e persistente do atlas. */
export default function Viewer3D() {
  return (
    <Canvas
      camera={{ fov: 35, position: [0, 1.1, 5], near: 0.005, far: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
    >
      <Iluminacao />
      <Suspense fallback={null}>
        <Camadas />
        <RotuloSelecao />
      </Suspense>
      <IndicadorCorte />
      <RigCamera />
    </Canvas>
  )
}
