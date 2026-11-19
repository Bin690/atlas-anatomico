import { describe, expect, it } from 'vitest'
import conteudo from '../src/data/conteudo.json'
import estruturas from '../src/data/estruturas.json'
import { gerarPerguntas } from '../src/data/quiz'
import type { Conteudo, Estrutura } from '../src/types/atlas'

const lista = estruturas as Estrutura[]
const textos = conteudo as Record<string, Conteudo>
const semLado = (n: string) => n.replace(/\s+(esquerd|direit)[oa]s?\b/g, '')

describe('quiz', () => {
  for (const sistema of [null, 'esqueleto', 'musculos', 'arterias', 'nervoso']) {
    it(`gera 10 perguntas válidas (${sistema ?? 'todos os sistemas'})`, () => {
      for (let rodada = 0; rodada < 20; rodada++) {
        const perguntas = gerarPerguntas(lista, textos, sistema, 10)
        expect(perguntas).toHaveLength(10)
        const alvos = new Set<string>()
        for (const { alvo, opcoes } of perguntas) {
          expect(opcoes).toHaveLength(4)
          expect(opcoes.map((o) => o.id)).toContain(alvo.id)
          expect(new Set(opcoes.map((o) => o.id)).size).toBe(4)
          // Alternativas do mesmo sistema e sem o "gêmeo" do outro lado do corpo
          for (const o of opcoes) expect(o.sistema).toBe(alvo.sistema)
          expect(new Set(opcoes.map((o) => semLado(o.nome))).size).toBe(4)
          if (sistema) expect(alvo.sistema).toBe(sistema)
          // Sem perguntas repetidas (nem o mesmo par direito/esquerdo)
          expect(alvos.has(semLado(alvo.nome))).toBe(false)
          alvos.add(semLado(alvo.nome))
        }
      }
    })
  }
})
