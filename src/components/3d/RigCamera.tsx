import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, MathUtils, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { useAtlasStore } from '../../store/useAtlasStore'
import { caixaDaEstrutura } from './CamadaBatched'
import { camadasMontadas, primeiraIntersecao } from './corte'

const { ACTION } = CameraControlsImpl

/** Caixa do corpo inteiro (metros, espaço do corpo). */
const CORPO = new Box3(new Vector3(-0.34, 0, -0.15), new Vector3(0.34, 1.72, 0.15))
/** Depois de o usuário soltar, a rotação "viva" do corpo volta após este tempo (ms). */
const PAUSA_APOS_INTERACAO = 6000

/** Controles da câmera em uso (para ler/aplicar a vista ao partilhar um link). */
let controlesAtivos: CameraControlsImpl | null = null
/**
 * Deslocamento da vista para o modelo ficar na área livre (ao lado do cartão ou do painel), como fração
 * da distância da câmara: é reaplicado a cada frame com a distância atual, para acompanhar o zoom (em
 * metros fixos, um deslocamento calculado longe empurrava a peça para fora do ecrã depois de um zoom).
 */
const deslocamentoVista = { alvo: { x: 0, y: 0 }, atual: { x: 0, y: 0 } }
/**
 * Compensação (metros) que mantém a imagem parada quando o centro de rotação passa para a peça tocada
 * (setOrbitPoint). Soma-se ao deslocamento da vista; cada voo da câmara recentra e zera-a.
 */
const compensacaoOrbita = new Vector3()
/**
 * Depois de um voo da câmara, a roda fica bloqueada até haver uma pausa: a inércia do trackpad / Magic
 * Mouse continua a enviar eventos de zoom 1–2 s depois do gesto e anulava o voo (ex.: "Corpo todo").
 */
const bloqueioRoda = { ativo: false, ultimo: 0, desde: 0 }
const PAUSA_FIM_INERCIA = 200
const BLOQUEIO_MAXIMO = 2500

/** Depois de aplicar uma vista partilhada, o corpo não gira sozinho até o usuário mexer. */
let vistaFixada = false

/** Posição e alvo da câmera: [px, py, pz, tx, ty, tz] (ou null se o 3D ainda não montou). */
export function lerCamera(): number[] | null {
  const c = controlesAtivos
  if (!c) return null
  return [...c.getPosition(new Vector3()).toArray(), ...c.getTarget(new Vector3()).toArray()]
}

const raioVista = new Raycaster()
const ndc = new Vector2()
/**
 * O que está à vista: lança uma grelha de raios a partir da câmara (5×5, por toda a imagem) e devolve
 * os pontos atingidos nas peças visíveis (a pele de vidro não conta) e a distância de cada um à câmara.
 */
export function pontosAVista(lado = 5): { ponto: Vector3; distancia: number }[] {
  const c = controlesAtivos
  const camera = c?.camera
  if (!camera) return []
  const visiveis = [...camadasMontadas].filter((o) => o.visible)
  const pontos: { ponto: Vector3; distancia: number }[] = []
  for (let i = 0; i < lado; i++)
    for (let j = 0; j < lado; j++) {
      // Margem de 15% nas bordas: o que interessa está no meio da imagem
      ndc.set(-0.7 + (1.4 * i) / (lado - 1), -0.7 + (1.4 * j) / (lado - 1))
      raioVista.setFromCamera(ndc, camera)
      const hit = primeiraIntersecao(raioVista.intersectObjects(visiveis, false), true)
      if (hit) pontos.push({ ponto: hit.point.clone(), distancia: hit.distance })
    }
  return pontos
}

/** Leva a câmera a uma vista salva (ex.: aberta por um link partilhado). */
export function aplicarCamera(v: number[]) {
  const c = controlesAtivos
  if (!c || v.length !== 6 || v.some((n) => !Number.isFinite(n))) return
  vistaFixada = true
  deslocamentoVista.alvo = { x: 0, y: 0 }
  deslocamentoVista.atual = { x: 0, y: 0 }
  compensacaoOrbita.set(0, 0, 0)
  void c.setLookAt(v[0], v[1], v[2], v[3], v[4], v[5], true)
}

