import { use } from 'react'
import { useAtlasStore } from '../store/useAtlasStore'
import type { Conteudo, Estrutura, Sexo, Sistema } from '../types/atlas'

/**
 * Dados do atlas:
 * - sistemas.json e estruturas.json são GERADOS por scripts/modelos/gerar.mjs (não editar à mão);
 * - feminino.json é GERADO por scripts/modelos/feminino.mjs (camadas e estruturas do corpo feminino);
 * - conteudo.json é escrito à mão: descrição e correlação clínica por id de estrutura.
 * Tudo é carregado sob demanda (chunks separados).
 */
export interface Catalogo {
  sexo: Sexo
  /** Camadas do corpo escolhido (com o modelo e o total desse corpo). */
  sistemas: Sistema[]
  /** Estruturas do corpo escolhido. */
  estruturas: Estrutura[]
  porId: Map<string, Estrutura>
  sistemaPorId: Map<string, Sistema>
  conteudo: Record<string, Conteudo>
  /** Ids que só existem no outro corpo, dentro de camadas comuns (ficam ocultos). */
  doOutroCorpo: Set<string>
  /** Todos os arquivos de modelo dos dois corpos (para uso offline). */
  modelos: string[]
}

interface Feminino {
  /** Camadas que trocam de modelo no corpo feminino. */
  camadas: Record<string, { modelo: string; total: number; tocaveis?: string[]; solidez?: Record<string, number> }>
  estruturas: Estrutura[]
  /** Estruturas de camadas comuns que só existem no corpo masculino. */
  somenteMasculino: string[]
}

interface Base {
  sistemas: Sistema[]
  estruturas: Estrutura[]
  conteudo: Record<string, Conteudo>
  feminino: Feminino
}

let cacheBase: Promise<Base> | null = null
/** Dados já carregados (para consultas síncronas depois da primeira carga). */
let baseCarregada: Base | null = null
const catalogos = new Map<Sexo, Catalogo>()

function carregarBase(): Promise<Base> {
  cacheBase ??= Promise.all([
    import('./sistemas.json').then((m) => m.default as Sistema[]),
    import('./estruturas.json').then((m) => m.default as Estrutura[]),
    import('./conteudo.json').then((m) => m.default as Record<string, Conteudo>),
    import('./feminino.json').then((m) => m.default as Feminino),
  ]).then(([sistemas, estruturas, conteudo, feminino]) => {
    // Nas camadas que trocam de modelo (pele, genital), as estruturas originais são do corpo masculino
    const masculinas = new Set(feminino.somenteMasculino)
    const marcadas = estruturas.map((e) =>
      feminino.camadas[e.sistema] || masculinas.has(e.id) ? { ...e, sexo: 'masculino' as const } : e,
    )
    const femininas = feminino.estruturas.map((e) => ({ ...e, sexo: 'feminino' as const }))
    baseCarregada = { sistemas, estruturas: [...marcadas, ...femininas], conteudo, feminino }
    return baseCarregada
  })
  return cacheBase
}

/** Catálogo de um dos corpos (montado uma vez por corpo). */
function catalogoDe(base: Base, sexo: Sexo): Catalogo {
  const pronto = catalogos.get(sexo)
  if (pronto) return pronto
  const sistemas = base.sistemas.map((s) => {
    const variante = sexo === 'feminino' ? base.feminino.camadas[s.id] : undefined
    return variante
      ? {
          ...s,
          modelo: variante.modelo,
          modeloLeve: undefined,
          total: variante.total,
          tocaveis: variante.tocaveis,
          solidez: variante.solidez,
        }
      : s
  })
  const estruturas = base.estruturas.filter((e) => !e.sexo || e.sexo === sexo)
  const doOutroCorpo = new Set(base.estruturas.filter((e) => e.sexo && e.sexo !== sexo).map((e) => e.id))
  const modelos = [
    ...base.sistemas.flatMap((s) => (s.modeloLeve ? [s.modelo, s.modeloLeve] : [s.modelo])),
    ...Object.values(base.feminino.camadas).map((c) => c.modelo),
  ]
  const catalogo: Catalogo = {
    sexo,
    sistemas,
    estruturas,
    porId: new Map(estruturas.map((e) => [e.id, e])),
    sistemaPorId: new Map(sistemas.map((s) => [s.id, s])),
    conteudo: base.conteudo,
    doOutroCorpo,
    modelos,
  }
  catalogos.set(sexo, catalogo)
  return catalogo
}

/** Pré-carrega os dados (ex.: antes de montar a interface). */
/** Catálogo de um corpo, se os dados já foram carregados (ex.: validar ids de um link partilhado). */
export function catalogoDoCorpo(sexo: Sexo): Catalogo | null {
  return baseCarregada ? catalogoDe(baseCarregada, sexo) : null
}

export function carregarCatalogo(): Promise<Catalogo> {
  return carregarBase().then((base) => catalogoDe(base, useAtlasStore.getState().sexo))
}

/** Catálogo do corpo escolhido (suspende até carregar). */
export function useCatalogo(): Catalogo {
  const base = use(carregarBase())
  const sexo = useAtlasStore((s) => s.sexo)
  return catalogoDe(base, sexo)
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
