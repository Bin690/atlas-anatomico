import { describe, expect, it } from 'vitest'
import { buscar, normalizar } from '../src/data'
import estruturas from '../src/data/estruturas.json'
import type { Estrutura } from '../src/types/atlas'

const lista = estruturas as Estrutura[]
const nomes = (termo: string) => buscar(lista, termo).map((e) => e.nome)

describe('busca', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(normalizar('Fêmur Direito')).toBe('femur direito')
    expect(nomes('FEMUR')).toEqual(expect.arrayContaining(['Fêmur direito', 'Fêmur esquerdo']))
  })

  it('prioriza nomes que começam com o termo', () => {
    expect(nomes('femur').slice(0, 2).sort()).toEqual(['Fêmur direito', 'Fêmur esquerdo'])
  })

  it('exige todas as palavras, em qualquer ordem', () => {
    const r = nomes('biceps longa direito')
    expect(r).toContain('Cabeça longa do músculo bíceps braquial direito')
    expect(r.every((n) => /b[ií]ceps/i.test(n) && /longa/.test(n) && /direit/.test(n))).toBe(true)
  })

  it('encontra pelo nome em inglês', () => {
    expect(nomes('great saphenous')).toEqual(expect.arrayContaining(['Veia safena magna direita']))
  })

  it('retorna vazio para termo vazio e respeita o limite', () => {
    expect(buscar(lista, '   ')).toEqual([])
    expect(buscar(lista, 'a', 10)).toHaveLength(10)
  })
})