interface Margens {
  topo: number
  base: number
  esquerda: number
  direita: number
}

/** Áreas da tela (px) cobertas pela interface, para o modelo ficar na área livre. */
function margens(largura: number, altura: number, temCartao: boolean, temPainel: boolean): Margens {
  const { modoQuiz, emAula } = useAtlasStore.getState()
  const quiz = modoQuiz || emAula
  if (largura < 640) {
    let folha = temCartao || temPainel ? Math.min(altura * 0.42, 300) : 0
    if (modoQuiz) folha = altura * 0.58
    else if (emAula) folha = altura * 0.45
    return { topo: 64, base: 96 + folha, esquerda: 0, direita: 0 }
  }
  return { topo: 64, base: 100, esquerda: temPainel ? 372 : 0, direita: temCartao || quiz ? 400 : 0 }
}

/** Converte margens em deslocamento da vista (mundo) a uma dada distância. */
function deslocamento(camera: PerspectiveCamera, largura: number, altura: number, distancia: number, m: Margens) {
  const tanV = Math.tan(MathUtils.degToRad(camera.fov) / 2)
  const tanH = tanV * (largura / altura)
  return {
    dx: ((m.direita - m.esquerda) / 2) * ((2 * distancia * tanH) / largura),
    dy: -((m.topo - m.base) / 2) * ((2 * distancia * tanV) / altura),
  }
}

/**
 * Aproxima o que se enquadra do centro do ecrã, sem o deixar passar para baixo do cartão/painel: centrado
 * na área livre ficava colado ao lado oposto (uma falange a 28% da largura). Avança até 30% da margem; uma
 * peça que já enche a área livre (um osso comprido) avança menos, e pode não avançar nada.
 */
function aproximarDoCentro(
  camera: PerspectiveCamera,
  largura: number,
  caixa: Box3,
  distancia: number,
  m: Margens,
): Margens {
  if (m.direita === 0 && m.esquerda === 0) return m
  const t = caixa.getSize(new Vector3())
  const tanH = Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.aspect
  const meiaLargura = (Math.max(t.x, t.z) / 2) * 1.12
  const meiaPx = (meiaLargura / (distancia * tanH)) * (largura / 2)
  const centroLivre = (largura - m.direita + m.esquerda) / 2
  const FOLGA = 12
  // Quanto cabe deslocar para o centro: até à beira do cartão (direita) ou do painel (esquerda)
  const cabeDireita = m.direita ? Math.max(0, largura - m.direita - FOLGA - (centroLivre + meiaPx)) : 0
  const cabeEsquerda = m.esquerda ? Math.max(0, centroLivre - meiaPx - (m.esquerda + FOLGA)) : 0
  const extraD = Math.min(m.direita * 0.3, cabeDireita)
  const extraE = Math.min(m.esquerda * 0.3, cabeEsquerda)
  return { ...m, direita: m.direita - 2 * extraD, esquerda: m.esquerda - 2 * extraE }
}

/** Distância para a caixa caber na área livre da tela. */
function distanciaPara(camera: PerspectiveCamera, largura: number, altura: number, caixa: Box3, m: Margens) {
  const t = caixa.getSize(new Vector3())
  const meiaLargura = (Math.max(t.x, t.z) / 2) * 1.12 // o modelo gira: usa a maior dimensão horizontal
  const meiaAltura = (t.y / 2) * 1.08
  const tanV = Math.tan(MathUtils.degToRad(camera.fov) / 2)
  const tanH = tanV * (largura / altura)
  const livreV = Math.max(0.3, (altura - m.topo - m.base) / altura)
  const livreH = Math.max(0.3, (largura - m.esquerda - m.direita) / largura)
  return Math.max(meiaAltura / (tanV * livreV), meiaLargura / (tanH * livreH), 0.05)
}

