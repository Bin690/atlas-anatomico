import { useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { caixaDaEstrutura } from '../3d/CamadaBatched'
import { lerCamera, pontosAVista } from '../3d/RigCamera'
import { useCatalogo } from '../../data'
import { regiaoDoPonto } from '../../data/marcos'
import { carregarRegioes, comArtigo, regiaoDoCodigo, selecionarRegiao } from '../../data/regioes'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeIsolar } from './Icones'

/** Distância (m) mediana da câmara ao que está à vista abaixo da qual se considera que houve zoom. */
const PERTO = 0.75
/** Fração mínima dos pontos à vista que têm de cair na região sugerida. */
const MAIORIA = 0.45
/** Tempo (ms) com a mesma região à vista antes de sugerir (evita piscar durante o gesto). */
const ESTAVEL = 300

/**
 * Última vista analisada: os raios voltam a ser lançados quando a câmara se mexe ou, com ela parada, a
 * cada segundo (as camadas podem acabar de carregar, ou ser ligadas, sem a câmara se mexer).
 */
let ultima: { camera: string; quando: number; regiao: string | null } = { camera: '', quando: 0, regiao: null }

/** Região que ocupa a maior parte do que está à vista, se houve zoom (ou null). */
function regiaoAVista(): string | null {
  const camera =
    (lerCamera()
      ?.map((n) => n.toFixed(3))
      .join(',') ?? '') + (useAtlasStore.getState().selecionada ?? '')
  const agora = performance.now()
  if (camera === ultima.camera && agora - ultima.quando < 1000) return ultima.regiao
  ultima = { camera, quando: agora, regiao: calcular() }
  return ultima.regiao
}

function calcular(): string | null {
  const pontos = pontosAVista()
  if (pontos.length < 4) return null
  const distancias = pontos.map((p) => p.distancia).sort((a, b) => a - b)
  if (distancias[Math.floor(distancias.length / 2)] > PERTO) return null
  // Com uma peça selecionada, a região é a dela (o resto do ecrã pode mostrar partes vizinhas, como a
  // coxa ao lado da mão, que ganhavam a maioria dos raios)
  const selecionada = useAtlasStore.getState().selecionada
  const caixa = selecionada ? caixaDaEstrutura(selecionada) : null
  if (caixa) {
    const c = caixa.getCenter(new Vector3())
    return regiaoDoPonto([c.x, c.y, c.z])
  }
  const contagem = new Map<string, number>()
  for (const { ponto } of pontos) {
    const r = regiaoDoPonto([ponto.x, ponto.y, ponto.z])
    contagem.set(r, (contagem.get(r) ?? 0) + 1)
  }
  const [melhor, n] = [...contagem].sort((a, b) => b[1] - a[1])[0]
  return n / pontos.length >= MAIORIA ? melhor : null
}

/**
 * Ao fazer zoom numa parte do corpo (pinça no telemóvel, roda do rato no computador), sugere isolá-la:
 * "Isolar a mão direita". A região é a que ocupa a maior parte do que está à vista (grelha de raios a
 * partir da câmara), classificada pelos marcos do esqueleto.
 */
export function SugestaoRegiao() {
  const { estruturas } = useCatalogo()
  const bloqueado = useAtlasStore((s) => !!s.regiaoAtiva || s.emAula || s.modoQuiz)
  const isolarRegiao = useAtlasStore((s) => s.isolarRegiao)
  const [codigo, setCodigo] = useState<string | null>(null)
  const candidato = useRef<{ codigo: string | null; desde: number }>({ codigo: null, desde: 0 })

  useEffect(() => {
    if (bloqueado) {
      setCodigo(null)
      return
    }
    const id = setInterval(() => {
      const atual = regiaoAVista()
      const c = candidato.current
      if (atual !== c.codigo) candidato.current = { codigo: atual, desde: performance.now() }
      else if (performance.now() - c.desde >= ESTAVEL) setCodigo(atual)
      if (!atual) setCodigo(null)
    }, 200)
    return () => clearInterval(id)
  }, [bloqueado])

  const alvo = codigo ? regiaoDoCodigo(codigo) : null
  if (!alvo || bloqueado) return null
  // Rótulo sem precisar dos dados (o lado vem do código)
  const rotulo = selecionarRegiao([], {}, alvo.regiao, alvo.lado).rotulo

  const isolar = async () => {
    const regioes = await carregarRegioes()
    const { ids, rotulo: r } = selecionarRegiao(estruturas, regioes, alvo.regiao, alvo.lado)
    if (ids.length) isolarRegiao(r, ids)
  }

  return (
    <button
      type="button"
      onClick={() => void isolar()}
      className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+7.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-400/50 bg-superficie/95 py-2 pr-4 pl-3 text-sm font-medium whitespace-nowrap text-sky-200 shadow-lg backdrop-blur transition hover:border-sky-300 hover:text-white sm:top-4"
    >
      <IconeIsolar className="size-4" />
      Isolar {comArtigo(rotulo)}
    </button>
  )
}
