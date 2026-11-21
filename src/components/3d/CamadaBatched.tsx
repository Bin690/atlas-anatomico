import { useGLTF } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BatchedMesh,
  Box3,
  BufferAttribute,
  Color,
  DoubleSide,
  FrontSide,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
  Vector4,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from 'three'
import { useCatalogo } from '../../data'
import { dizerNome } from '../../hooks/voz'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Sistema } from '../../types/atlas'
import { atualizarPlano, camadasMontadas, intersecaoReal, PLANO } from './corte'

const COR_SELECAO = new Color('#38bdf8')
const COR_HOVER = new Color('#ffffff')
const COR_DESTAQUE = new Color('#f59e0b')

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
 * Pontos da superfície da estrutura (vértices distribuídos ao longo da malha), em coordenadas do
 * mundo. Usados para testar se a peça está à vista: o centro da caixa pode cair fora de peças finas
 * e curvas (vasos, corpo cavernoso).
 */
export function pontosDaEstrutura(id: string, quantidade = 24): Vector3[] {
  const r = registro.get(id)
  if (!r) return []
  const { info, instancia } = r
  const faixa = info.malha.getGeometryRangeAt(info.geometria[instancia])
  if (!faixa) return []
  const posicao = info.malha.geometry.getAttribute('position')
  const m = new Matrix4()
  info.malha.getMatrixAt(instancia, m)
  m.premultiply(info.malha.matrixWorld)
  const passo = Math.max(1, Math.floor(faixa.vertexCount / quantidade))
  const pontos: Vector3[] = []
  for (let v = faixa.vertexStart; v < faixa.vertexStart + faixa.vertexCount; v += passo)
    pontos.push(new Vector3().fromBufferAttribute(posicao, v).applyMatrix4(m))
  return pontos
}

/**
 * "Pele de vidro": material padrão (compatível com BatchedMesh) com transparência que
 * aumenta nas bordas (fresnel), deixando ver o que está dentro do corpo.
 */
