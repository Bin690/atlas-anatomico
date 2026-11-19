import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { caixaDaEstrutura } from './CamadaBatched'
import { estruturaVisivelEm } from './corte'

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
              className="transition-opacity duration-200"
              strokeWidth={1.25}
              strokeOpacity={0.85}
              style={{ display: 'none' }}
            />
            <circle
              ref={(el) => {
                domRotulos.pontos[i] = el
              }}
              r={4}
              className="transition-opacity duration-200"
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
          className="absolute top-0 left-0 rounded-md transition-opacity duration-200 bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-950 shadow data-[modo=numero]:grid data-[modo=numero]:size-[22px] data-[modo=numero]:place-items-center data-[modo=numero]:rounded-full data-[modo=numero]:p-0 data-[modo=numero]:ring-2 data-[modo=numero]:ring-white"
          style={{ display: 'none' }}
        />
      ))}
    </div>
  )
}

interface Item {
  id: string
  nome: string
  centro: Vector3
  /** Meia-diagonal da caixa da peça. */
  raio: number
}

/** Pontos de amostra no plano da tela ao redor do centro (fração do raio da peça). */
const AMOSTRAS: [number, number][] = [
  [0, 0],
  [0.3, 0],
  [-0.3, 0],
  [0, 0.3],
  [0, -0.3],
  [0.22, 0.22],
  [-0.22, -0.22],
]
/** A visibilidade (raycast) é recalculada a cada N quadros; o resto só reprojeta. */
const QUADROS_ENTRE_TESTES = 3

