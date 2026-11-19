import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, MathUtils, Vector3, type PerspectiveCamera } from 'three'
import { useAtlasStore } from '../../store/useAtlasStore'
import { caixaDaEstrutura } from './CamadaBatched'

const { ACTION } = CameraControlsImpl

/** Caixa do corpo inteiro (metros, espaço do corpo). */
const CORPO = new Box3(new Vector3(-0.34, 0, -0.15), new Vector3(0.34, 1.72, 0.15))
/** Depois de o usuário soltar, a rotação "viva" do corpo volta após este tempo (ms). */
const PAUSA_APOS_INTERACAO = 6000

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
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const { width: largura, height: altura } = useThree((s) => s.size)
  const focoVersao = useAtlasStore((s) => s.focoVersao)
  const rotacaoAutomatica = useAtlasStore((s) => s.rotacaoAutomatica)
  const temSelecao = useAtlasStore((s) => s.selecionada !== null)
  const temPainel = useAtlasStore((s) => s.painel !== null)
  const pontoSelecao = useAtlasStore((s) => s.pontoSelecao)
  const temCorte = useAtlasStore((s) => s.corte !== null)
  const ultimaInteracao = useRef(-Infinity)
  /** Distância de destino do último voo (o reenquadramento deve usá-la, não a distância atual). */
  const ultimoVoo = useRef({ distancia: 0, quando: -Infinity })

  // Gestos: arrastar = girar; pinça/scroll = zoom (em direção ao cursor); dois dedos/botão direito = mover
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
    if (pontoSelecao) void controles.current?.setOrbitPoint(...pontoSelecao)
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
    const pendente = (!!selecionada || !!regiaoFoco || !!focoIds?.length) && !caixa && !isoladas
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
    const { dx, dy } = deslocamento(camera, largura, altura, distancia, m)
    ultimoVoo.current = { distancia, quando: performance.now() }
    const centro = alvo.getCenter(new Vector3())

    // Direção de visão: corpo todo de frente; numa peça, de frente (ou de trás, se for posterior),
    // puxando para o lado em que ela está
    const { vista } = useAtlasStore.getState()
    const direcao = vista && !caixa ? new Vector3(...vista) : new Vector3(0, 0.12, 1)
    if (caixa) {
      const posterior = centro.z < -0.04
      direcao.set(Math.max(-1, Math.min(1, centro.x / 0.15)) * 0.7, 0.15, posterior ? -1 : 1)
    }
    direcao.normalize().multiplyScalar(distancia)

    void c.setFocalOffset(dx, dy, 0, true)
    void c.setLookAt(
      centro.x + direcao.x,
      centro.y + direcao.y,
      centro.z + direcao.z,
      centro.x,
      centro.y,
      centro.z,
      true,
    )
  }, [focoVersao, camera, largura, altura])

  // Reenquadra quando o cartão ou um painel abre/fecha (sem mudar a distância)
  useEffect(() => {
    const c = controles.current
    if (!c) return
    const { dx, dy } = deslocamento(
      camera,
      largura,
      altura,
      // durante um voo recém-iniciado, a distância atual ainda é a antiga
      performance.now() - ultimoVoo.current.quando < 1500 ? ultimoVoo.current.distancia : c.distance,
      margens(largura, altura, temSelecao, temPainel),
    )
    void c.setFocalOffset(dx, dy, 0, true)
  }, [temSelecao, temPainel, camera, largura, altura])

  useFrame((_, delta) => {
    const c = controles.current
    if (!c) return
    const ocioso = !temSelecao && !temCorte && performance.now() - ultimaInteracao.current > PAUSA_APOS_INTERACAO
    if (rotacaoAutomatica || ocioso) void c.rotate(delta * 0.22, 0, true)
  })

  return (
    <CameraControls
      ref={controles}
      makeDefault
      onStart={() => {
        ultimaInteracao.current = Infinity
        useAtlasStore.getState().setHover(null)
      }}
      onEnd={() => (ultimaInteracao.current = performance.now())}
    />
  )
}
