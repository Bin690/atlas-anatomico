import { describe, expect, it } from 'vitest'
import {
  dadosVazios,
  fundir,
  metaInicial,
  sincronizar,
  type Armazem,
  type DadosNuvem,
  type Documento,
  type Meta,
  type Repositorio,
} from '../src/data/nuvem'

const dados = (parcial: Partial<DadosNuvem> = {}): DadosNuvem => ({ ...dadosVazios(), ...parcial })
const reg = (acertos: number, erros: number, proxima = 0) => ({ caixa: 1, proxima, acertos, erros })

/** A conta: um documento com versão, partilhado por todos os aparelhos. */
function conta(inicial: Documento | null = null) {
  const estado = { doc: inicial, gravacoes: 0 }
  const repo: Repositorio = {
    async ler() {
      return estado.doc ? structuredClone(estado.doc) : null
    },
    async gravar(d, esperada) {
      if ((estado.doc?.versao ?? null) !== esperada) return { ok: false }
      estado.gravacoes++
      estado.doc = { dados: structuredClone(d), versao: (esperada ?? 0) + 1 }
      return { ok: true, versao: estado.doc.versao }
    },
  }
  return { estado, repo }
}

/** Um aparelho: dados locais e meta próprios. */
function aparelho(inicial: DadosNuvem = dadosVazios()) {
  const estado = { dados: structuredClone(inicial), meta: metaInicial() }
  const armazem: Armazem = {
    ler: () => structuredClone(estado.dados),
    aplicar: (d) => void (estado.dados = structuredClone(d)),
    lerMeta: () => ({ ...estado.meta }),
    gravarMeta: (m: Meta) => void (estado.meta = { ...m }),
  }
  /** O aluno mexe no aparelho: conta como alteração pendente. */
  const editar = (f: (d: DadosNuvem) => void) => {
    f(estado.dados)
    estado.meta.temAlteracoes = true
  }
  return { estado, armazem, editar }
}

describe('fundir', () => {
  it('junta favoritos e aulas sem perder nenhum, com os locais primeiro', () => {
    const r = fundir(
      dados({ favoritos: ['b', 'a'], aulasConcluidas: ['x'] }),
      dados({ favoritos: ['a', 'c'], aulasConcluidas: ['y'] }),
    )
    expect(r.favoritos).toEqual(['b', 'a', 'c'])
    expect(r.aulasConcluidas).toEqual(['x', 'y'])
  })

  it('numa disputa de notas fica a mais recente; as outras mantêm-se', () => {
    const r = fundir(
      dados({ notas: { a: { texto: 'nova', em: 20 }, b: { texto: 'só local', em: 1 } } }),
      dados({ notas: { a: { texto: 'velha', em: 10 }, c: { texto: 'só remota', em: 5 } } }),
    )
    expect(Object.fromEntries(Object.entries(r.notas).map(([k, v]) => [k, v.texto]))).toEqual({
      a: 'nova',
      b: 'só local',
      c: 'só remota',
    })
  })

  it('no progresso do quiz fica o registo com mais respostas', () => {
    const r = fundir(
      dados({ progresso: { a: reg(5, 1), b: reg(1, 0) } }),
      dados({ progresso: { a: reg(2, 0), b: reg(3, 2) } }),
    )
    expect(r.progresso.a.acertos).toBe(5)
    expect(r.progresso.b.erros).toBe(2)
  })
})