/**
 * Projetor dos rótulos (dentro do <Canvas>), no estilo dos atlas impressos: nomes em duas colunas,
 * à esquerda e à direita do modelo, ordenados pela altura da peça, sem sobreposição e com linha-guia.
 *
 * Só mostra o nome de peças que o usuário está vendo: a cada poucos quadros lança um raio da câmera
 * até a peça; se outra peça estiver na frente (ou ela estiver de costas), o nome some suavemente.
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
        return [{ id, nome, centro: caixa.getCenter(new Vector3()), raio: caixa.getSize(new Vector3()).length() / 2 }]
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destaques, porId, focoVersao],
  )

  // Estado de visibilidade por item: ponto visível da peça (mundo) ou null se escondida
  const visivel = useRef<(Vector3 | null)[]>([])
  const quadro = useRef(0)
  const tmp = useMemo(() => new Vector3(), [])
  const direita = useMemo(() => new Vector3(), [])
  const cima = useMemo(() => new Vector3(), [])
  const amostra = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const { rotulos, linhas, pontos } = domRotulos
    for (let i = 0; i < VAGAS_ROTULOS; i++) {
      const usado = i < itens.length
      for (const el of [rotulos[i], linhas[i], pontos[i]]) if (el) el.style.display = usado ? '' : 'none'
    }
    if (!itens.length) return

    // 1) Visibilidade: procura um ponto da peça que a câmera enxergue diretamente
    if (quadro.current++ % QUADROS_ENTRE_TESTES === 0 || visivel.current.length !== itens.length) {
      direita.setFromMatrixColumn(camera.matrixWorld, 0)
      cima.setFromMatrixColumn(camera.matrixWorld, 1)
      visivel.current = itens.map((it) => {
        for (const [dx, dy] of AMOSTRAS) {
          amostra
            .copy(it.centro)
            .addScaledVector(direita, dx * it.raio)
            .addScaledVector(cima, dy * it.raio)
          const hit = estruturaVisivelEm(camera.position, amostra)
          if (hit?.id === it.id) return hit.ponto.clone()
        }
        return null
      })
    }

    // 2) Projeção na tela das âncoras visíveis
    const ancoras = itens.map((it, i) => {
      tmp.copy(visivel.current[i] ?? it.centro).project(camera)
      const naTela = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05
      return {
        x: ((tmp.x + 1) / 2) * largura,
        y: ((1 - tmp.y) / 2) * altura,
        visivel: !!visivel.current[i] && naTela,
      }
    })
    const vis = itens.map((_, i) => i).filter((i) => ancoras[i].visivel)

    // Esconde (com fade) os nomes de peças fora da visão
    for (let i = 0; i < itens.length; i++) {
      const opacidade = ancoras[i].visivel ? '1' : '0'
      for (const el of [rotulos[i], linhas[i], pontos[i]]) if (el) el.style.opacity = opacidade
    }
    if (!vis.length) return

    // Painel da aula/quiz/cartão ocupa a direita no desktop
    const { emAula, modoQuiz, selecionada } = useAtlasStore.getState()
    const limiteDireito = largura >= 640 && (emAula || modoQuiz || selecionada) ? largura - 410 : largura - MARGEM
    const limiteInferior = largura >= 640 ? altura - 110 : altura * 0.5

    // Tela estreita: marcadores numerados sobre as peças (a legenda fica no painel)
    const numerado = largura < 640
    for (let i = 0; i < itens.length; i++) {
      const el = rotulos[i]
      if (!el) continue
      const texto = numerado ? String(i + 1) : itens[i].nome
      if (el.textContent !== texto) el.textContent = texto
      el.dataset.modo = numerado ? 'numero' : 'nome'
      if (linhas[i]) linhas[i]!.style.display = numerado ? 'none' : ''
      if (pontos[i]) pontos[i]!.style.display = numerado ? 'none' : ''
      if (numerado) el.style.transform = `translate(${ancoras[i].x - 11}px, ${ancoras[i].y - 11}px)`
    }
    if (numerado) return

    // 3) Colunas: só com os nomes visíveis
    const meio = vis.reduce((s, i) => s + ancoras[i].x, 0) / vis.length
    const minX = Math.min(...vis.map((i) => ancoras[i].x))
    const maxX = Math.max(...vis.map((i) => ancoras[i].x))
    const ladoDe = (i: number): 'esq' | 'dir' => (vis.length === 1 || ancoras[i].x > meio ? 'dir' : 'esq')
    const larguras = itens.map((_, i) => rotulos[i]?.offsetWidth ?? 0)
    const xDe = (i: number) =>
      ladoDe(i) === 'esq'
        ? Math.max(MARGEM, minX - AFASTAMENTO - larguras[i])
        : Math.max(MARGEM, Math.min(limiteDireito - larguras[i], maxX + AFASTAMENTO))

    /** Empilha na ordem de altura, sem sobreposição; se passar do limite, sobe tudo. */
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

    let ys = new Map([
      ...empilhar(vis.filter((i) => ladoDe(i) === 'esq')),
      ...empilhar(vis.filter((i) => ladoDe(i) === 'dir')),
    ])
    // Se as colunas se encontram no meio, cada rótulo ganha uma linha própria
    const colide = vis.some((i) =>
      vis.some(
        (j) =>
          i < j &&
          ladoDe(i) !== ladoDe(j) &&
          Math.abs(ys.get(i)! - ys.get(j)!) < ALTURA &&
          xDe(i) < xDe(j) + larguras[j] &&
          xDe(j) < xDe(i) + larguras[i],
      ),
    )
    if (colide) ys = empilhar(vis)

    for (const i of vis) {
      const el = rotulos[i]
      const linha = linhas[i]
      const ponto = pontos[i]
      if (!el || !linha || !ponto) continue
      const a = ancoras[i]
      const x = xDe(i)
      const y = ys.get(i)!
      el.style.transform = `translate(${x}px, ${y - ALTURA / 2 + 3}px)`
      linha.setAttribute('x1', String(ladoDe(i) === 'esq' ? x + larguras[i] : x))
      linha.setAttribute('y1', String(y))
      linha.setAttribute('x2', String(a.x))
      linha.setAttribute('y2', String(a.y))
      ponto.setAttribute('cx', String(a.x))
      ponto.setAttribute('cy', String(a.y))
    }
  })

  return null
}
