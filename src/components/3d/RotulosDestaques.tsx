import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { caixaDaEstrutura } from './CamadaBatched'

export const VAGAS_ROTULOS = 10
const ALTURA = 26 // px por rótulo (inclui espaçamento)
const AFASTAMENTO = 56 // px entre o modelo e a coluna de rótulos
const MARGEM = 12

/**
 * Elementos DOM dos rótulos (criados por <CamadaRotulos/>, fora do canvas). O projetor, dentro do canvas,
 * escreve neles a cada quadro — sem re-render do React e sem <Html> do drei.
 */
export const domRotulos = {
  rotulos: [] as (HTMLDivElement | null)[],
  linhas: [] as (SVGLineElement | null)[],
  pontos: [] as (SVGCircleElement | null)[],
}

/** Camada HTML/SVG dos rótulos das aulas guiadas. Fica FORA do <Canvas>, cobrindo-o. */
export function CamadaRotulos() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        {Array.from({ length: VAGAS_ROTULOS }, (_, i) => (
          <g key={i}>
            <line
              ref={(el) => {
                domRotulos.linhas[i] = el
              }}
              stroke="#fbbf24"
              strokeWidth={1.25}
              strokeOpacity={0.85}
              style={{ display: 'none' }}
            />
            <circle
              ref={(el) => {
                domRotulos.pontos[i] = el
              }}
              r={4}
              fill="#f59e0b"
              stroke="white"
              strokeWidth={1.5}
              style={{ display: 'none' }}
            />
          </g>
        ))}
      </svg>
      {Array.from({ length: VAGAS_ROTULOS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            domRotulos.rotulos[i] = el
          }}
          className="absolute top-0 left-0 rounded-md bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-950 shadow data-[modo=numero]:grid data-[modo=numero]:size-[22px] data-[modo=numero]:place-items-center data-[modo=numero]:rounded-full data-[modo=numero]:p-0 data-[modo=numero]:ring-2 data-[modo=numero]:ring-white"
          style={{ display: 'none' }}
        />
      ))}
    </div>
  )
}

interface Item {
  nome: string
  centro: Vector3
  /** Meia-diagonal da caixa: leva a âncora para perto da superfície voltada à câmera. */
  raio: number
}

/**
 * Projetor dos rótulos (dentro do <Canvas>), no estilo dos atlas impressos: nomes em duas colunas,
 * à esquerda e à direita do modelo, ordenados pela altura da peça, sem sobreposição e com linha-guia.
 * Ao girar o modelo, os nomes não se embaralham.
 */
