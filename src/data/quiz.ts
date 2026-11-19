import type { Conteudo, Estrutura } from '../types/atlas'
import { normalizar } from '.'

export interface Pergunta {
  alvo: Estrutura
  opcoes: Estrutura[]
}

const IRRELEVANTES = new Set([
  'do',
  'da',
  'dos',
  'das',
  'de',
  'o',
  'a',
  'e',
  'esquerdo',
  'esquerda',
  'direito',
  'direita',
  'esquerdos',
  'direitos',
])

/** Nome sem lado: "Úmero esquerdo" e "Úmero direito" viram a mesma "base". */
const base = (nome: string) =>
  normalizar(nome)
    .replace(/\b(esquerd|direit)[oa]s?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const palavras = (nome: string) =>
  new Set(
    normalizar(nome)
      .split(/[^a-z0-9]+/)
      .filter((p) => p && !IRRELEVANTES.has(p)),
  )

function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Sorteia perguntas: uma estrutura-alvo e 3 alternativas erradas parecidas (mesmo sistema,
 * palavras em comum, mesma estrutura-mãe), nunca o "gêmeo" do outro lado do corpo.
 * Prefere estruturas com conteúdo didático, para que haja explicação após a resposta.
 */
export function gerarPerguntas(
  estruturas: Estrutura[],
  conteudo: Record<string, Conteudo>,
  sistema: string | null,
  quantidade = 10,
  /** Ids a perguntar primeiro (ex.: revisões pendentes da repetição espaçada). */
  prioritarios: string[] = [],
): Pergunta[] {
  const doSistema = estruturas.filter((e) => e.sistema !== 'pele' && (!sistema || e.sistema === sistema))
  const comConteudo = doSistema.filter((e) => conteudo[e.id])
  const pool = comConteudo.length >= quantidade * 2 ? comConteudo : doSistema

  const perguntas: Pergunta[] = []
  const basesUsadas = new Set<string>()
  const porId = new Map(doSistema.map((e) => [e.id, e]))
  const primeiro = prioritarios.map((id) => porId.get(id)).filter((e): e is Estrutura => !!e)
  const jaVem = new Set(primeiro.map((e) => e.id))
  for (const alvo of [...primeiro, ...embaralhar(pool.filter((e) => !jaVem.has(e.id)))]) {
    if (perguntas.length >= quantidade) break
    const b = base(alvo.nome)
    if (basesUsadas.has(b)) continue
    basesUsadas.add(b)

    const pAlvo = palavras(alvo.nome)
    const candidatas = doSistema
      .filter((e) => e.sistema === alvo.sistema && e.id !== alvo.id && base(e.nome) !== b)
      .map((e) => {
        let pontos = 0
        for (const p of palavras(e.nome)) if (pAlvo.has(p)) pontos++
        if (alvo.pai && e.pai === alvo.pai) pontos += 2
        return { e, pontos: pontos + Math.random() * 0.9 }
      })
      .sort((x, y) => y.pontos - x.pontos)

    // Três alternativas com nomes-base distintos entre si
    const erradas: Estrutura[] = []
    const vistas = new Set([b])
    for (const { e } of candidatas.slice(0, 20)) {
      const be = base(e.nome)
      if (vistas.has(be)) continue
      vistas.add(be)
      erradas.push(e)
      if (erradas.length === 3) break
    }
    if (erradas.length < 3) continue
    perguntas.push({ alvo, opcoes: embaralhar([alvo, ...erradas]) })
  }
  return perguntas
}
