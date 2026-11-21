import type { Estrutura } from '../types/atlas'

/**
 * Seleção por regiões do corpo. A região de cada estrutura é calculada a partir da geometria por
 * scripts/modelos/regioes.mjs (src/data/regioes.json, carregado só quando é preciso); os grupos
 * (costelas, coluna…) são definidos pelo nome.
 */
export type Lado = 'ambos' | 'd' | 'e'

export interface Regiao {
  chave: string
  rotulo: string
  /** Regiões calculadas que a compõem (as dos membros recebem o lado: "mao" -> "mao-d"/"mao-e"). */
  partes: string[]
  /** Região de um membro (tem lado). */
  membro?: boolean
}

export const REGIOES_TRONCO: Regiao[] = [
  { chave: 'cabeca', rotulo: 'Cabeça', partes: ['cabeca'] },
  { chave: 'pescoco', rotulo: 'Pescoço', partes: ['pescoco'] },
  { chave: 'torax', rotulo: 'Tórax', partes: ['torax'] },
  { chave: 'abdomen', rotulo: 'Abdómen', partes: ['abdomen'] },
  { chave: 'pelve', rotulo: 'Pelve', partes: ['pelve'] },
]

export const REGIOES_SUPERIOR: Regiao[] = [
  { chave: 'membro-superior', rotulo: 'Inteiro', partes: ['braco', 'antebraco', 'mao'], membro: true },
  { chave: 'braco', rotulo: 'Braço', partes: ['braco'], membro: true },
  { chave: 'antebraco', rotulo: 'Antebraço', partes: ['antebraco'], membro: true },
  { chave: 'mao', rotulo: 'Mão', partes: ['mao'], membro: true },
]

export const REGIOES_INFERIOR: Regiao[] = [
  { chave: 'membro-inferior', rotulo: 'Inteiro', partes: ['coxa', 'perna', 'pe'], membro: true },
  { chave: 'coxa', rotulo: 'Coxa', partes: ['coxa'], membro: true },
  { chave: 'perna', rotulo: 'Perna', partes: ['perna'], membro: true },
  { chave: 'pe', rotulo: 'Pé', partes: ['pe'], membro: true },
]

/** Grupos de estruturas pelo nome (e, no crânio, pela camada e região). */
export const GRUPOS: { chave: string; rotulo: string; pertence: (e: Estrutura, regioes: string[]) => boolean }[] = [
  { chave: 'costelas', rotulo: 'Costelas', pertence: (e) => /costela|cartilagem costal/i.test(e.nome) },
  {
    chave: 'coluna',
    rotulo: 'Coluna vertebral',
    pertence: (e) => /vértebra|disco intervertebral|^sacro$|cóccix|^atlas|^áxis/i.test(e.nome),
  },
  {
    chave: 'cranio',
    rotulo: 'Crânio',
    pertence: (e, r) => e.sistema === 'esqueleto' && r.includes('cabeca') && !/dente/i.test(e.nome),
  },
  { chave: 'dentes', rotulo: 'Dentes', pertence: (e) => /dente/i.test(e.nome) },
]

let regioesCarregadas: Promise<Record<string, string[]>> | null = null
export const carregarRegioes = () =>
  (regioesCarregadas ??= import('./regioes.json').then((m) => m.default as Record<string, string[]>))

const NOME_LADO = { d: 'direito', e: 'esquerdo' } as const
const NOME_LADO_F = { d: 'direita', e: 'esquerda' } as const

/** Ids das estruturas de uma região (com o lado, nos membros) e o rótulo a mostrar. */
export function selecionarRegiao(
  estruturas: Estrutura[],
  regioes: Record<string, string[]>,
  regiao: Regiao,
  lado: Lado,
): { ids: string[]; rotulo: string } {
  const lados = lado === 'ambos' ? ['d', 'e'] : [lado]
  const alvo = new Set(regiao.membro ? regiao.partes.flatMap((p) => lados.map((l) => `${p}-${l}`)) : regiao.partes)
  // Com um lado escolhido, ficam de fora as peças que também estão no outro lado da mesma zona: o
  // BodyParts3D tem "conjuntos" dos dois lados numa só malha (ex.: artérias digitais das duas mãos)
  const oposto =
    regiao.membro && lado !== 'ambos'
      ? new Set(regiao.partes.map((p) => `${p}-${lado === 'd' ? 'e' : 'd'}`))
      : new Set<string>()
  const ids = estruturas
    .filter((e) => {
      const rs = regioes[e.id]
      return rs?.some((r) => alvo.has(r)) && !rs.some((r) => oposto.has(r))
    })
    .map((e) => e.id)
  const NOMES_MEMBRO: Record<string, string> = {
    'membro-superior': 'Membro superior',
    'membro-inferior': 'Membro inferior',
  }
  let rotulo = NOMES_MEMBRO[regiao.chave] ?? regiao.rotulo
  if (regiao.membro) {
    const nomeLado = /^(Mão|Perna|Coxa)$/.test(rotulo) ? NOME_LADO_F : NOME_LADO
    rotulo += lado === 'ambos' ? ' (ambos os lados)' : ` ${nomeLado[lado]}`
  }
  return { ids, rotulo }
}

/** Ids de um grupo (costelas, coluna…). */
export function selecionarGrupo(estruturas: Estrutura[], regioes: Record<string, string[]>, chave: string) {
  const g = GRUPOS.find((x) => x.chave === chave)!
  return { ids: estruturas.filter((e) => g.pertence(e, regioes[e.id] ?? [])).map((e) => e.id), rotulo: g.rotulo }
}

/** Região (e lado) de um código calculado, ex.: "mao-d" -> Mão, direito; "torax" -> Tórax. */
export function regiaoDoCodigo(codigo: string): { regiao: Regiao; lado: Lado } | null {
  const [parte, l] = codigo.split('-')
  const regiao = [...REGIOES_TRONCO, ...REGIOES_SUPERIOR, ...REGIOES_INFERIOR].find((r) => r.chave === parte)
  if (!regiao) return null
  return { regiao, lado: l === 'd' || l === 'e' ? l : 'ambos' }
}

/** "Mão direita" -> "a mão direita"; "Tórax" -> "o tórax" (para "Isolar …"). */
export function comArtigo(rotulo: string): string {
  const feminino = /^(Mão|Cabeça|Pelve|Coxa|Perna)/.test(rotulo)
  return `${feminino ? 'a' : 'o'} ${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`
}