function materialVidro() {
  const m = new MeshStandardMaterial({ roughness: 0.5, metalness: 0, transparent: true, depthWrite: false })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float borda;\nvarying float vBorda;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBorda = borda;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBorda;')
      .replace(
        '#include <opaque_fragment>',
        `float fresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
       float vidro = 0.06 + fresnel * 0.55;
       // "Solidez" por peça vem no alfa da cor da instância (alfa 1 = vidro comum; menor = mais
       // sólida): mamas e vulva (pele com gordura) ficam com volume visível, deixando ver o que está
       // por dentro, e esbatem-se até ao vidro junto à borda do recorte (atributo "borda")
       #ifdef USE_COLOR_ALPHA
         float solidez = (1.0 - vColor.a) * smoothstep(0.0, 1.0, vBorda);
       #else
         float solidez = 0.0;
       #endif
       diffuseColor.a = mix(vidro, solidez > 0.99 ? 1.0 : 0.72, solidez);
       // Luz ambiente própria: a vulva fica virada para baixo, sem luz direta, e escurecia demais
       outgoingLight = mix(outgoingLight, diffuseColor.rgb * 0.8, 0.25 * solidez);
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

/** Largura (m) da faixa em que uma peça sólida da pele se esbate até ao vidro, junto à borda. */
const FAIXA_BORDA = 0.007

/** Distância (m) até à qual outra peça sólida pode cobrir a borda de uma peça. */
const COBERTURA = 0.008
/** Abaixo desta distância (m), o ponto é partilhado com a outra peça: é uma junção, não uma borda. */
const JUNCAO = 0.001

/**
 * Atributo "borda" (0 na borda aberta do recorte, 1 a partir da faixa de esbatimento para dentro) nas peças
 * sólidas da pele de vidro (vulva); 1 nas demais. Borda = arestas usadas por um só triângulo da
 * peça. Onde outra peça sólida passa POR CIMA da borda (a vulva sob o monte do púbis), ela não se
 * esbate: fica escondida. Onde a peça é que está por cima (o monte sobre a vulva), esbate-se e
 * revela o tecido de baixo.
 */
function marcarBordas(meshes: Mesh[], solidas: Set<string>, esbatimento: Record<string, number>) {
  const chave = (v: Vector3) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`
  const pecas = meshes
    .filter((m) => solidas.has(m.name))
    .map((m) => {
      const pos = m.geometry.attributes.position
      const pontos = Array.from({ length: pos.count }, (_, v) =>
        new Vector3().fromBufferAttribute(pos, v).applyMatrix4(m.matrixWorld),
      )
      const chaves = pontos.map(chave)
      const arestas = new Map<string, number>()
      const idx = m.geometry.index
      const n = idx ? idx.count : pos.count
      const vert = (k: number) => (idx ? idx.getX(k) : k)
      for (let t = 0; t < n; t += 3)
        for (let k = 0; k < 3; k++) {
          const a = chaves[vert(t + k)]
          const b = chaves[vert(t + ((k + 1) % 3))]
          if (a === b) continue
          const e = a < b ? `${a}|${b}` : `${b}|${a}`
          arestas.set(e, (arestas.get(e) ?? 0) + 1)
        }
      const naBorda = new Set<string>()
      for (const [e, c] of arestas) if (c === 1) for (const x of e.split('|')) naBorda.add(x)
      const normal = m.geometry.attributes.normal
      const borda = pontos.flatMap((p, v) =>
        naBorda.has(chaves[v])
          ? [{ p, n: new Vector3().fromBufferAttribute(normal, v).transformDirection(m.matrixWorld) }]
          : [],
      )
      return { m, pontos, borda }
    })
  /** Outra peça sólida passa por cima deste ponto da borda (do lado para onde a normal aponta)? */
  const coberto = (p: Vector3, n: Vector3, outra: Vector3[]) => {
    let melhor: Vector3 | null = null
    let dMin = COBERTURA * COBERTURA
    for (const q of outra) {
      const d = p.distanceToSquared(q)
      if (d < dMin) {
        dMin = d
        melhor = q
      }
    }
    if (!melhor) return false
    // Vértice partilhado (junção entre peças da mesma superfície) ou outra peça por cima
    return dMin < JUNCAO * JUNCAO || melhor.clone().sub(p).dot(n) > 0
  }
  const pontosBorda = pecas.flatMap(({ m, borda }) =>
    borda.filter(({ p, n }) => !pecas.some((o) => o.m !== m && coberto(p, n, o.pontos))).map(({ p }) => p),
  )

  for (const m of meshes) {
    const borda = new Float32Array(m.geometry.attributes.position.count).fill(1)
    const peca = pecas.find((x) => x.m === m)
    if (peca && pontosBorda.length) {
      const dist = peca.pontos.map((w) => {
        let min = Infinity
        for (const b of pontosBorda) min = Math.min(min, w.distanceToSquared(b))
        return Math.sqrt(min)
      })
      dist.forEach((d, v) => (borda[v] = Math.min(1, d / FAIXA_BORDA)))
      // Peças largas (monte do púbis): sólidas junto às outras peças sólidas (a vulva) e esbatendo-se
      // até ao vidro à medida que se afastam delas
      const faixa = esbatimento[m.name]
      if (faixa) {
        const outras = pecas.filter((o) => o.m !== m).flatMap((o) => o.pontos)
        peca.pontos.forEach((w, v) => {
          let min = Infinity
          for (const q of outras) min = Math.min(min, w.distanceToSquared(q))
          const perto = 1 - Math.min(1, Math.max(0, (Math.sqrt(min) - 0.004) / faixa))
          borda[v] = Math.min(borda[v], perto)
        })
      }
    }
    m.geometry.setAttribute('borda', new BufferAttribute(borda, 1))
  }
}

/** Converte a cena do .glb (uma mesh por estrutura) em um único BatchedMesh. */
function construir(
  cena: Object3D,
  estilo?: Sistema['estilo'],
  solidas: string[] = [],
  esbatimento: Record<string, number> = {},
): InfoCamada {
  cena.updateMatrixWorld(true)
  const meshes: Mesh[] = []
  cena.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh)
  })
  let vertices = 0
  let indices = 0
  for (const m of meshes) {
    // Modelos leves vêm sem normais (arquivo menor): calcula aqui
    if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals()
    vertices += m.geometry.attributes.position.count
    indices += m.geometry.index?.count ?? 0
  }
  if (estilo === 'vidro') marcarBordas(meshes, new Set(solidas), esbatimento)
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
  // Permite descobrir a estrutura de uma interseção de raio (rótulos, oclusão)
  malha.userData.ids = ids
  return { malha, ids, indice, geometria, corBase }
}

interface CamadaProps {
  sistema: Sistema
  /** .glb a usar (versão leve ou detalhada). */
  url: string
  visivel: boolean
  /** Translúcida (raio-X ou camada externa sobre a seleção). */
  translucida: boolean
}

