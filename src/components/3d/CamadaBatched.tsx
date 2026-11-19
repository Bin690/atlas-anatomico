import { useGLTF } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BatchedMesh,
  Box3,
  Color,
  DoubleSide,
  FrontSide,
  Matrix4,
  MeshStandardMaterial,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from 'three'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Sistema } from '../../types/atlas'
import { atualizarPlano, camadasMontadas, intersecaoReal, PLANO } from './corte'

const COR_SELECAO = new Color('#38bdf8')
const COR_HOVER = new Color('#ffffff')

interface InfoCamada {
  malha: BatchedMesh
  /** id da estrutura de cada instância */
  ids: string[]
  /** instância de cada id */
  indice: Map<string, number>
  geometria: number[]
  corBase: Color[]
}

/** Registro global: id da estrutura -> camada/instância (para foco da câmera e rótulos). */
const registro = new Map<string, { info: InfoCamada; instancia: number }>()

/** Caixa da estrutura no mundo (ou null se a camada dela não estiver carregada). */
export function caixaDaEstrutura(id: string): Box3 | null {
  const r = registro.get(id)
  if (!r) return null
  const { info, instancia } = r
  const caixa = new Box3()
  info.malha.getBoundingBoxAt(info.geometria[instancia], caixa)
  const m = new Matrix4()
  info.malha.getMatrixAt(instancia, m)
  return caixa.applyMatrix4(m).applyMatrix4(info.malha.matrixWorld)
}

/**
 * "Pele de vidro": material padrão (compatível com BatchedMesh) com transparência que
 * aumenta nas bordas (fresnel), deixando ver o que está dentro do corpo.
 */
function materialVidro() {
  const m = new MeshStandardMaterial({ roughness: 0.5, metalness: 0, transparent: true, depthWrite: false })
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float fresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
       diffuseColor.a = 0.06 + fresnel * 0.55;
       #include <opaque_fragment>`,
    )
  }
  return m
}

/**
 * Material dos tecidos. Quando há corte, as faces internas (de trás) aparecem com a cor do
 * tecido levemente escurecida: como os modelos são cascas, isso dá a ilusão de um corte maciço.
 */
function materialTecido() {
  const m = new MeshStandardMaterial({ roughness: 0.55, metalness: 0 })
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `if (!gl_FrontFacing) outgoingLight = diffuseColor.rgb * 0.62;
       #include <opaque_fragment>`,
    )
  }
  return m
}

/** Converte a cena do .glb (uma mesh por estrutura) em um único BatchedMesh. */
function construir(cena: Object3D, estilo?: Sistema['estilo']): InfoCamada {
  cena.updateMatrixWorld(true)
  const meshes: Mesh[] = []
  cena.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh)
  })
  let vertices = 0
  let indices = 0
  for (const m of meshes) {
    vertices += m.geometry.attributes.position.count
    indices += m.geometry.index?.count ?? 0
  }
  const material = estilo === 'vidro' ? materialVidro() : materialTecido()
  const malha = new BatchedMesh(meshes.length, vertices, indices, material)
  if (estilo === 'vidro') malha.renderOrder = 10 // depois das demais camadas
  malha.perObjectFrustumCulled = true
  const ids: string[] = []
  const geometria: number[] = []
  const corBase: Color[] = []
  const indice = new Map<string, number>()
  for (const m of meshes) {
    const g = malha.addGeometry(m.geometry as BufferGeometry)
    const i = malha.addInstance(g)
    malha.setMatrixAt(i, m.matrixWorld)
    const cor = ((m.material as MeshStandardMaterial).color ?? new Color('#cccccc')).clone()
    malha.setColorAt(i, cor)
    ids[i] = m.name
    geometria[i] = g
    corBase[i] = cor
    indice.set(m.name, i)
  }
  return { malha, ids, indice, geometria, corBase }
}

interface CamadaProps {
  sistema: Sistema
  visivel: boolean
  /** Translúcida (raio-X ou camada externa sobre a seleção). */
  translucida: boolean
}

