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
  const eixo = corte.normal ? new Vector3(...corte.normal).normalize() : EIXOS[corte.plano]
  PLANO.normal.copy(eixo).multiplyScalar(sinal)
  PLANO.constant = -sinal * corte.posicao
}

/** Direção de onde a câmera vê a face cortada. */
export function direcaoDaVista(corte: Corte): Vector3 {
  if (corte.normal) return new Vector3(...corte.normal).normalize().multiplyScalar(corte.inverter ? -1 : 1)
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
export function primeiraIntersecao(
  intersecoes: Intersection<Object3D>[],
  ignorarTranslucidas = false,
  alvoId?: string,
) {
  for (const i of intersecoes) {
    const o = i.object as Object3D & {
      isBatchedMesh?: boolean
      getVisibleAt?: (n: number) => boolean
      material?: { transparent?: boolean; opacity?: number }
    }
    if (!o.isBatchedMesh || !o.visible || o.userData.naoInterativo) continue
    if (ignorarTranslucidas && o.material?.transparent && (o.material.opacity ?? 1) < 0.5) continue
    // A pele de vidro não esconde o que está dentro, exceto quando é ela a peça procurada (ex.: vulva)
    if (ignorarTranslucidas && o.userData.vidro && (i.batchId === undefined || o.userData.ids?.[i.batchId] !== alvoId))
      continue
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

const direcao = new Vector3()

/**
 * Qual estrutura a câmera vê primeiro ao olhar para um ponto (camadas translúcidas do raio-X e a pele
 * não contam como obstáculo). Retorna o id e o ponto atingido, ou null.
 */
export function estruturaVisivelEm(origem: Vector3, alvo: Vector3, alvoId?: string) {
  raycaster.set(origem, direcao.copy(alvo).sub(origem).normalize())
  const visiveis = [...camadasMontadas].filter((o) => o.visible)
  const hit = primeiraIntersecao(raycaster.intersectObjects(visiveis, false), true, alvoId)
  if (!hit || hit.batchId === undefined) return null
  const ids = hit.object.userData.ids as string[] | undefined
  return ids ? { id: ids[hit.batchId], ponto: hit.point } : null
}

/**
 * Visibilidade estável de uma peça para os rótulos:
 * - se o ponto atual ainda é visto, mantém (o rótulo não pula);
 * - senão, testa pontos da superfície da peça, dos mais próximos da câmera aos mais distantes;
 * - só declara "escondida" após várias falhas seguidas (evita piscar).
 */
export class VisibilidadeEstavel {
  ponto: Vector3 | null = null
  private falhas = 0
  private readonly tolerancia: number
  constructor(tolerancia = 3) {
    this.tolerancia = tolerancia
  }

  atualizar(id: string, camera: Vector3, candidatos: Vector3[]) {
    if (this.ponto && estruturaVisivelEm(camera, this.ponto, id)?.id === id) {
      this.falhas = 0
      return
    }
    const ordenados = [...candidatos].sort((a, b) => a.distanceToSquared(camera) - b.distanceToSquared(camera))
    for (const c of ordenados) {
      const hit = estruturaVisivelEm(camera, c, id)
      if (hit?.id === id) {
        this.ponto = hit.ponto.clone()
        this.falhas = 0
        return
      }
    }
    if (++this.falhas >= this.tolerancia) this.ponto = null
  }

  reiniciar() {
    this.ponto = null
    this.falhas = 0
  }
}
