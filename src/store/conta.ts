import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { armazemLocal, aoMudarLocal, gravarMeta, limparDadosLocais, lerMeta } from '../data/armazemLocal'
import { normalizarTelefone, traduzirErroConta } from '../data/errosConta'
import { metaInicial, sincronizar } from '../data/nuvem'
import { contaConfigurada, obterCliente, repositorioSupabase } from '../lib/supabase'

/**
 * A conta do aluno: entrar, criar conta, sair e a sincronização dos dados (favoritos, notas, aulas
 * concluídas e progresso do quiz) entre aparelhos. A app funciona sem conta; com ela, os dados passam a
 * ficar guardados e a acompanhar o aluno.
 */
export type FaseConta = 'indisponivel' | 'inicio' | 'sem-sessao' | 'com-sessao'
export type FaseSync = 'parado' | 'a-sincronizar' | 'ok' | 'erro'

export interface Utilizador {
  id: string
  email: string | null
  telefone: string | null
}

/** Resposta de uma ação: correu bem (com um aviso opcional para mostrar) ou falhou com uma mensagem. */
export type Resposta = { ok: true; aviso?: string } | { ok: false; erro: string }

interface Estado {
  fase: FaseConta
  utilizador: Utilizador | null
  sync: { fase: FaseSync; quando: number | null }
  /** A janela da conta está aberta. */
  janelaAberta: boolean
  /** O aluno voltou do email de recuperação e tem de escolher uma nova palavra-passe. */
  recuperacao: boolean

  abrir: () => void
  fechar: () => void
  iniciar: () => Promise<void>
  entrarComEmail: (email: string, password: string) => Promise<Resposta>
  criarContaComEmail: (email: string, password: string) => Promise<Resposta>
  recuperarPassword: (email: string) => Promise<Resposta>
  definirNovaPassword: (password: string) => Promise<Resposta>
  entrarComGoogle: () => Promise<Resposta>
  enviarCodigoSms: (telefone: string) => Promise<Resposta>
  verificarCodigoSms: (telefone: string, codigo: string) => Promise<Resposta>
  /** Sai da conta. Se houver alterações que não foi possível guardar, devolve `pendente` (e não sai). */
  sair: (opcoes?: { forcar?: boolean }) => Promise<{ ok: boolean; pendente?: boolean }>
  /** Apaga a conta e os dados guardados nela; os dados deste aparelho mantêm-se. */
  apagarConta: () => Promise<Resposta>
  sincronizarAgora: () => Promise<void>
}

const falha = (e: unknown): Resposta => ({ ok: false, erro: traduzirErroConta(e) })
/** O Supabase devolve o email vazio ("") a quem entra por telefone, e o telefone sem o "+". */
const paraUtilizador = (s: Session): Utilizador => ({
  id: s.user.id,
  email: s.user.email || null,
  telefone: s.user.phone ? `+${s.user.phone.replace(/^\+/, '')}` : null,
})

/** Espera depois da última alteração antes de enviar (juntar várias alterações num só envio). */
const ESPERA_ENVIO_MS = 2500

let temporizador: ReturnType<typeof setTimeout> | undefined
let emCurso: Promise<void> | null = null
let repetir = false
let iniciada = false