function CamadaBatchedBase({ sistema, visivel, translucida }: CamadaProps) {
  const { scene } = useGLTF(sistema.modelo)
  const info = useMemo(() => construir(scene, sistema.estilo), [scene, sistema.estilo])
  const { malha, ids, indice, corBase } = info

  const selecionada = useAtlasStore((s) => s.selecionada)
  const hover = useAtlasStore((s) => s.hover)
  const ocultas = useAtlasStore((s) => s.ocultas)
  const isoladas = useAtlasStore((s) => s.isoladas)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const setHover = useAtlasStore((s) => s.setHover)

  // Registro global (para foco e rótulos)
  useLayoutEffect(() => {
    const { selecionada: sel, focoPendente, focar } = useAtlasStore.getState()
    if (focoPendente && sel && indice.has(sel)) requestAnimationFrame(focar)
    ids.forEach((id, instancia) => registro.set(id, { info, instancia }))
    camadasMontadas.add(info.malha)
    return () => {
      ids.forEach((id) => registro.delete(id))
      camadasMontadas.delete(info.malha)
    }
  }, [info, ids, indice])

  // Sem dispose() ao desmontar: as camadas ficam carregadas durante todo o uso, e no StrictMode
  // (dev) a desmontagem simulada descartaria a malha ainda em uso, quebrando a renderização.

  // Camadas não interativas (pele) não capturam toques, para não bloquear o que está dentro
  useEffect(() => {
    if (sistema.interativo === false) {
      malha.raycast = () => {}
      malha.userData.naoInterativo = true
    }
  }, [malha, sistema.interativo])

  // Visibilidade por estrutura (ocultar / isolar)
  useEffect(() => {
    ids.forEach((id, i) => malha.setVisibleAt(i, !ocultas.has(id) && (!isoladas || isoladas.has(id))))
  }, [malha, ids, ocultas, isoladas])

  // Cores: atualiza só as instâncias que mudaram de estado
  const anteriores = useRef<string[]>([])
  useEffect(() => {
    const tmp = new Color()
    for (const id of anteriores.current) {
      const i = indice.get(id)
      if (i !== undefined) malha.setColorAt(i, corBase[i])
    }
    const marcar = (id: string | null, cor: Color, mistura: number) => {
      const i = id ? indice.get(id) : undefined
      if (i === undefined) return
      malha.setColorAt(i, tmp.copy(corBase[i]).lerp(cor, mistura))
    }
    marcar(hover, COR_HOVER, 0.35)
    marcar(selecionada, COR_SELECAO, 0.6)
    anteriores.current = [hover, selecionada].filter((x): x is string => !!x)
  }, [malha, indice, corBase, hover, selecionada])

  // Raio-X e corte anatômico
  const corte = useAtlasStore((s) => s.corte)
  useEffect(() => {
    atualizarPlano(corte)
    const m = malha.material as MeshStandardMaterial
    const comCorte = !!corte
    if (sistema.estilo !== 'vidro') {
      m.transparent = translucida
      m.opacity = translucida ? 0.18 : 1
      m.depthWrite = !translucida
      m.side = translucida || comCorte ? DoubleSide : FrontSide
    }
    const planos = comCorte ? [PLANO] : []
    if (m.clippingPlanes?.length !== planos.length) {
      m.clippingPlanes = planos
      m.needsUpdate = true
    }
    m.needsUpdate = true
  }, [malha, translucida, sistema.estilo, corte])

  /** Estrutura deste BatchedMesh sob o ponteiro, considerando corte e peças ocultas (ou null). */
  const idDoEvento = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hit = intersecaoReal(e.intersections, e.ray)
    if (!hit || hit.object !== malha || hit.batchId === undefined) return null
    return { id: ids[hit.batchId] ?? null, ponto: hit.point }
  }

  return (
    <primitive
      object={malha}
      visible={visivel}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (sistema.interativo === false || useAtlasStore.getState().modoQuiz) return
        if (e.pointerType !== 'mouse') return
        const alvo = idDoEvento(e)
        if (!alvo) return // outra camada (ou nada) é a primeira de verdade
        e.stopPropagation()
        setHover(alvo.id)
      }}
      onPointerOut={() => setHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6 || useAtlasStore.getState().modoQuiz) return // arrasto, ou quiz em andamento
        const alvo = idDoEvento(e)
        if (!alvo?.id) return
        e.stopPropagation()
        selecionar(alvo.id, { ponto: alvo.ponto.toArray() })
      }}
    />
  )
}

export const CamadaBatched = memo(CamadaBatchedBase)
