import { Edges } from '@react-three/drei'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Vec3 } from '../../types/atlas'

/** Moldura translúcida mostrando onde está o plano de corte (não captura toques). */
export function IndicadorCorte() {
  const corte = useAtlasStore((s) => s.corte)
  // Cortes de orientação livre (aulas) não têm moldura: ela é desenhada só nos planos do corpo
  if (!corte || corte.normal) return null

  const p = corte.posicao
  let posicao: Vec3
  let rotacao: Vec3
  let tamanho: [number, number]
  if (corte.plano === 'axial') {
    posicao = [0, p, 0]
    rotacao = [-Math.PI / 2, 0, 0]
    tamanho = [0.8, 0.4]
  } else if (corte.plano === 'sagital') {
    posicao = [p, 0.86, 0]
    rotacao = [0, Math.PI / 2, 0]
    tamanho = [0.4, 1.82]
  } else {
    posicao = [0, 0.86, p]
    rotacao = [0, 0, 0]
    tamanho = [0.8, 1.82]
  }

  return (
    <mesh position={posicao} rotation={rotacao} raycast={() => null} renderOrder={20}>
      <planeGeometry args={tamanho} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} depthWrite={false} side={2} />
      <Edges color="#38bdf8" />
    </mesh>
  )
}
