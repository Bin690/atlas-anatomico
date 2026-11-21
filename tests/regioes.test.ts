import { describe, expect, it } from 'vitest'
import estruturas from '../src/data/estruturas.json'
import feminino from '../src/data/feminino.json'
import regioes from '../src/data/regioes.json'
import {
  REGIOES_INFERIOR,
  REGIOES_SUPERIOR,
  REGIOES_TRONCO,
  selecionarGrupo,
  selecionarRegiao,
} from '../src/data/regioes'
import type { Estrutura } from '../src/types/atlas'

const todas = [...(estruturas as Estrutura[]), ...(feminino.estruturas as Estrutura[])]
const R = regioes as Record<string, string[]>
const id = (nome: string) => todas.find((e) => e.nome === nome)!.id
const nomes = (ids: string[]) => ids.map((i) => todas.find((e) => e.id === i)!.nome)
const regiao = (lista: typeof REGIOES_TRONCO, chave: string) => lista.find((r) => r.chave === chave)!

describe('regiões do corpo', () => {
  it('toda estrutura tem região, exceto a pele, que cobre o corpo todo', () => {
    expect(nomes(todas.filter((e) => !R[e.id]).map((e) => e.id))).toEqual(['Pele', 'Pele'])
  })

  it('classifica ossos e órgãos conhecidos', () => {
    expect(R[id('Calcâneo direito')]).toEqual(['pe-d'])
    expect(R[id('Escafoide direito')]).toEqual(['mao-d'])
    expect(R[id('Tíbia esquerda')]).toContain('perna-e')
    expect(R[id('Rim direito')]).toEqual(['abdomen'])
    expect(R[id('Cerebelo')]).toEqual(['cabeca'])
    expect(R[id('Músculo sartório direito')]).toContain('coxa-d')
  })

  it('com um lado escolhido, deixa de fora os conjuntos que abrangem os dois lados', () => {
    const { ids, rotulo } = selecionarRegiao(todas, R, regiao(REGIOES_SUPERIOR, 'mao'), 'd')
    expect(rotulo).toBe('Mão direita')
    expect(nomes(ids)).toContain('Escafoide direito')
    expect(nomes(ids)).not.toContain('Conjunto das artérias digitais dorsais')
    expect(nomes(ids)).not.toContain('Escafoide esquerdo')
    const ambos = selecionarRegiao(todas, R, regiao(REGIOES_SUPERIOR, 'mao'), 'ambos')
    expect(nomes(ambos.ids)).toContain('Conjunto das artérias digitais dorsais')
  })

  it('o membro inteiro junta as partes', () => {
    const { ids, rotulo } = selecionarRegiao(todas, R, regiao(REGIOES_INFERIOR, 'membro-inferior'), 'e')
    expect(rotulo).toBe('Membro inferior esquerdo')
    expect(nomes(ids)).toEqual(expect.arrayContaining(['Fémur esquerdo', 'Tíbia esquerda', 'Calcâneo esquerdo']))
  })

  it('grupos pelo nome: costelas e coluna', () => {
    const costelas = nomes(selecionarGrupo(todas, R, 'costelas').ids)
    expect(costelas).toEqual(expect.arrayContaining(['1ª costela direita', '12ª costela esquerda']))
    expect(costelas.every((n) => /costela|cartilagem costal/i.test(n))).toBe(true)
    expect(nomes(selecionarGrupo(todas, R, 'coluna').ids)).toEqual(
      expect.arrayContaining(['Atlas (C1)', 'Vértebra lombar L5', 'Sacro']),
    )
  })
})
