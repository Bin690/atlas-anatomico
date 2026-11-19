import { use } from 'react'
import type { Conteudo, Estrutura, Sistema } from '../types/atlas'

/**
 * Dados do atlas:
 * - sistemas.json e estruturas.json são GERADOS por scripts/modelos/gerar.mjs (não editar à mão);
 * - conteudo.json é escrito à mão: descrição e correlação clínica por id de estrutura.
 * Tudo é carregado sob demanda (chunks separados).
 */
export interface Catalogo {
  sistemas: Sistema[]
  estruturas: Estrutura[]
  porId: Map<string, Estrutura>
  sistemaPorId: Map<string, Sistema>
  conteudo: Record<string, Conteudo>
}

let cache: Promise<Catalogo> | null = null

export function carregarCatalogo(): Promise<Catalogo> {
  cache ??= Promise.all([
    import('./sistemas.json').then((m) => m.default as Sistema[]),
    import('./estruturas.json').then((m) => m.default as Estrutura[]),
    import('./conteudo.json').then((m) => m.default as Record<string, Conteudo>),
  ]).then(([sistemas, estruturas, conteudo]) => ({
    sistemas,
    estruturas,
    conteudo,
    porId: new Map(estruturas.map((e) => [e.id, e])),
    sistemaPorId: new Map(sistemas.map((s) => [s.id, s])),
  }))
  return cache
}

/** Catálogo completo (suspende até carregar). */
export function useCatalogo(): Catalogo {
  return use(carregarCatalogo())
}

/** Remove acentos e caixa, para busca. */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca por palavras (todas precisam aparecer); prioriza nomes que começam com o termo. */
export function buscar(estruturas: Estrutura[], termo: string, limite = 60): Estrutura[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (!palavras.length) return []
  const res: { e: Estrutura; pontos: number }[] = []
  for (const e of estruturas) {
    const alvo = normalizar(e.nome)
    const alvoEn = e.en.toLowerCase()
    if (!palavras.every((p) => alvo.includes(p) || alvoEn.includes(p))) continue
    const pontos = (alvo.startsWith(palavras[0]) ? 0 : 10) + alvo.length / 100
    res.push({ e, pontos })
  }
  return res
    .sort((a, b) => a.pontos - b.pontos)
    .slice(0, limite)
    .map((r) => r.e)
}
