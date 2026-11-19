import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Vec3 } from '../../types/atlas'
import { caixaDaEstrutura } from './CamadaBatched'

const VAGAS = 8
const ESCONDIDO: Vec3 = [0, -100, 0]

/**
 * Rótulos das estruturas destacadas numa aula guiada. Usa um número fixo de <Html> sempre montados
 * (só muda o conteúdo), porque montar/desmontar <Html> durante a navegação gera erros de DOM.
 */
export function RotulosDestaques() {
  const { porId } = useCatalogo()
  const destaques = useAtlasStore((s) => s.destaques)
  // Recalcula as posições quando a câmera refaz o foco (ex.: a camada terminou de carregar)
  const focoVersao = useAtlasStore((s) => s.focoVersao)

  const itens = useMemo(
    () =>
      Array.from({ length: VAGAS }, (_, i) => {
        const id = destaques[i]
        const caixa = id ? caixaDaEstrutura(id) : null
        return {
          nome: id ? porId.get(id)?.nome : undefined,
          posicao: caixa ? (caixa.getCenter(new Vector3()).toArray() as Vec3) : ESCONDIDO,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destaques, porId, focoVersao],
  )

  return (
    <>
      {itens.map((item, i) => (
        <Html key={i} position={item.posicao} zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
          <div className={item.nome ? 'opacity-100' : 'opacity-0'} aria-hidden>
            <span className="absolute -top-1 -left-1 size-2 rounded-full bg-amber-400 ring-2 ring-white" />
            <span className="absolute bottom-2 left-2 rounded-md bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-950 shadow">
              {item.nome}
            </span>
          </div>
        </Html>
      ))}
    </>
  )
}
