import { create } from 'zustand'
import { PAGAMENTO_ATIVO } from '../data/planos'
import type { Sexo, Vec3 } from '../types/atlas'

export type Painel = 'camadas' | 'busca' | 'cortes' | 'aulas' | null

export type PlanoCorte = 'axial' | 'sagital' | 'coronal'

/** Corte anatômico: plano, posição ao longo do eixo (m) e qual metade fica visível. */
export interface Corte {
  plano: PlanoCorte
  posicao: number
  inverter: boolean
  /**
   * Orientação livre (aulas): o plano passa a ter esta normal, e `posicao` é a distância ao longo
   * dela (normal · ponto). A câmera vê a face cortada do lado para onde a normal aponta.
   */
  normal?: Vec3
}

interface AtlasState {
  /** Corpo exibido (masculino ou feminino), lembrado no aparelho. */
  sexo: Sexo
  /** Estrutura selecionada (toque, busca ou quiz). */
  selecionada: string | null
  /** Ponto tocado na superfície (para ancorar o rótulo); null = centro da estrutura. */
  pontoSelecao: Vec3 | null
  /** Estrutura sob o ponteiro (só desktop). */
  hover: string | null
  /** Camadas visíveis (ids de sistema). */
  camadas: Set<string>
  /** Estruturas ocultadas individualmente. */
  ocultas: Set<string>
  /** Se definido, só estas estruturas aparecem ("isolar"). */
  isoladas: Set<string> | null
  /** Nome da região isolada pelo painel de regiões (ex.: "Mão direita"), para o aviso no topo. */
  regiaoAtiva: string | null
  /** Modo raio-X: camadas externas ficam translúcidas. */
  raioX: boolean
  rotacaoAutomatica: boolean
  /** Arrastar com um dedo / botão esquerdo desloca a vista em vez de girar. */
  modoMover: boolean
  /** Dizer em voz alta o nome da peça tocada (lembrado no aparelho). */
  voz: boolean
  /** Incrementado para pedir à câmera que enquadre a seleção (ou o corpo, se nada selecionado). */
  focoVersao: number
  /** A câmera pediu foco numa estrutura cuja camada ainda está carregando. */
  focoPendente: boolean
  painel: Painel
  /** Corte anatômico ativo (null = sem corte). */
  corte: Corte | null
  /** Direção de onde a câmera deve olhar no próximo enquadramento do corpo (ex.: face do corte). */
  vista: Vec3 | null
  /** Quiz em andamento: nomes escondidos e toques desativados até a resposta. */
  modoQuiz: boolean
  /** No quiz: a resposta já foi dada (mostra o nome no rótulo). */
  quizRevelado: boolean
  /** Quiz "Encontre a estrutura": aguardando o aluno tocar no modelo. */
  quizAguardandoToque: boolean
  /** Último toque do aluno no quiz "Encontre a estrutura". */
  quizToque: { id: string; ponto: Vec3 } | null
  /** Enquadra a região ao redor desta estrutura, sem destacá-la (quiz "Encontre"). */
  regiaoFoco: string | null
  /** Aula guiada em andamento (a interface ocupa parte da tela). */
  emAula: boolean
  /** Estruturas destacadas em âmbar, com rótulo (aulas guiadas). */
  destaques: string[]
  /** Enquadra o conjunto destas estruturas (aulas guiadas). */
  focoIds: string[] | null
  /** Recursos PRO liberados (protótipo: liberação de demonstração, salva no aparelho). */
  premium: boolean
  /** Recurso PRO que o usuário tentou abrir sem assinatura (mostra a tela de assinatura). */
  paywall: string | null

  /**
   * Troca o corpo; limpa a seleção e o isolamento, que podem citar estruturas do outro corpo.
   * `lembrar: false` não grava no aparelho (troca temporária, ex.: durante uma aula).
   */
  definirSexo: (sexo: Sexo, opcoes?: { lembrar?: boolean }) => void
  selecionar: (id: string | null, opcoes?: { focar?: boolean; ponto?: Vec3 }) => void
  setHover: (id: string | null) => void
  alternarCamada: (id: string) => void
  definirCamadas: (ids: string[]) => void
  ocultar: (id: string) => void
  isolar: (ids: string[]) => void
  /** Isola as estruturas de uma região do corpo e enquadra-a. */
  isolarRegiao: (rotulo: string, ids: string[]) => void
  mostrarTudo: () => void
  alternarRaioX: () => void
  alternarRotacao: () => void
  alternarMover: () => void
  alternarVoz: () => void
  focar: () => void
  abrirPainel: (p: Painel) => void
  definirQuiz: (modo: boolean, revelado?: boolean) => void
  definirRaioX: (ligado: boolean) => void
  definirCorte: (corte: Corte | null, opcoes?: { vista?: Vec3 }) => void
  definirPremium: (ligado: boolean) => void
  /** Executa a ação se for PRO; senão mostra a tela de assinatura. Retorna se executou. */
  exigirPro: (recurso: string, acao?: () => void) => boolean
  fecharPaywall: () => void
}

