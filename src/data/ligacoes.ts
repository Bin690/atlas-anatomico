import { normalizar } from '.'
import type { Estrutura } from '../types/atlas'

/**
 * Ligações entre estruturas: acha, num texto da ficha ("Tuberosidade deltóidea do úmero",
 * "Nervo musculocutâneo"), nomes de estruturas do catálogo, para virarem atalhos no cartão.
 */
export type Trecho = string | { texto: string; id: string }

const LADOS = new Set(['direito', 'direita', 'esquerdo', 'esquerda', 'direitos', 'esquerdos', 'direitas', 'esquerdas'])
/** Nomes de uma palavra que, nos textos, quase sempre querem dizer outra coisa. */
const AMBIGUOS = new Set([
  'bulbo',
  'trapezio',
  'ponte',
  'labio',
  'colo',
  'corpo',
  'face',
  'arco',
  'tronco',
  'raiz',
  'cabeca',
])

type Lado = 'direito' | 'esquerdo' | null
interface Entrada {
  palavras: string[]
  porLado: Partial<Record<'direito' | 'esquerdo' | 'unico', string>>
}

const ladoDe = (nome: string): Lado => {
  const n = normalizar(nome)
  if (/\bdireit[oa]s?\b/.test(n)) return 'direito'
  if (/\besquerd[oa]s?\b/.test(n)) return 'esquerdo'
  return null
}

const tokens = (texto: string) => [...texto.matchAll(/[\p{L}\p{N}]+/gu)]

const indices = new WeakMap<Estrutura[], Map<string, Entrada[]>>()

/** Índice pela primeira palavra do nome sem o lado (montado uma vez por catálogo). */
function indice(estruturas: Estrutura[]) {
  const pronto = indices.get(estruturas)
  if (pronto) return pronto
  const porBase = new Map<string, Entrada>()
  for (const e of estruturas) {
    const palavras = tokens(e.nome)
      .map((m) => normalizar(m[0]))
      .filter((p) => !LADOS.has(p))
    const chave = palavras.join(' ')
    if (chave.length < 5 || (palavras.length === 1 && AMBIGUOS.has(chave))) continue
    const entrada = porBase.get(chave) ?? { palavras, porLado: {} }
    entrada.porLado[ladoDe(e.nome) ?? 'unico'] ??= e.id
    porBase.set(chave, entrada)
  }
  const mapa = new Map<string, Entrada[]>()
  for (const entrada of porBase.values()) {
    const lista = mapa.get(entrada.palavras[0]) ?? []
    lista.push(entrada)
    mapa.set(entrada.palavras[0], lista)
  }
  for (const lista of mapa.values()) lista.sort((a, b) => b.palavras.length - a.palavras.length)
  indices.set(estruturas, mapa)
  return mapa
}

/**
 * Divide o texto em trechos simples e trechos ligados a estruturas. Prefere o nome mais longo e,
 * entre os lados, o mesmo lado da estrutura aberta (`origem`).
 */
export function ligarTexto(texto: string, estruturas: Estrutura[], origem: Estrutura): Trecho[] {
  const mapa = indice(estruturas)
  const lado = ladoDe(origem.nome)
  const toks = tokens(texto)
  const norm = toks.map((m) => normalizar(m[0]))
  const saida: Trecho[] = []
  let cursor = 0
  for (let i = 0; i < toks.length;) {
    const achado = (mapa.get(norm[i]) ?? []).find((e) => e.palavras.every((p, k) => norm[i + k] === p))
    const id = achado && (achado.porLado[lado ?? 'direito'] ?? achado.porLado.unico ?? Object.values(achado.porLado)[0])
    if (!achado || !id || id === origem.id) {
      i++
      continue
    }
    const inicio = toks[i].index!
    const ultimo = toks[i + achado.palavras.length - 1]
    const fim = ultimo.index! + ultimo[0].length
    if (inicio > cursor) saida.push(texto.slice(cursor, inicio))
    saida.push({ texto: texto.slice(inicio, fim), id })
    cursor = fim
    i += achado.palavras.length
  }
  if (cursor < texto.length) saida.push(texto.slice(cursor))
  return saida
}
