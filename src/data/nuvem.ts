import type { Progresso } from './progresso'

/**
 * Sincronização dos dados do aluno com a conta: o que se guarda, como se juntam as alterações feitas em
 * aparelhos diferentes e o algoritmo de sincronização. Código puro (sem rede nem armazenamento), para se
 * poder testar com aparelhos simulados; a rede e o armazenamento entram por `Repositorio` e `Armazem`.
 *
 * Só vai para a conta o que o aluno cria: favoritos, notas, aulas concluídas e o progresso do quiz. As
 * preferências (tamanho do texto, desempenho, corpo escolhido) são de cada aparelho e ficam de fora.
 */
export interface NotaNuvem {
  texto: string
  /** Quando foi escrita (ms): numa disputa entre aparelhos, vence a mais recente. */
  em: number
}

export interface DadosNuvem {
  favoritos: string[]
  notas: Record<string, NotaNuvem>
  aulasConcluidas: string[]
  progresso: Progresso
}

export const dadosVazios = (): DadosNuvem => ({ favoritos: [], notas: {}, aulasConcluidas: [], progresso: {} })

export const estaVazio = (d: DadosNuvem) =>
  !d.favoritos.length && !Object.keys(d.notas).length && !d.aulasConcluidas.length && !Object.keys(d.progresso).length

/** Serialização com as chaves ordenadas, para comparar dados sem depender da ordem de escrita. */
function estavel(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estavel((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(v)
}
export const saoIguais = (a: DadosNuvem, b: DadosNuvem) => estavel(a) === estavel(b)

/**
 * Junta os dados de dois aparelhos sem perder nada que o aluno tenha criado:
 * - favoritos e aulas concluídas: união (os do aparelho local primeiro);
 * - notas: para cada estrutura fica a mais recente;
 * - progresso do quiz: para cada estrutura fica o registo com mais respostas.
 */
export function fundir(local: DadosNuvem, remoto: DadosNuvem): DadosNuvem {
  const uniao = (a: string[], b: string[]) => [...new Set([...a, ...b])]
  const notas: Record<string, NotaNuvem> = { ...remoto.notas }
  for (const [id, nota] of Object.entries(local.notas)) {
    const outra = notas[id]
    if (!outra || nota.em >= outra.em) notas[id] = nota
  }
  const progresso: Progresso = { ...remoto.progresso }
  for (const [id, r] of Object.entries(local.progresso)) {
    const o = progresso[id]
    const mais =
      !o ||
      r.acertos + r.erros > o.acertos + o.erros ||
      (r.acertos + r.erros === o.acertos + o.erros && r.proxima >= o.proxima)
    if (mais) progresso[id] = r
  }
  return {
    favoritos: uniao(local.favoritos, remoto.favoritos),
    notas,
    aulasConcluidas: uniao(local.aulasConcluidas, remoto.aulasConcluidas),
    progresso,
  }
}

/** Estado da sincronização neste aparelho (guardado no aparelho). */
export interface Meta {
  /** Conta a que pertencem os dados locais (null = ainda de ninguém). */
  utilizador: string | null
  /** Versão do documento na conta quando se sincronizou pela última vez (null = nunca). */
  versaoSync: number | null
  /** Houve alterações neste aparelho que ainda não foram para a conta. */
  temAlteracoes: boolean
  sincronizadoEm: number | null
}

export const metaInicial = (): Meta => ({
  utilizador: null,
  versaoSync: null,
  temAlteracoes: false,
  sincronizadoEm: null,
})

/** O documento do aluno na conta. A `versao` cresce a cada gravação e serve para detetar conflitos. */
export interface Documento {
  dados: DadosNuvem
  versao: number
}

export interface Repositorio {
  ler(): Promise<Documento | null>
  /**
   * Grava se a versão na conta ainda for `versaoEsperada` (null = ainda não existe documento).
   * Devolve `ok: false` se outro aparelho gravou entretanto.
   */
  gravar(dados: DadosNuvem, versaoEsperada: number | null): Promise<{ ok: true; versao: number } | { ok: false }>
}

export interface Armazem {
  ler(): DadosNuvem
  /** Substitui os dados locais (sem contar como alteração do aluno). */
  aplicar(dados: DadosNuvem): void
  lerMeta(): Meta
  gravarMeta(meta: Meta): void
}

export type Resultado = 'sem-mudancas' | 'enviado' | 'recebido' | 'fundido'

const MAX_TENTATIVAS = 4

/**
 * Sincroniza este aparelho com a conta:
 * - nada mudou em nenhum lado: não faz nada;
 * - só este aparelho mudou: envia;
 * - só a conta mudou (outro aparelho): recebe;
 * - os dois mudaram, ou é a primeira vez neste aparelho: junta (`fundir`) e envia o resultado.
 * Se outro aparelho gravar durante a operação, volta a ler e repete (até MAX_TENTATIVAS vezes).
 */
export async function sincronizar(repo: Repositorio, armazem: Armazem): Promise<Resultado> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const remoto = await repo.ler()
    const meta = armazem.lerMeta()
    const local = armazem.ler()
    const agora = Date.now()
    const concluir = (versao: number | null, temAlteracoes = false) =>
      armazem.gravarMeta({ ...meta, versaoSync: versao, temAlteracoes, sincronizadoEm: agora })

    if (!remoto) {
      if (estaVazio(local)) {
        concluir(null)
        return 'sem-mudancas'
      }
      const r = await repo.gravar(local, null)
      if (!r.ok) continue
      concluir(r.versao)
      return 'enviado'
    }

    if (meta.versaoSync === remoto.versao) {
      if (!meta.temAlteracoes) {
        concluir(remoto.versao)
        return 'sem-mudancas'
      }
      const r = await repo.gravar(local, remoto.versao)
      if (!r.ok) continue
      concluir(r.versao)
      return 'enviado'
    }

    // A conta tem uma versão que este aparelho ainda não viu
    if (meta.versaoSync !== null && !meta.temAlteracoes) {
      armazem.aplicar(remoto.dados)
      concluir(remoto.versao)
      return 'recebido'
    }
    const fundidos = fundir(local, remoto.dados)
    armazem.aplicar(fundidos)
    if (saoIguais(fundidos, remoto.dados)) {
      concluir(remoto.versao)
      return 'recebido'
    }
    // Enquanto o envio não termina, estas alterações contam como pendentes
    armazem.gravarMeta({ ...meta, temAlteracoes: true })
    const r = await repo.gravar(fundidos, remoto.versao)
    if (!r.ok) continue
    concluir(r.versao)
    return 'fundido'
  }
  throw new Error('conflito-de-sincronizacao')
}
