import { describe, expect, it } from 'vitest'
import estruturas from '../src/data/estruturas.json'
import { ligarTexto } from '../src/data/ligacoes'
import type { Estrutura } from '../src/types/atlas'

const lista = estruturas as Estrutura[]
const porNome = (nome: string) => lista.find((e) => e.nome === nome)!
const ligados = (texto: string, origem: string) =>
  ligarTexto(texto, lista, porNome(origem))
    .filter((t): t is { texto: string; id: string } => typeof t !== 'string')
    .map((t) => [t.texto, lista.find((e) => e.id === t.id)!.nome])

describe('ligações entre estruturas', () => {
  it('liga ao mesmo lado da estrutura aberta', () => {
    expect(ligados('Tuberosidade deltóidea do úmero', 'Parte clavicular do músculo deltoide direito')).toEqual([
      ['úmero', 'Úmero direito'],
    ])
    expect(ligados('Tuberosidade deltóidea do úmero', 'Parte clavicular do músculo deltoide esquerdo')).toEqual([
      ['úmero', 'Úmero esquerdo'],
    ])
  })

  it('mantém o texto original e ignora palavras ambíguas', () => {
    const trechos = ligarTexto('Lábio lateral do sulco intertubercular do úmero', lista, porNome('Úmero direito'))
    expect(trechos.map((t) => (typeof t === 'string' ? t : t.texto)).join('')).toBe(
      'Lábio lateral do sulco intertubercular do úmero',
    )
    // o próprio úmero não vira atalho, e "Lábio" (ambíguo) também não
    expect(trechos.every((t) => typeof t === 'string')).toBe(true)
  })
})
