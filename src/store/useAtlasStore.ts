import { create } from 'zustand'
import type { Vec3 } from '../types/atlas'

export type Painel = 'camadas' | 'busca' | 'cortes' | 'aulas' | null

export type PlanoCorte = 'axial' | 'sagital' | 'coronal'

/** Corte anatômico: plano, posição ao longo do eixo (m) e qual metade fica visível. */
export interface Corte {
  plano: PlanoCorte
  posicao: number
  inverter: boolean
}

interface AtlasState {
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
  /** Modo raio-X: camadas externas ficam translúcidas. */
  raioX: boolean
  rotacaoAutomatica: boolean
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

  selecionar: (id: string | null, opcoes?: { focar?: boolean; ponto?: Vec3 }) => void
  setHover: (id: string | null) => void
  alternarCamada: (id: string) => void
  definirCamadas: (ids: string[]) => void
  ocultar: (id: string) => void
  isolar: (ids: string[]) => void
  mostrarTudo: () => void
  alternarRaioX: () => void
  alternarRotacao: () => void
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

export const useAtlasStore = create<AtlasState>()((set, get) => ({
  selecionada: null,
  pontoSelecao: null,
  hover: null,
  camadas: new Set(),
  ocultas: new Set(),
  isoladas: null,
  raioX: false,
  rotacaoAutomatica: false,
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
  premium: (() => {
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
  isolar: (ids) => set((s) => ({ isoladas: new Set(ids), ocultas: new Set(), focoVersao: s.focoVersao + 1 })),
  mostrarTudo: () => set({ ocultas: new Set(), isoladas: null }),
  alternarRaioX: () => set((s) => ({ raioX: !s.raioX })),
  alternarRotacao: () => set((s) => ({ rotacaoAutomatica: !s.rotacaoAutomatica })),
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
