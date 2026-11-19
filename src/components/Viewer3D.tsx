import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState, type ComponentProps } from 'react'
import { useCatalogo } from '../data'
import { useAtlasStore } from '../store/useAtlasStore'
import { CamadaBatched } from './3d/CamadaBatched'
import { RigCamera } from './3d/RigCamera'
import { IndicadorCorte } from './3d/IndicadorCorte'
import { CamadaRotulos, ProjetorRotulos } from './3d/RotulosDestaques'
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

/** Baixa o modelo detalhado em segundo plano e avisa quando estiver pronto. */
function PreCarregar({ url, onPronto }: { url: string; onPronto: () => void }) {
  useGLTF(url)
  useEffect(onPronto, [onPronto])
  return null
}

/** Mostra a versão leve imediatamente e troca pela detalhada quando ela termina de baixar. */
function CamadaProgressiva(props: Omit<ComponentProps<typeof CamadaBatched>, 'url'>) {
  const { sistema } = props
  const [detalhada, setDetalhada] = useState(!sistema.modeloLeve)
  const [pronta] = useState(() => () => setDetalhada(true))
  // Este efeito só roda depois que a versão leve terminou de carregar e apareceu (o componente
  // fica suspenso até lá): só então começa a baixar a detalhada, sem disputar banda com a leve.
  const [podeDetalhar, setPodeDetalhar] = useState(false)
  useEffect(() => setPodeDetalhar(true), [])
  return (
    <>
      <CamadaBatched {...props} url={detalhada || !sistema.modeloLeve ? sistema.modelo : sistema.modeloLeve} />
      {!detalhada && podeDetalhar && (
        <Suspense fallback={null}>
          <PreCarregar url={sistema.modelo} onPronto={pronta} />
        </Suspense>
      )}
    </>
  )
}

function Camadas() {
  const { sistemas, porId } = useCatalogo()
  const camadas = useAtlasStore((s) => s.camadas)
  const raioX = useAtlasStore((s) => s.raioX)
  // A camada da estrutura em estudo (selecionada, ou procurada no quiz "Encontre") nunca fica translúcida
  const emEstudo = useAtlasStore((s) => s.selecionada ?? s.regiaoFoco)
  const sistemaSelecionado = emEstudo ? porId.get(emEstudo)?.sistema : undefined

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
            <CamadaProgressiva
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
    <>
      <Canvas
        camera={{ fov: 35, position: [0, 1.1, 5], near: 0.005, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
      >
        <Iluminacao />
        <Suspense fallback={null}>
          <Camadas />
          <RotuloSelecao />
          <ProjetorRotulos />
        </Suspense>
        <IndicadorCorte />
        <RigCamera />
      </Canvas>
      <CamadaRotulos />
    </>
  )
}