describe('sincronizar', () => {
  it('conta nova e aparelho com dados: envia-os', async () => {
    const c = conta()
    const a = aparelho(dados({ favoritos: ['f1'] }))
    expect(await sincronizar(c.repo, a.armazem)).toBe('enviado')
    expect(c.estado.doc?.dados.favoritos).toEqual(['f1'])
    expect(a.estado.meta.versaoSync).toBe(1)
    expect(a.estado.meta.temAlteracoes).toBe(false)
  })

  it('conta nova e aparelho vazio: não grava nada', async () => {
    const c = conta()
    const a = aparelho()
    expect(await sincronizar(c.repo, a.armazem)).toBe('sem-mudancas')
    expect(c.estado.gravacoes).toBe(0)
  })

  it('segundo aparelho vazio recebe os dados da conta', async () => {
    const c = conta()
    const telemovel = aparelho(dados({ favoritos: ['f1'], notas: { a: { texto: 'olá', em: 1 } } }))
    await sincronizar(c.repo, telemovel.armazem)
    const computador = aparelho()
    expect(await sincronizar(c.repo, computador.armazem)).toBe('recebido')
    expect(computador.estado.dados.favoritos).toEqual(['f1'])
    expect(computador.estado.dados.notas.a.texto).toBe('olá')
    expect(c.estado.gravacoes).toBe(1) // receber não grava
  })

  it('sem alterações em nenhum lado não grava nem muda nada', async () => {
    const c = conta()
    const a = aparelho(dados({ favoritos: ['f1'] }))
    await sincronizar(c.repo, a.armazem)
    expect(await sincronizar(c.repo, a.armazem)).toBe('sem-mudancas')
    expect(c.estado.gravacoes).toBe(1)
  })

  it('só um aparelho alterou: o outro recebe, e os apagamentos também passam', async () => {
    const c = conta()
    const t = aparelho(dados({ favoritos: ['f1', 'f2'] }))
    const p = aparelho()
    await sincronizar(c.repo, t.armazem)
    await sincronizar(c.repo, p.armazem)
    t.editar((d) => void (d.favoritos = ['f2'])) // tira o f1
    expect(await sincronizar(c.repo, t.armazem)).toBe('enviado')
    expect(await sincronizar(c.repo, p.armazem)).toBe('recebido')
    expect(p.estado.dados.favoritos).toEqual(['f2'])
  })

  it('os dois aparelhos alteraram (um offline): junta tudo e nenhum perde o que fez', async () => {
    const c = conta()
    const t = aparelho()
    const p = aparelho()
    await sincronizar(c.repo, t.armazem)
    await sincronizar(c.repo, p.armazem)
    t.editar((d) => void d.favoritos.push('do-telemovel'))
    p.editar((d) => {
      d.favoritos.push('do-computador')
      d.notas.x = { texto: 'nota', em: 5 }
    })
    await sincronizar(c.repo, t.armazem) // o telemóvel envia primeiro
    expect(await sincronizar(c.repo, p.armazem)).toBe('fundido')
    expect(p.estado.dados.favoritos.sort()).toEqual(['do-computador', 'do-telemovel'])
    expect(await sincronizar(c.repo, t.armazem)).toBe('recebido')
    expect(t.estado.dados.notas.x.texto).toBe('nota')
    expect(c.estado.doc?.dados.favoritos.sort()).toEqual(['do-computador', 'do-telemovel'])
  })

  it('criar conta num aparelho que já tem dados e a conta já tem outros: junta-os', async () => {
    const c = conta({ dados: dados({ favoritos: ['da-conta'] }), versao: 3 })
    const a = aparelho(dados({ favoritos: ['local'] })) // nunca sincronizou
    expect(await sincronizar(c.repo, a.armazem)).toBe('fundido')
    expect(a.estado.dados.favoritos.sort()).toEqual(['da-conta', 'local'])
    expect(c.estado.doc?.versao).toBe(4)
  })

  it('se outro aparelho grava durante a operação, volta a tentar e não perde nada', async () => {
    const c = conta({ dados: dados({ favoritos: ['a'] }), versao: 1 })
    const a = aparelho()
    a.estado.meta = { ...metaInicial(), versaoSync: 1, temAlteracoes: true }
    a.estado.dados = dados({ favoritos: ['a', 'meu'] })
    // Entre a leitura e a gravação, outro aparelho grava
    const original = c.repo.gravar
    let primeira = true
    c.repo.gravar = async (d, esperada) => {
      if (primeira) {
        primeira = false
        c.estado.doc = { dados: dados({ favoritos: ['a', 'do-outro'] }), versao: 2 }
      }
      return original(d, esperada)
    }
    await sincronizar(c.repo, a.armazem)
    expect(c.estado.doc?.dados.favoritos.sort()).toEqual(['a', 'do-outro', 'meu'])
  })

  it('desiste com erro se a conta não parar de mudar', async () => {
    const c = conta({ dados: dados(), versao: 1 })
    c.repo.gravar = async () => ({ ok: false })
    const a = aparelho(dados({ favoritos: ['x'] }))
    a.estado.meta = { ...metaInicial(), versaoSync: 1, temAlteracoes: true }
    await expect(sincronizar(c.repo, a.armazem)).rejects.toThrow('conflito')
  })
})
