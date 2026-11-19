import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { caixaDaEstrutura } from './CamadaBatched'
import { estruturaVisivelEm } from './corte'

/** Elementos DOM do rótulo da seleção (criados fora do canvas por <CamadaRotuloSelecao/>). */
const dom = { rotulo: null as HTMLDivElement | null, ponto: null as HTMLDivElement | null }

/** Camada HTML do rótulo da estrutura selecionada. Fica FORA do <Canvas>, cobrindo-o. */
export function CamadaRotuloSelecao() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <div
        ref={(el) => {
          dom.ponto = el
        }}
        className="absolute top-0 left-0 size-3 rounded-full border-2 border-white opacity-0 shadow transition-opacity duration-200"
      />
      <div
        ref={(el) => {
          dom.rotulo = el
        }}
        className="absolute top-0 left-0 rounded-lg bg-slate-950/85 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-white/15 backdrop-blur transition-opacity duration-200"
      />
    </div>
  )
}

const AMOSTRAS: [number, number][] = [
  [0, 0],
  [0.3, 0],
  [-0.3, 0],
  [0, 0.3],
  [0, -0.3],
  [0.22, 0.22],
  [-0.22, -0.22],
]
const QUADROS_ENTRE_TESTES = 3
const MARGEM = 12

/**
 * Projetor do rótulo da estrutura selecionada (dentro do <Canvas>). O nome só aparece enquanto a
 * peça está à vista: se ao girar ela ficar atrás de outra (ex.: corpo cavernoso visto por trás), o
 * nome some. O rótulo também troca de lado para nunca sair da tela.
 */
export function ProjetorSelecao() {
  const { porId, sistemaPorId } = useCatalogo()
  const id = useAtlasStore((s) => s.selecionada)
  const ponto = useAtlasStore((s) => s.pontoSelecao)
  const escondido = useAtlasStore((s) => s.modoQuiz && !s.quizRevelado)
  // Recalcula quando a câmera refaz o foco (ex.: a camada da peça terminou de carregar)
  const focoVersao = useAtlasStore((s) => s.focoVersao)
  const camera = useThree((s) => s.camera)
  const { width: largura, height: altura } = useThree((s) => s.size)

  const alvo = useMemo(() => {
    if (!id) return null
    const caixa = caixaDaEstrutura(id)
    if (!caixa && !ponto) return null
    return {
      ponto: ponto ? new Vector3(...ponto) : null,
      centro: caixa ? caixa.getCenter(new Vector3()) : new Vector3(...ponto!),
      raio: caixa ? caixa.getSize(new Vector3()).length() / 2 : 0.02,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ponto, focoVersao])

  const estrutura = id ? porId.get(id) : undefined
  const texto = escondido ? '?' : (estrutura?.nome ?? '')
  const cor = estrutura ? (sistemaPorId.get(estrutura.sistema)?.cor ?? '#38bdf8') : '#38bdf8'

  const visivel = useRef<Vector3 | null>(null)
  const quadro = useRef(0)
  const tmp = useMemo(() => new Vector3(), [])
  const direita = useMemo(() => new Vector3(), [])
  const cima = useMemo(() => new Vector3(), [])
  const amostra = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const { rotulo, ponto: marcador } = dom
    if (!rotulo || !marcador) return
    if (!alvo || !id) {
      rotulo.style.opacity = '0'
      marcador.style.opacity = '0'
      return
    }
    if (rotulo.textContent !== texto) rotulo.textContent = texto
    marcador.style.backgroundColor = cor

    // Visibilidade: primeiro o ponto tocado; senão, pontos ao redor do centro da peça
    if (quadro.current++ % QUADROS_ENTRE_TESTES === 0) {
      visivel.current = null
      const candidatos: Vector3[] = []
      if (alvo.ponto) candidatos.push(alvo.ponto)
      direita.setFromMatrixColumn(camera.matrixWorld, 0)
      cima.setFromMatrixColumn(camera.matrixWorld, 1)
      for (const [dx, dy] of AMOSTRAS)
        candidatos.push(
          amostra
            .copy(alvo.centro)
            .addScaledVector(direita, dx * alvo.raio)
            .addScaledVector(cima, dy * alvo.raio)
            .clone(),
        )
      for (const c of candidatos) {
        const hit = estruturaVisivelEm(camera.position, c)
        if (hit?.id === id) {
          visivel.current = hit.ponto.clone()
          break
        }
      }
    }

    const p = visivel.current
    tmp.copy(p ?? alvo.centro).project(camera)
    const naTela = !!p && tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02
    rotulo.style.opacity = naTela ? '1' : '0'
    marcador.style.opacity = naTela ? '1' : '0'
    if (!naTela) return

    const x = ((tmp.x + 1) / 2) * largura
    const y = ((1 - tmp.y) / 2) * altura
    marcador.style.transform = `translate(${x - 6}px, ${y - 6}px)`

    // Rótulo acima e à direita do ponto; troca de lado se não couber (no desktop, o cartão ocupa a direita)
    const w = rotulo.offsetWidth
    const h = rotulo.offsetHeight
    const limiteDireito = largura >= 640 ? largura - 410 : largura - MARGEM
    let rx = x + 12
    if (rx + w > limiteDireito) rx = x - 12 - w
    rx = Math.max(MARGEM, Math.min(rx, largura - MARGEM - w))
    let ry = y - 12 - h
    if (ry < 64) ry = y + 12
    rotulo.style.transform = `translate(${rx}px, ${ry}px)`
  })

  return null
}
