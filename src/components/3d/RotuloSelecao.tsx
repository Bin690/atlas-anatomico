import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Vec3 } from '../../types/atlas'
import { caixaDaEstrutura } from './CamadaBatched'

/**
 * Rótulo 3D da estrutura selecionada, ancorado no ponto tocado (ou no centro da peça).
 * Fica sempre montado: desmontar um <Html> durante a navegação gera erros de DOM.
 */
export function RotuloSelecao() {
  const { porId, sistemaPorId } = useCatalogo()
  const id = useAtlasStore((s) => s.selecionada)
  const ponto = useAtlasStore((s) => s.pontoSelecao)
  // Recalcula quando a câmera refaz o foco (ex.: a camada da peça terminou de carregar)
  const focoVersao = useAtlasStore((s) => s.focoVersao)
  const escondido = useAtlasStore((s) => s.modoQuiz && !s.quizRevelado)

  const posicao = useMemo<Vec3>(() => {
    if (ponto) return ponto
    const caixa = id ? caixaDaEstrutura(id) : null
    return caixa ? caixa.getCenter(new Vector3()).toArray() : [0, -100, 0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ponto, focoVersao])

  const estrutura = id ? porId.get(id) : undefined
  const cor = estrutura ? sistemaPorId.get(estrutura.sistema)?.cor : undefined

  return (
    <Html position={posicao} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`transition-opacity duration-200 ${estrutura ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
        <span
          className="absolute -top-1.5 -left-1.5 size-3 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: cor }}
        />
        <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/85 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
          {escondido ? '?' : estrutura?.nome}
        </span>
      </div>
    </Html>
  )
}
