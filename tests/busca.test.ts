import { describe, expect, it } from 'vitest'
import { buscar, normalizar, termoAlternativo } from '../src/data'
import { SINONIMOS } from '../src/data/sinonimos'
import feminino from '../src/data/feminino.json'
import estruturas from '../src/data/estruturas.json'
import type { Estrutura } from '../src/types/atlas'

const lista = estruturas as Estrutura[]
const nomes = (termo: string) => buscar(lista, termo).map((e) => e.nome)

describe('busca', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(normalizar('Fémur Direito')).toBe('femur direito')
    expect(nomes('FEMUR')).toEqual(expect.arrayContaining(['Fémur direito', 'Fémur esquerdo']))
  })

  it('prioriza nomes que começam com o termo', () => {
    expect(nomes('femur').slice(0, 2).sort()).toEqual(['Fémur direito', 'Fémur esquerdo'])
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

describe('sinónimos', () => {
  const todas = [...lista, ...(feminino.estruturas as Estrutura[])]
  const em = (termo: string) => buscar(todas, termo).map((e) => e.nome)

  it('encontra pelos nomes populares e tradicionais', () => {
    expect(em('rótula')).toEqual(expect.arrayContaining(['Patela direita']))
    expect(em('omoplata esquerda')[0]).toBe('Escápula esquerda')
    expect(em('perónio')).toEqual(expect.arrayContaining(['Fíbula direita']))
    expect(em('trompa de Falópio')[0]).toMatch(/tuba uterina/)
    expect(em('tendão de Aquiles')).toEqual(expect.arrayContaining(['Tendão calcâneo direito']))
  })

  it('aceita as grafias do Brasil', () => {
    expect(em('tireóidea')).toEqual(expect.arrayContaining(['Cartilagem tiróidea']))
    expect(em('abdome')).toEqual(expect.arrayContaining(['Músculo oblíquo externo do abdómen direito']))
  })

  it('mantém primeiro os resultados do termo escrito', () => {
    expect(em('seio')[0]).not.toMatch(/mama/)
    expect(termoAlternativo('fémur')).toBeNull()
  })

  it.each(SINONIMOS.map(([termos, alvo]) => [termos[0], alvo]))('“%s” -> “%s” encontra alguma estrutura', (_, alvo) => {
    expect(buscar(todas, alvo).length).toBeGreaterThan(0)
  })
})
