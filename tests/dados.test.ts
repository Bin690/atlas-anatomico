import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import conteudo from '../src/data/conteudo.json'
import estruturas from '../src/data/estruturas.json'
import feminino from '../src/data/feminino.json'
import sistemas from '../src/data/sistemas.json'
import { readdirSync, readFileSync } from 'node:fs'
import type { Conteudo, Estrutura, Sistema } from '../src/types/atlas'

const masculino = estruturas as Estrutura[]
const femininas = feminino.estruturas as Estrutura[]
/** Todas as estruturas dos dois corpos. */
const lista = [...masculino, ...femininas]
const camadas = sistemas as Sistema[]
const textos = conteudo as Record<string, Conteudo>
const PUBLIC = join(__dirname, '..', 'public')

describe('integridade dos dados', () => {
  it('ids de estrutura são únicos', () => {
    expect(new Set(lista.map((e) => e.id)).size).toBe(lista.length)
  })

  it('toda estrutura pertence a uma camada existente', () => {
    // Camadas comuns, mais as que só existem no corpo feminino (Mamas)
    const novas = Object.entries(feminino.camadas)
      .filter(([, c]) => 'nova' in c)
      .map(([id]) => id)
    const ids = new Set([...camadas.map((s) => s.id), ...novas])
    expect(lista.filter((e) => !ids.has(e.sistema)).map((e) => e.nome)).toEqual([])
  })

  it('a contagem de cada camada bate com o catálogo', () => {
    for (const s of camadas) expect(masculino.filter((e) => e.sistema === s.id).length, s.id).toBe(s.total)
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
    const arquivos = [
      ...camadas.flatMap((s) => [s.modelo, s.modeloLeve].filter(Boolean) as string[]),
      ...Object.values(feminino.camadas).map((c) => c.modelo),
    ]
    expect(arquivos.filter((a) => !existsSync(join(PUBLIC, a.split('?')[0])))).toEqual([])
  })

  it('aulas guiadas só usam estruturas e camadas existentes', () => {
    const ids = new Set(lista.map((e) => e.id))
    // Camadas comuns e as que só existem no corpo feminino (Mamas)
    const camadasIds = new Set([
      ...camadas.map((s) => s.id),
      ...Object.entries(feminino.camadas)
        .filter(([, c]) => 'nova' in c)
        .map(([id]) => id),
    ])
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

describe('figuras de referência', () => {
  it('existem em public/ e citam só estruturas existentes', async () => {
    const { FIGURAS } = await import('../src/data/figuras')
    const ids = new Set(lista.map((e) => e.id))
    for (const f of FIGURAS) {
      expect(existsSync(join(PUBLIC, f.src)), f.src).toBe(true)
      expect(
        f.ids.filter((id) => !ids.has(id)),
        f.src,
      ).toEqual([])
    }
  })
})

describe('voz', () => {
  it('toda estrutura tem o áudio com o nome falado', () => {
    const pasta = join(PUBLIC, 'audio', 'nomes')
    expect(lista.filter((e) => !existsSync(join(pasta, `${e.id}.m4a`))).map((e) => e.nome)).toEqual([])
  })
})

describe('corpo feminino', () => {
  it('só troca camadas que existem (ou cria as só femininas), com a contagem certa', () => {
    const ids = new Set(camadas.map((s) => s.id))
    for (const [id, c] of Object.entries(feminino.camadas)) {
      expect(ids.has(id) || 'nova' in c, id).toBe(true)
      expect(femininas.filter((e) => e.sistema === id).length, id).toBe(c.total)
    }
  })

  it('toda estrutura feminina está numa camada que troca de modelo (ou foi emprestada a outra camada)', () => {
    const emprestadas = new Set(
      Object.values(feminino.camadas).flatMap((c) => Object.keys((c as { emprestadas?: object }).emprestadas ?? {})),
    )
    expect(
      femininas.filter((e) => !(e.sistema in feminino.camadas) && !emprestadas.has(e.id)).map((e) => e.nome),
    ).toEqual([])
  })

  it('a pelve feminina substitui a masculina no corpo feminino', () => {
    for (const id of ['FMA16586', 'FMA16587', 'FMA16202']) expect(feminino.somenteMasculino).toContain(id)
    const genital = feminino.camadas.genital as { emprestadas?: Record<string, string> }
    expect(genital.emprestadas).toMatchObject({
      VHF_hip_bone_R: 'esqueleto',
      VHF_sacrum: 'esqueleto',
      VHF_coccyx: 'esqueleto',
    })
  })

  it('a gordura da mama, no modelo da pele, pertence à camada Mamas', () => {
    const pele = feminino.camadas.pele as { emprestadas?: Record<string, string> }
    for (const [id, dona] of Object.entries(pele.emprestadas ?? {})) {
      expect(dona in feminino.camadas, dona).toBe(true)
      expect(femininas.find((e) => e.id === id)?.sistema, id).toBe(dona)
    }
  })

  it('as estruturas só masculinas existem no catálogo', () => {
    const ids = new Set(masculino.map((e) => e.id))
    expect(feminino.somenteMasculino.filter((id) => !ids.has(id))).toEqual([])
  })
})
