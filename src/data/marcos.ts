/**
 * Região do corpo de um ponto (cabeça, pescoço, tórax, abdómen, pelve; braço, antebraço, mão, coxa,
 * perna e pé, com o lado: "mao-d"), pelos marcos do esqueleto do atlas. Partilhado pela app (isolar a
 * região para onde se fez zoom) e por scripts/modelos/regioes.mjs (região de cada estrutura).
 * Só sintaxe que o Node consegue apagar (o script importa este ficheiro diretamente).
 */
type P = [number, number, number]

// Marcos do lado esquerdo (x > 0), medidos no esqueleto do atlas; o direito é o espelho
const OMBRO: P = [0.172, 1.405, -0.028]
const COTOVELO: P = [0.225, 1.112, -0.02]
const PUNHO: P = [0.246, 0.886, 0.0]
const ANCA: P = [0.088, 0.9, -0.02]
const JOELHO: P = [0.075, 0.452, -0.018]
const TORNOZELO: P = [0.075, 0.075, -0.02]
// Níveis do tronco (y, m)
const BASE_CABECA = 1.505 // abaixo da mandíbula e do áxis
const BASE_PESCOCO = 1.44 // vértebra T1 / clavículas
const BASE_TORAX = 1.16 // T12, apêndice xifoide e diafragma
const BASE_ABDOMEN = 1.0 // cristas ilíacas

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
/** Distância do ponto ao segmento AB. */
function aoSegmento(p: P, a: P, b: P) {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)))
  const d = sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t])
  return Math.hypot(d[0], d[1], d[2])
}

/** Região de um ponto do corpo. */
export function regiaoDoPonto(p: P): string {
  const lado = p[0] < 0 ? 'd' : 'e' // x negativo = lado direito do paciente
  const q: P = [Math.abs(p[0]), p[1], p[2]]
  // Mão: abaixo do punho, ao lado da coxa
  if (q[1] < PUNHO[1] + 0.012 && q[0] > 0.2) return `mao-${lado}`
  if (aoSegmento(q, COTOVELO, PUNHO) < 0.055 && q[0] > 0.17) return `antebraco-${lado}`
  if (aoSegmento(q, OMBRO, COTOVELO) < 0.06 && q[0] > 0.145 && q[1] < OMBRO[1] + 0.03) return `braco-${lado}`
  // Pé: abaixo do tornozelo; perna: do joelho ao tornozelo; coxa: abaixo da virilha
  if (q[1] < TORNOZELO[1] + 0.01) return `pe-${lado}`
  if (q[1] < JOELHO[1] + 0.01 && aoSegmento(q, JOELHO, TORNOZELO) < 0.09) return `perna-${lado}`
  if (q[1] < 0.84 && aoSegmento(q, ANCA, JOELHO) < 0.12 && q[0] > 0.02) return `coxa-${lado}`
  if (q[1] >= BASE_CABECA) return 'cabeca'
  if (q[1] >= BASE_PESCOCO) return 'pescoco'
  if (q[1] >= BASE_TORAX) return 'torax'
  if (q[1] >= BASE_ABDOMEN) return 'abdomen'
  return 'pelve'
}