function CamadaBatchedBase({ sistema, url, visivel, translucida }: CamadaProps) {
  const { scene } = useGLTF(url)
  const solidas = useMemo(
    () =>
      Object.entries(sistema.solidez ?? {})
        .filter(([, v]) => v > 0)
        .map(([id]) => id),
    [sistema.solidez],
  )
  const info = useMemo(
    () => construir(scene, sistema.estilo, solidas, sistema.esbatimento),
    [scene, sistema.estilo, solidas, sistema.esbatimento],
  )
  const { malha, ids, indice, corBase } = info

  const selecionada = useAtlasStore((s) => s.selecionada)
  const hover = useAtlasStore((s) => s.hover)
  const ocultas = useAtlasStore((s) => s.ocultas)
  const isoladas = useAtlasStore((s) => s.isoladas)
  const destaques = useAtlasStore((s) => s.destaques)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const setHover = useAtlasStore((s) => s.setHover)
  // Camadas comuns aos dois corpos (ex.: urinário) podem ter peças de um só corpo (uretra masculina)
  const { doOutroCorpo, porId } = useCatalogo()

  // Registro global (para foco e rótulos)
  useLayoutEffect(() => {
    const { selecionada: sel, regiaoFoco, focoIds, focoPendente, focar } = useAtlasStore.getState()
    const { isoladas: iso } = useAtlasStore.getState()
    const pendentes = [sel, regiaoFoco, ...(focoIds ?? []), ...(iso ?? [])].filter((x): x is string => !!x)
    if (focoPendente && pendentes.some((id) => indice.has(id))) requestAnimationFrame(focar)
    ids.forEach((id, instancia) => registro.set(id, { info, instancia }))
    camadasMontadas.add(info.malha)
    return () => {
      ids.forEach((id) => registro.delete(id))
      camadasMontadas.delete(info.malha)
    }
  }, [info, ids, indice])

  // Sem dispose() ao desmontar: as camadas ficam carregadas durante todo o uso, e no StrictMode
  // (dev) a desmontagem simulada descartaria a malha ainda em uso, quebrando a renderização.

  // Camadas não interativas (pele) não capturam toques, para não bloquear o que está dentro;
  // as peças "tocáveis" dela (vulva na pele feminina) continuam respondendo
  useEffect(() => {
    malha.userData.vidro = sistema.estilo === 'vidro'
    // Peças semi-opacas que envolvem outras: o toque atravessa-as até ao que está dentro (corte.ts)
    malha.userData.envoltorios = new Set(Object.keys(sistema.solidez ?? {}))
    // Na pele de vidro, algumas peças (mamas, vulva) ficam semi-opacas: alfa da instância = 1 − solidez
    if (sistema.estilo === 'vidro')
      for (const [id, solidez] of Object.entries(sistema.solidez ?? {})) {
        const i = indice.get(id)
        if (i === undefined) continue
        const c = corBase[i]
        malha.setColorAt(i, new Vector4(c.r, c.g, c.b, 1 - solidez))
      }
    if (sistema.interativo !== false) return
    const tocaveis = new Set(sistema.tocaveis)
    if (!tocaveis.size) {
      malha.raycast = () => {}
      malha.userData.naoInterativo = true
      return
    }
    malha.raycast = (raycaster, intersecoes) => {
      const antes = intersecoes.length
      BatchedMesh.prototype.raycast.call(malha, raycaster, intersecoes)
      for (let k = intersecoes.length - 1; k >= antes; k--) {
        const batchId = intersecoes[k].batchId
        if (batchId === undefined || !tocaveis.has(ids[batchId])) intersecoes.splice(k, 1)
      }
    }
  }, [malha, ids, indice, corBase, sistema.interativo, sistema.tocaveis, sistema.solidez, sistema.estilo])
  const naoTocavel = sistema.interativo === false && !sistema.tocaveis?.length

  // Visibilidade por estrutura (ocultar / isolar / outro corpo / camada dona)
  const camadas = useAtlasStore((s) => s.camadas)
  useEffect(() => {
    ids.forEach((id, i) =>
      malha.setVisibleAt(
        i,
        !doOutroCorpo.has(id) &&
          !ocultas.has(id) &&
          (!isoladas || isoladas.has(id)) &&
          // Peça emprestada a outra camada (gordura da mama): segue essa camada; as demais, esta
          camadas.has(sistema.emprestadas?.[id] ?? sistema.id),
      ),
    )
  }, [malha, ids, ocultas, isoladas, doOutroCorpo, camadas, sistema.emprestadas, sistema.id])

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
    for (const id of destaques) marcar(id, COR_DESTAQUE, 0.55)
    marcar(hover, COR_HOVER, 0.35)
    marcar(selecionada, COR_SELECAO, 0.6)
    anteriores.current = [...destaques, hover, selecionada].filter((x): x is string => !!x)
  }, [malha, indice, corBase, hover, selecionada, destaques])

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
        if (naoTocavel || useAtlasStore.getState().modoQuiz) return
        if (e.pointerType !== 'mouse') return
        const alvo = idDoEvento(e)
        if (!alvo) return // outra camada (ou nada) é a primeira de verdade
        e.stopPropagation()
        setHover(alvo.id)
      }}
      onPointerOut={() => setHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return // foi arrasto, não toque
        const estado = useAtlasStore.getState()
        if (estado.modoQuiz && !estado.quizAguardandoToque) return // quiz: toques só no modo "Encontre"
        const alvo = idDoEvento(e)
        if (!alvo?.id) return
        e.stopPropagation()
        if (estado.modoQuiz) {
          useAtlasStore.setState({ quizToque: { id: alvo.id, ponto: alvo.ponto.toArray() } })
          return
        }
        selecionar(alvo.id, { ponto: alvo.ponto.toArray() })
        const estrutura = porId.get(alvo.id)
        if (estrutura) dizerNome(estrutura.id, estrutura.nome)
      }}
    />
  )
}

export const CamadaBatched = memo(CamadaBatchedBase)