export function RigCamera() {
  const controles = useRef<CameraControlsImpl>(null)
  useEffect(() => {
    controlesAtivos = controles.current
    return () => {
      controlesAtivos = null
    }
  }, [])
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const { width: largura, height: altura } = useThree((s) => s.size)
  const focoVersao = useAtlasStore((s) => s.focoVersao)
  const rotacaoAutomatica = useAtlasStore((s) => s.rotacaoAutomatica)
  const temSelecao = useAtlasStore((s) => s.selecionada !== null)
  const temPainel = useAtlasStore((s) => s.painel !== null)
  const pontoSelecao = useAtlasStore((s) => s.pontoSelecao)
  const temCorte = useAtlasStore((s) => s.corte !== null)
  // Nas aulas cada passo escolhe a vista: girar sozinho desfaria o enquadramento
  const emAula = useAtlasStore((s) => s.emAula)
  const ultimaInteracao = useRef(-Infinity)
  /** Instante do último voo da câmara (o reenquadramento do cartão não o desfaz logo a seguir). */
  const instanteVoo = useRef(-Infinity)

  // Gestos: arrastar = girar; pinça/scroll = zoom (em direção ao cursor); dois dedos/botão direito = mover.
  // Com o modo "Mover" (ou Shift pressionado), arrastar com um dedo / botão esquerdo também desloca a vista.
  const modoMover = useAtlasStore((s) => s.modoMover)
  useEffect(() => {
    const c = controles.current
    if (!c) return
    const aplicar = (mover: boolean) => {
      c.mouseButtons.left = mover ? ACTION.TRUCK : ACTION.ROTATE
      c.touches.one = mover ? ACTION.TOUCH_TRUCK : ACTION.TOUCH_ROTATE
    }
    aplicar(modoMover)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Shift') aplicar(e.type === 'keydown' || modoMover)
    }
    window.addEventListener('keydown', tecla)
    window.addEventListener('keyup', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('keyup', tecla)
    }
  }, [modoMover])

  // Setas do teclado deslocam a vista (exceto nas aulas, onde as setas trocam de passo)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const c = controles.current
      const alvo = e.target as HTMLElement | null
      if (!c || useAtlasStore.getState().emAula || alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA') return
      const passo = c.distance * 0.06
      const delta = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[
        e.key
      ]
      if (!delta) return
      e.preventDefault()
      ultimaInteracao.current = performance.now()
      void c.truck(delta[0], -delta[1], true)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  useEffect(() => {
    const c = controles.current
    if (!c) return
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.DOLLY
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = ACTION.NONE
    c.dollyToCursor = true
    c.minDistance = 0.03
    c.maxDistance = 8
    c.smoothTime = 0.45
    c.draggingSmoothTime = 0.1
  }, [])

  // Ao tocar numa peça, ela vira o centro de rotação (sem mover a câmera)
  useEffect(() => {
    const c = controles.current
    if (!c || !pontoSelecao) return
    void c.setOrbitPoint(...pontoSelecao)
    // O que a biblioteca pôs no deslocamento focal, menos a parte que é do cartão/painel
    const focal = c.getFocalOffset(new Vector3())
    compensacaoOrbita.set(
      focal.x - deslocamentoVista.atual.x * c.distance,
      focal.y - deslocamentoVista.atual.y * c.distance,
      focal.z,
    )
  }, [pontoSelecao])

  // Voo da câmera: "Focar", busca, isolar ou "corpo todo"
  useEffect(() => {
    const c = controles.current
    if (!c) return
    const { selecionada, isoladas, painel } = useAtlasStore.getState()
    const { regiaoFoco } = useAtlasStore.getState()
    let caixa: Box3 | null = selecionada ? caixaDaEstrutura(selecionada) : null
    // Quiz "Encontre": enquadra uma região ampla (≥ 45 cm) ao redor da resposta, sem entregá-la
    if (!caixa && regiaoFoco) {
      const r = caixaDaEstrutura(regiaoFoco)
      if (r) {
        const t = r.getSize(new Vector3())
        caixa = r.expandByVector(
          new Vector3(Math.max(0, 0.45 - t.x), Math.max(0, 0.45 - t.y), Math.max(0, 0.45 - t.z)).multiplyScalar(0.5),
        )
      }
    }
    if (!caixa && isoladas && !useAtlasStore.getState().focoIds?.length) {
      caixa = new Box3()
      for (const id of isoladas) {
        const b = caixaDaEstrutura(id)
        if (b) caixa.union(b)
      }
      if (caixa.isEmpty()) caixa = null
    }
    // Camada ainda carregando: a camada pede o foco de novo quando estiver pronta
    // Aula guiada: enquadra o conjunto de estruturas do passo
    const { focoIds } = useAtlasStore.getState()
    if (!caixa && focoIds?.length) {
      const uniao = new Box3()
      for (const id of focoIds) {
        const b = caixaDaEstrutura(id)
        if (b) uniao.union(b)
      }
      if (!uniao.isEmpty()) caixa = uniao
    }
    // Algo foi pedido mas a camada ainda está carregando: a camada pede o foco de novo quando estiver pronta
    const pendente = (!!selecionada || !!regiaoFoco || !!focoIds?.length || !!isoladas) && !caixa
    useAtlasStore.setState({ focoPendente: pendente })
    if (pendente) return
    // Corte axial visto de cima: enquadra só a fatia, não o corpo inteiro
    const { corte } = useAtlasStore.getState()
    let alvo = caixa ? caixa.clone() : CORPO
    if (!caixa && corte?.plano === 'axial') {
      const [y0, y1] = corte.inverter ? [corte.posicao, corte.posicao + 0.12] : [corte.posicao - 0.12, corte.posicao]
      // Na vista de cima, a "altura" da tela corresponde à profundidade (z): usa uma caixa equivalente
      alvo = new Box3(new Vector3(-0.34, y0, -0.17), new Vector3(0.34, y1, 0.17))
      alvo.setFromCenterAndSize(alvo.getCenter(new Vector3()), new Vector3(0.68, 0.5, 0.68))
    }
    // Peças pequenas (ossos do carpo, dentes…): enquadra pelo menos ~14 cm ao redor, para manter o contexto
    if (caixa) {
      const t = alvo.getSize(new Vector3())
      alvo.expandByVector(
        new Vector3(Math.max(0, 0.14 - t.x), Math.max(0, 0.14 - t.y), Math.max(0, 0.14 - t.z)).multiplyScalar(0.5),
      )
    }
    const m = margens(largura, altura, !!selecionada, painel !== null)
    const distancia = distanciaPara(camera, largura, altura, alvo, m)
    const { dx, dy } = deslocamento(
      camera,
      largura,
      altura,
      1,
      aproximarDoCentro(camera, largura, caixa ?? alvo, distancia, m),
    )
    instanteVoo.current = performance.now()
    const centro = alvo.getCenter(new Vector3())

    // Direção de visão: corpo todo de frente; numa peça, de frente (ou de trás, se for posterior),
    // puxando para o lado em que ela está
    const { vista } = useAtlasStore.getState()
    const direcao = vista ? new Vector3(...vista) : new Vector3(0, 0.12, 1)
    if (caixa && !vista) {
      const posterior = centro.z < -0.04
      direcao.set(Math.max(-1, Math.min(1, centro.x / 0.15)) * 0.7, 0.15, posterior ? -1 : 1)
    }
    direcao.normalize()

    deslocamentoVista.alvo = { x: dx, y: dy }
    compensacaoOrbita.set(0, 0, 0)
    const agora = performance.now()
    Object.assign(bloqueioRoda, { ativo: true, ultimo: agora, desde: agora })
    // Pelo caminho mais curto: a rotação em repouso acumula voltas no ângulo da câmara (ex.: 1080°), e
    // um setLookAt desfazia-as todas a girar. Normaliza e gira no máximo meia volta até à direção nova.
    c.normalizeRotations()
    const azimute = Math.atan2(direcao.x, direcao.z)
    const polar = Math.acos(MathUtils.clamp(direcao.y, -1, 1))
    const giro = MathUtils.euclideanModulo(azimute - c.azimuthAngle + Math.PI, Math.PI * 2) - Math.PI
    // Um voo conta como interação: a rotação em repouso só volta depois da pausa (senão o corpo
    // continuava a girar enquanto se posiciona)
    ultimaInteracao.current = performance.now()
    void c.setTarget(centro.x, centro.y, centro.z, true)
    void c.rotateTo(c.azimuthAngle + giro, polar, true)
    void c.dollyTo(distancia, true)
  }, [focoVersao, camera, largura, altura])

  // Reenquadra quando o cartão ou um painel abre/fecha (sem mudar a distância nem o alvo)
  useEffect(() => {
    const c = controles.current
    if (!c) return
    // Um voo recente já calculou o deslocamento (com a peça aproximada do centro): não o desfaz
    if (performance.now() - instanteVoo.current < 1500) return
    const { dx, dy } = deslocamento(camera, largura, altura, 1, margens(largura, altura, temSelecao, temPainel))
    deslocamentoVista.alvo = { x: dx, y: dy }
  }, [temSelecao, temPainel, camera, largura, altura])

  // Zoom com a roda do rato ou pinça também pausa a rotação em repouso (não passa por onStart/onEnd)
  const tela = useThree((s) => s.gl.domElement)
  useEffect(() => {
    // Na fase de captura do elemento pai: corre antes do listener da biblioteca, no próprio canvas
    const pai = tela.parentElement
    const roda = (e: WheelEvent) => {
      if (!bloqueioRoda.ativo) return
      // Hora em que o evento aconteceu (não a de o tratar: com o thread ocupado a renderizar, os eventos
      // chegam juntos ao handler)
      const agora = e.timeStamp
      if (agora - bloqueioRoda.ultimo > PAUSA_FIM_INERCIA || agora - bloqueioRoda.desde > BLOQUEIO_MAXIMO) {
        bloqueioRoda.ativo = false // gesto novo: deixa passar
        return
      }
      bloqueioRoda.ultimo = agora
      e.stopPropagation()
      e.preventDefault()
    }
    pai?.addEventListener('wheel', roda, { capture: true, passive: false })
    return () => pai?.removeEventListener('wheel', roda, { capture: true })
  }, [tela])
  useEffect(() => {
    const interagiu = () => (ultimaInteracao.current = performance.now())
    tela.addEventListener('wheel', interagiu, { passive: true })
    tela.addEventListener('touchmove', interagiu, { passive: true })
    return () => {
      tela.removeEventListener('wheel', interagiu)
      tela.removeEventListener('touchmove', interagiu)
    }
  }, [tela])

  const focalReal = useRef(new Vector3()).current
  useFrame((_, delta) => {
    const c = controles.current
    if (!c) return
    // Deslocamento da vista: anima até ao valor pedido e acompanha a distância atual da câmara
    const { alvo, atual } = deslocamentoVista
    const k = 1 - Math.exp(-delta * 7)
    atual.x += (alvo.x - atual.x) * k
    atual.y += (alvo.y - atual.y) * k
    const fx = compensacaoOrbita.x + atual.x * c.distance
    const fy = compensacaoOrbita.y + atual.y * c.distance
    const fz = compensacaoOrbita.z
    // Compara com o valor real (a biblioteca também mexe nele, ex.: setOrbitPoint)
    const real = c.getFocalOffset(focalReal)
    if (Math.abs(fx - real.x) > 1e-5 || Math.abs(fy - real.y) > 1e-5 || Math.abs(fz - real.z) > 1e-5)
      void c.setFocalOffset(fx, fy, fz, false)
    const ocioso =
      !temSelecao &&
      !temCorte &&
      !emAula &&
      !vistaFixada &&
      performance.now() - ultimaInteracao.current > PAUSA_APOS_INTERACAO
    if (rotacaoAutomatica || ocioso) void c.rotate(delta * 0.22, 0, true)
  })

  return (
    <CameraControls
      ref={controles}
      makeDefault
      onStart={() => {
        vistaFixada = false
        ultimaInteracao.current = Infinity
        useAtlasStore.getState().setHover(null)
      }}
      onEnd={() => (ultimaInteracao.current = performance.now())}
    />
  )
}