export function ProjetorRotulos() {
  const { porId } = useCatalogo()
  const destaques = useAtlasStore((s) => s.destaques)
  // Recalcula quando a câmera refaz o foco (ex.: a camada terminou de carregar)
  const focoVersao = useAtlasStore((s) => s.focoVersao)
  const camera = useThree((s) => s.camera)
  const { width: largura, height: altura } = useThree((s) => s.size)

  const itens = useMemo<Item[]>(
    () =>
      destaques.slice(0, VAGAS_ROTULOS).flatMap((id) => {
        const caixa = caixaDaEstrutura(id)
        const nome = porId.get(id)?.nome
        if (!caixa || !nome) return []
        return [{ nome, centro: caixa.getCenter(new Vector3()), raio: caixa.getSize(new Vector3()).length() / 2 }]
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destaques, porId, focoVersao],
  )
  const tmp = useMemo(() => new Vector3(), [])
  const paraCamera = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const { rotulos, linhas, pontos } = domRotulos
    // Esconde as vagas não usadas e escreve os nomes
    for (let i = 0; i < VAGAS_ROTULOS; i++) {
      const usado = i < itens.length
      for (const el of [rotulos[i], linhas[i], pontos[i]]) if (el) el.style.display = usado ? '' : 'none'
    }
    if (!itens.length) return

    // Âncora: do centro da peça em direção à câmera (perto da superfície visível), projetada na tela
    const ancoras = itens.map((it) => {
      paraCamera
        .copy(camera.position)
        .sub(it.centro)
        .normalize()
        .multiplyScalar(it.raio * 0.5)
      tmp.copy(it.centro).add(paraCamera).project(camera)
      return { x: ((tmp.x + 1) / 2) * largura, y: ((1 - tmp.y) / 2) * altura, atras: tmp.z > 1 }
    })
    const meio = ancoras.reduce((s, a) => s + a.x, 0) / ancoras.length
    const minX = Math.min(...ancoras.map((a) => a.x))
    const maxX = Math.max(...ancoras.map((a) => a.x))

    // Painel da aula/quiz/cartão ocupa a direita no desktop
    const { emAula, modoQuiz, selecionada } = useAtlasStore.getState()
    const limiteDireito = largura >= 640 && (emAula || modoQuiz || selecionada) ? largura - 410 : largura - MARGEM
    const limiteInferior = largura >= 640 ? altura - 110 : altura * 0.5

    // Tela estreita: em vez de nomes, marcadores numerados sobre as peças (a legenda fica no painel)
    const numerado = largura < 640
    for (let i = 0; i < itens.length; i++) {
      const el = rotulos[i]
      if (!el) continue
      const texto = numerado ? String(i + 1) : itens[i].nome
      if (el.textContent !== texto) el.textContent = texto
      el.dataset.modo = numerado ? 'numero' : 'nome'
      if (linhas[i]) linhas[i]!.style.display = numerado ? 'none' : ''
      if (pontos[i]) pontos[i]!.style.display = numerado ? 'none' : ''
      if (numerado) {
        el.style.transform = `translate(${ancoras[i].x - 11}px, ${ancoras[i].y - 11}px)`
        el.style.opacity = ancoras[i].atras ? '0' : '1'
      }
    }
    if (numerado) return

    // Cada rótulo vai para o lado em que sua peça está (um único rótulo vai à direita)
    const ladoDe = (x: number): 'esq' | 'dir' => (ancoras.length === 1 || x > meio ? 'dir' : 'esq')
    const larguras = itens.map((_, i) => rotulos[i]?.offsetWidth ?? 0)
    const xDe = (i: number) =>
      ladoDe(ancoras[i].x) === 'esq'
        ? Math.max(MARGEM, minX - AFASTAMENTO - larguras[i])
        : Math.min(limiteDireito - larguras[i], maxX + AFASTAMENTO)

    /** Empilha os itens na ordem de altura, sem sobreposição; se passar do limite, sobe tudo. */
    const empilhar = (indices: number[]) => {
      const ordem = [...indices].sort((p, q) => ancoras[p].y - ancoras[q].y)
      const ys = new Map<number, number>()
      let anterior = -Infinity
      for (const i of ordem) {
        anterior = Math.max(ancoras[i].y, anterior + ALTURA, MARGEM + 60)
        ys.set(i, anterior)
      }
      const excesso = anterior - limiteInferior
      if (excesso > 0) ordem.forEach((i, k) => ys.set(i, Math.max(MARGEM + 60 + k * ALTURA, ys.get(i)! - excesso)))
      return ys
    }

    // 1ª tentativa: cada coluna empilhada separadamente
    const todos = itens.map((_, i) => i)
    let ys = new Map([
      ...empilhar(todos.filter((i) => ladoDe(ancoras[i].x) === 'esq')),
      ...empilhar(todos.filter((i) => ladoDe(ancoras[i].x) === 'dir')),
    ])
    // Se as colunas se encontram no meio (tela estreita), cada rótulo ganha uma linha própria
    const colide = todos.some((i) =>
      todos.some(
        (j) =>
          i < j &&
          ladoDe(ancoras[i].x) !== ladoDe(ancoras[j].x) &&
          Math.abs(ys.get(i)! - ys.get(j)!) < ALTURA &&
          xDe(i) < xDe(j) + larguras[j] &&
          xDe(j) < xDe(i) + larguras[i],
      ),
    )
    if (colide) ys = empilhar(todos)

    for (const i of todos) {
      const el = rotulos[i]
      const linha = linhas[i]
      const ponto = pontos[i]
      if (!el || !linha || !ponto) continue
      const a = ancoras[i]
      const x = xDe(i)
      const y = ys.get(i)!
      el.style.transform = `translate(${x}px, ${y - ALTURA / 2 + 3}px)`
      el.style.opacity = a.atras ? '0' : '1'
      linha.setAttribute('x1', String(ladoDe(a.x) === 'esq' ? x + larguras[i] : x))
      linha.setAttribute('y1', String(y))
      linha.setAttribute('x2', String(a.x))
      linha.setAttribute('y2', String(a.y))
      ponto.setAttribute('cx', String(a.x))
      ponto.setAttribute('cy', String(a.y))
    }
  })

  return null
}