const CHAVE_SEXO = 'atlas3d:sexo'

export const useAtlasStore = create<AtlasState>()((set, get) => ({
  sexo: (() => {
    try {
      return localStorage.getItem(CHAVE_SEXO) === 'feminino' ? 'feminino' : 'masculino'
    } catch {
      return 'masculino'
    }
  })(),
  definirSexo: (sexo, { lembrar = true } = {}) => {
    try {
      if (lembrar) localStorage.setItem(CHAVE_SEXO, sexo)
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
    set((s) =>
      s.sexo === sexo
        ? s
        : { sexo, selecionada: null, pontoSelecao: null, hover: null, isoladas: null, regiaoAtiva: null },
    )
  },
  selecionada: null,
  pontoSelecao: null,
  hover: null,
  camadas: new Set(),
  ocultas: new Set(),
  isoladas: null,
  regiaoAtiva: null,
  raioX: false,
  rotacaoAutomatica: false,
  modoMover: false,
  voz: (() => {
    try {
      return localStorage.getItem('atlas3d:voz') !== '0'
    } catch {
      return true
    }
  })(),
  focoVersao: 0,
  focoPendente: false,
  painel: null,
  corte: null,
  vista: null,
  modoQuiz: false,
  quizRevelado: false,
  quizAguardandoToque: false,
  quizToque: null,
  regiaoFoco: null,
  emAula: false,
  destaques: [],
  focoIds: null,
  // Sem pagamento ativo, tudo está liberado
  premium: (() => {
    if (!PAGAMENTO_ATIVO) return true
    try {
      return localStorage.getItem('atlas3d:premium-demo') === '1'
    } catch {
      return false
    }
  })(),

  selecionar: (id, { focar = false, ponto } = {}) =>
    set((s) => ({
      selecionada: id,
      pontoSelecao: ponto ?? null,
      hover: null,
      focoVersao: focar ? s.focoVersao + 1 : s.focoVersao,
    })),
  setHover: (id) => set((s) => (s.hover === id ? s : { hover: id })),
  alternarCamada: (id) =>
    set((s) => {
      const camadas = new Set(s.camadas)
      if (camadas.has(id)) camadas.delete(id)
      else camadas.add(id)
      return { camadas }
    }),
  definirCamadas: (ids) => set({ camadas: new Set(ids) }),
  ocultar: (id) =>
    set((s) => ({
      ocultas: new Set(s.ocultas).add(id),
      selecionada: s.selecionada === id ? null : s.selecionada,
    })),
  isolar: (ids) =>
    set((s) => ({ isoladas: new Set(ids), regiaoAtiva: null, ocultas: new Set(), focoVersao: s.focoVersao + 1 })),
  isolarRegiao: (rotulo, ids) =>
    set((s) => ({
      isoladas: new Set(ids),
      regiaoAtiva: rotulo,
      ocultas: new Set(),
      selecionada: null,
      vista: null,
      focoVersao: s.focoVersao + 1,
    })),
  mostrarTudo: () => set({ ocultas: new Set(), isoladas: null, regiaoAtiva: null }),
  alternarRaioX: () => set((s) => ({ raioX: !s.raioX })),
  alternarRotacao: () => set((s) => ({ rotacaoAutomatica: !s.rotacaoAutomatica })),
  alternarMover: () => set((s) => ({ modoMover: !s.modoMover })),
  alternarVoz: () =>
    set((s) => {
      try {
        localStorage.setItem('atlas3d:voz', s.voz ? '0' : '1')
      } catch {
        // sem armazenamento: vale só nesta sessão
      }
      return { voz: !s.voz }
    }),
  focar: () => set((s) => ({ focoVersao: s.focoVersao + 1 })),
  abrirPainel: (painel) => set((s) => ({ painel: s.painel === painel ? null : painel })),
  definirQuiz: (modoQuiz, quizRevelado = false) => set({ modoQuiz, quizRevelado, hover: null }),
  definirRaioX: (raioX) => set({ raioX }),
  paywall: null,
  exigirPro: (recurso, acao) => {
    const ok = get().premium
    if (ok) acao?.()
    else set({ paywall: recurso })
    return ok
  },
  fecharPaywall: () => set({ paywall: null }),
  definirPremium: (premium) => {
    try {
      localStorage.setItem('atlas3d:premium-demo', premium ? '1' : '0')
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
    set({ premium, paywall: null })
  },
  definirCorte: (corte, { vista } = {}) =>
    set((s) => (vista ? { corte, vista, selecionada: null, focoVersao: s.focoVersao + 1 } : { corte })),
}))
