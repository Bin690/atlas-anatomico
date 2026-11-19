import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import conteudo from '../src/data/conteudo.json'
import estruturas from '../src/data/estruturas.json'
import sistemas from '../src/data/sistemas.json'
import { readdirSync, readFileSync } from 'node:fs'
import type { Conteudo, Estrutura, Sistema } from '../src/types/atlas'

const lista = estruturas as Estrutura[]
const camadas = sistemas as Sistema[]
const textos = conteudo as Record<string, Conteudo>
const PUBLIC = join(__dirname, '..', 'public')

describe('integridade dos dados', () => {
  it('ids de estrutura são únicos', () => {
    expect(new Set(lista.map((e) => e.id)).size).toBe(lista.length)
  })

  it('toda estrutura pertence a uma camada existente', () => {
    const ids = new Set(camadas.map((s) => s.id))
    expect(lista.filter((e) => !ids.has(e.sistema)).map((e) => e.nome)).toEqual([])
  })

  it('a contagem de cada camada bate com o catálogo', () => {
    for (const s of camadas) expect(lista.filter((e) => e.sistema === s.id).length, s.id).toBe(s.total)
  })

  it('toda estrutura tem conteúdo didático com descrição', () => {
    expect(lista.filter((e) => !textos[e.id]?.descricao).map((e) => e.nome)).toEqual([])
  })

  it('conteúdo não aponta para ids inexistentes', () => {
    const ids = new Set(lista.map((e) => e.id))
    expect(Object.keys(textos).filter((id) => !ids.has(id))).toEqual([])
  })

  it('estrutura-mãe (paiId) existe e não é a própria estrutura', () => {
    const ids = new Set(lista.map((e) => e.id))
    expect(lista.filter((e) => e.paiId && (!ids.has(e.paiId) || e.paiId === e.id)).map((e) => e.nome)).toEqual([])
  })

  it('todos os modelos .glb existem em public/', () => {
    const arquivos = camadas.flatMap((s) => [s.modelo, s.modeloLeve].filter(Boolean) as string[])
    expect(arquivos.filter((a) => !existsSync(join(PUBLIC, a)))).toEqual([])
  })

  it('aulas guiadas só usam estruturas e camadas existentes', () => {
    const ids = new Set(lista.map((e) => e.id))
    const camadasIds = new Set(camadas.map((s) => s.id))
    const pasta = join(__dirname, '..', 'src', 'data', 'aulas')
    for (const arquivo of readdirSync(pasta)) {
      const aula = JSON.parse(readFileSync(join(pasta, arquivo), 'utf8'))
      expect(aula.passos.length, arquivo).toBeGreaterThan(0)
      for (const p of aula.passos) {
        for (const c of p.camadas) expect(camadasIds.has(c), `${arquivo}: camada ${c}`).toBe(true)
        for (const id of [...(p.isolar ?? []), ...(p.destaques ?? []), ...(p.foco ?? [])])
          expect(ids.has(id), `${arquivo}: ${id}`).toBe(true)
      }
    }
  })
})
