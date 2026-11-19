import { Plane, Raycaster, Vector3, type Intersection, type Object3D, type Ray } from 'three'
import type { Corte } from '../../store/useAtlasStore'

/**
 * Plano de corte compartilhado por todos os materiais (mudar a posição não exige recompilar shaders).
 * Fica visível o lado para onde a normal aponta (distância ≥ 0).
 */
export const PLANO = new Plane(new Vector3(0, -1, 0), 1)
let ativo = false

const EIXOS = { axial: new Vector3(0, 1, 0), sagital: new Vector3(1, 0, 0), coronal: new Vector3(0, 0, 1) }

/** Limites (m, espaço do corpo) de cada plano para o controle deslizante. */
export const LIMITES = {
  axial: { min: 0.02, max: 1.72, inicial: 1.3 },
  sagital: { min: -0.34, max: 0.34, inicial: 0 },
  coronal: { min: -0.15, max: 0.15, inicial: 0 },
} as const

/**
 * Por padrão mantém a metade "de baixo / direita do paciente / posterior" e a câmera olha a face
 * cortada do lado removido. "inverter" mantém a outra metade.
 */
export function atualizarPlano(corte: Corte | null) {
  ativo = !!corte
  if (!corte) return
  const sinal = corte.inverter ? 1 : -1
  PLANO.normal.copy(EIXOS[corte.plano]).multiplyScalar(sinal)
  PLANO.constant = -sinal * corte.posicao
}

/** Direção de onde a câmera vê a face cortada. */
export function direcaoDaVista(corte: Corte): Vector3 {
  const d = EIXOS[corte.plano].clone().multiplyScalar(corte.inverter ? -1 : 1)
  if (corte.plano === 'axial')
    d.add(new Vector3(0, 0, 0.45)) // levemente de frente, para dar profundidade
  else d.add(new Vector3(0, 0.12, 0))
  return d.normalize()
}

export const corteAtivo = () => ativo
export const mantido = (p: Vector3) => !ativo || PLANO.distanceToPoint(p) >= 0

/**
 * Primeira interseção "real" do raio: numa camada interativa e visível, em uma peça visível,
 * e do lado mantido pelo corte (o raycast do Three não respeita planos de corte).
 */
export function primeiraIntersecao(intersecoes: Intersection<Object3D>[]) {
  for (const i of intersecoes) {
    const o = i.object as Object3D & { isBatchedMesh?: boolean; getVisibleAt?: (n: number) => boolean }
    if (!o.isBatchedMesh || !o.visible || o.userData.naoInterativo) continue
    if (i.batchId !== undefined && o.getVisibleAt && !o.getVisibleAt(i.batchId)) continue
    if (!mantido(i.point)) continue
    return i
  }
  return null
}

/** Camadas 3D montadas (para o raycast próprio quando há corte). */
export const camadasMontadas = new Set<Object3D>()
const raycaster = new Raycaster()

/**
 * Interseção real sob o ponteiro. O R3F guarda só a primeira interseção de cada objeto, e cada
 * camada é um único BatchedMesh: com corte, essa primeira pode estar na parte removida. Nesse
 * caso refaz o raycast em todas as camadas visíveis e pega a primeira do lado mantido.
 */
export function intersecaoReal(intersecoes: Intersection<Object3D>[], raio: Ray) {
  if (!ativo) return primeiraIntersecao(intersecoes)
  raycaster.set(raio.origin, raio.direction)
  const visiveis = [...camadasMontadas].filter((o) => o.visible)
  return primeiraIntersecao(raycaster.intersectObjects(visiveis, false))
}
