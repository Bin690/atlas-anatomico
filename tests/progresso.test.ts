import { beforeEach, describe, expect, it } from 'vitest'

// localStorage mínimo para o ambiente Node
const memoria = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: () => null,
  length: 0,
} as Storage

const { desempenhoPorSistema, lerProgresso, limparProgresso, pendentes, registrarResposta } =
  await import('../src/data/progresso')
const DIA = 24 * 60 * 60 * 1000

describe('repetição espaçada', () => {
  beforeEach(() => limparProgresso())

  it('erro volta para a caixa 1 e fica pendente na hora', () => {
    registrarResposta('A', false, 0)
    expect(lerProgresso().A).toMatchObject({ caixa: 1, erros: 1 })
    expect(pendentes(lerProgresso(), 0)).toEqual(['A'])
  })

  it('acertos sobem de caixa e afastam a próxima revisão', () => {
    registrarResposta('A', false, 0)
    registrarResposta('A', true, 0) // caixa 2: amanhã
    expect(pendentes(lerProgresso(), 0)).toEqual([])
    expect(pendentes(lerProgresso(), DIA)).toEqual(['A'])
    registrarResposta('A', true, DIA) // caixa 3: 3 dias depois
    expect(lerProgresso().A.caixa).toBe(3)
    expect(pendentes(lerProgresso(), 3 * DIA)).toEqual([])
    expect(pendentes(lerProgresso(), 4 * DIA)).toEqual(['A'])
  })

  it('não agenda revisão do que nunca foi errado', () => {
    registrarResposta('B', true, 0)
    expect(pendentes(lerProgresso(), 100 * DIA)).toEqual([])
  })

  it('prioriza as estruturas mais erradas', () => {
    registrarResposta('A', false, 0)
    registrarResposta('B', false, 0)
    registrarResposta('B', false, 0)
    expect(pendentes(lerProgresso(), 0)).toEqual(['B', 'A'])
  })

  it('calcula o desempenho por sistema', () => {
    registrarResposta('A', true, 0)
    registrarResposta('B', false, 0)
    const d = desempenhoPorSistema(lerProgresso(), () => 'musculos').get('musculos')
    expect(d).toMatchObject({ acertos: 1, total: 2 })
  })
})