export const useConta = create<Estado>()((set, get) => {
  const entrou = (s: Session) => {
    const u = paraUtilizador(s)
    const meta = lerMeta()
    // Dados de outra conta que ficaram neste aparelho não se misturam com os desta
    if (meta.utilizador && meta.utilizador !== u.id) limparDadosLocais()
    gravarMeta({ ...lerMeta(), utilizador: u.id })
    set({ fase: 'com-sessao', utilizador: u })
    agendar(0)
  }

  const agendar = (ms = ESPERA_ENVIO_MS) => {
    if (get().fase !== 'com-sessao') return
    clearTimeout(temporizador)
    temporizador = setTimeout(() => void get().sincronizarAgora(), ms)
  }

  return {
    fase: contaConfigurada ? 'inicio' : 'indisponivel',
    utilizador: null,
    sync: { fase: 'parado', quando: null },
    janelaAberta: false,
    recuperacao: false,

    abrir: () => set({ janelaAberta: true }),
    fechar: () => set({ janelaAberta: false, recuperacao: false }),

    iniciar: async () => {
      if (!contaConfigurada || iniciada) return
      iniciada = true
      try {
        const db = await obterCliente()
        // Nota: não chamar a API do Supabase dentro deste callback (pode bloquear); por isso o adiamento
        db.auth.onAuthStateChange((evento, sessao) => {
          setTimeout(() => {
            if (evento === 'PASSWORD_RECOVERY') set({ recuperacao: true, janelaAberta: true })
            if (sessao) entrou(sessao)
            else if (get().fase !== 'sem-sessao')
              set({ fase: 'sem-sessao', utilizador: null, sync: { fase: 'parado', quando: null } })
          }, 0)
        })
        const { data } = await db.auth.getSession()
        if (data.session) entrou(data.session)
        else set({ fase: 'sem-sessao' })

        // Enviar as alterações pouco depois de serem feitas; ir buscar as dos outros aparelhos ao voltar
        aoMudarLocal(() => agendar())
        window.addEventListener('online', () => agendar(0))
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && agendar(0))
      } catch {
        set({ fase: 'sem-sessao' })
      }
    },

    entrarComEmail: async (email, password) => {
      try {
        const db = await obterCliente()
        const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
        return error ? falha(error) : { ok: true }
      } catch (e) {
        return falha(e)
      }
    },

    criarContaComEmail: async (email, password) => {
      try {
        const db = await obterCliente()
        const { data, error } = await db.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) return falha(error)
        // Com a confirmação por email ativa, a sessão só começa depois de abrir a ligação enviada
        return data.session
          ? { ok: true }
          : { ok: true, aviso: 'Enviámos-lhe um email: abra a ligação para confirmar a conta e depois entre.' }
      } catch (e) {
        return falha(e)
      }
    },

    recuperarPassword: async (email) => {
      try {
        const db = await obterCliente()
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        return error
          ? falha(error)
          : {
              ok: true,
              aviso:
                'Se existir uma conta com este email, enviámos-lhe uma ligação para escolher uma nova palavra-passe.',
            }
      } catch (e) {
        return falha(e)
      }
    },

    definirNovaPassword: async (password) => {
      try {
        const db = await obterCliente()
        const { error } = await db.auth.updateUser({ password })
        if (error) return falha(error)
        set({ recuperacao: false })
        return { ok: true, aviso: 'Palavra-passe alterada.' }
      } catch (e) {
        return falha(e)
      }
    },

    entrarComGoogle: async () => {
      try {
        const db = await obterCliente()
        const { error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        return error ? falha(error) : { ok: true }
      } catch (e) {
        return falha(e)
      }
    },

    enviarCodigoSms: async (telefone) => {
      const numero = normalizarTelefone(telefone)
      if (!numero)
        return { ok: false, erro: 'Escreva o número com o indicativo do país, por exemplo +244 923 000 000.' }
      try {
        const db = await obterCliente()
        const { error } = await db.auth.signInWithOtp({ phone: numero })
        return error ? falha(error) : { ok: true, aviso: `Enviámos um código por SMS para ${numero}.` }
      } catch (e) {
        return falha(e)
      }
    },

    verificarCodigoSms: async (telefone, codigo) => {
      const numero = normalizarTelefone(telefone)
      if (!numero) return { ok: false, erro: 'Número inválido.' }
      try {
        const db = await obterCliente()
        const { error } = await db.auth.verifyOtp({ phone: numero, token: codigo.trim(), type: 'sms' })
        return error ? falha(error) : { ok: true }
      } catch (e) {
        return falha(e)
      }
    },

    sair: async ({ forcar = false } = {}) => {
      // Antes de sair, guarda na conta o que ainda estiver por enviar
      if (lerMeta().temAlteracoes) await get().sincronizarAgora()
      if (lerMeta().temAlteracoes && !forcar) return { ok: false, pendente: true }
      try {
        const db = await obterCliente()
        await db.auth.signOut()
      } catch {
        // sem rede: termina a sessão só neste aparelho
      }
      clearTimeout(temporizador)
      // Os dados ficam guardados na conta: este aparelho fica limpo para o próximo aluno
      limparDadosLocais()
      set({ fase: 'sem-sessao', utilizador: null, sync: { fase: 'parado', quando: null } })
      return { ok: true }
    },

    apagarConta: async () => {
      try {
        const db = await obterCliente()
        const { error } = await db.rpc('apagar_a_minha_conta')
        if (error) return falha(error)
        await db.auth.signOut({ scope: 'local' })
      } catch (e) {
        return falha(e)
      }
      clearTimeout(temporizador)
      gravarMeta(metaInicial()) // os dados deste aparelho mantêm-se, mas já não pertencem a nenhuma conta
      set({ fase: 'sem-sessao', utilizador: null, sync: { fase: 'parado', quando: null } })
      return { ok: true, aviso: 'Conta apagada. Os dados guardados neste aparelho mantêm-se.' }
    },

    sincronizarAgora: async () => {
      const u = get().utilizador
      if (!u || get().fase !== 'com-sessao') return
      // Uma sincronização de cada vez: um pedido que chegue entretanto fica para a seguir
      if (emCurso) {
        repetir = true
        return emCurso
      }
      set({ sync: { fase: 'a-sincronizar', quando: get().sync.quando } })
      emCurso = (async () => {
        try {
          await sincronizar(repositorioSupabase(u.id), armazemLocal)
          set({ sync: { fase: 'ok', quando: Date.now() } })
        } catch {
          set({ sync: { fase: 'erro', quando: get().sync.quando } })
        }
      })().finally(() => {
        emCurso = null
        if (repetir) {
          repetir = false
          void get().sincronizarAgora()
        }
      })
      return emCurso
    },
  }
})
