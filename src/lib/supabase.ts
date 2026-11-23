import type { SupabaseClient } from '@supabase/supabase-js'
import type { DadosNuvem, Repositorio } from '../data/nuvem'

/**
 * Ligação ao Supabase (contas e sincronização). Sem as variáveis de ambiente (.env.local) a app funciona
 * como antes, só no aparelho, e o botão da conta não aparece. O cliente só é carregado quando é preciso.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const contaConfigurada = Boolean(URL && CHAVE)

/**
 * O botão da conta aparece quando há projeto ligado; em desenvolvimento aparece sempre (com instruções, se
 * faltar a ligação), para se poder ver e testar o ecrã. Na versão publicada fica escondido sem projeto.
 */
export const mostrarBotaoConta = contaConfigurada || import.meta.env.DEV

let cliente: Promise<SupabaseClient> | null = null
export function obterCliente(): Promise<SupabaseClient> {
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, CHAVE!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  )
  return cliente
}

const TABELA = 'dados_utilizador'

/** O documento do aluno na tabela `dados_utilizador` (ver supabase/schema.sql). */
export function repositorioSupabase(utilizadorId: string): Repositorio {
  return {
    async ler() {
      const db = await obterCliente()
      const { data, error } = await db
        .from(TABELA)
        .select('dados, versao')
        .eq('utilizador_id', utilizadorId)
        .maybeSingle()
      if (error) throw error
      return data ? { dados: data.dados as DadosNuvem, versao: data.versao as number } : null
    },
    async gravar(dados, versaoEsperada) {
      const db = await obterCliente()
      if (versaoEsperada === null) {
        const { error } = await db.from(TABELA).insert({ utilizador_id: utilizadorId, dados, versao: 1 })
        if (!error) return { ok: true, versao: 1 }
        if (error.code === '23505') return { ok: false } // outro aparelho criou o documento entretanto
        throw error
      }
      const { data, error } = await db
        .from(TABELA)
        .update({ dados, versao: versaoEsperada + 1, atualizado_em: new Date().toISOString() })
        .eq('utilizador_id', utilizadorId)
        .eq('versao', versaoEsperada)
        .select('versao')
      if (error) throw error
      return data?.length ? { ok: true, versao: data[0].versao as number } : { ok: false }
    },
  }
}
