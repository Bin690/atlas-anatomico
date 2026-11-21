/**
 * Progresso do aluno com repetição espaçada (sistema de Leitner), salvo no aparelho.
 *
 * Cada estrutura respondida fica numa "caixa" de 1 a 5. Acertou: sobe uma caixa e a próxima revisão
 * fica mais distante. Errou: volta para a caixa 1 e deve ser revista já. Protótipo: num produto com
 * login, isso ficaria no servidor para sincronizar entre aparelhos.
 */
const CHAVE = 'atlas3d:progresso:v1'
const DIA = 24 * 60 * 60 * 1000
/** Intervalo até a próxima revisão para cada caixa. */
const INTERVALOS = [0, 0, 1 * DIA, 3 * DIA, 7 * DIA, 21 * DIA]

export interface Registro {
  caixa: number
  proxima: number
  acertos: number
  erros: number
}

export type Progresso = Record<string, Registro>

export function lerProgresso(): Progresso {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Progresso
  } catch {
    return {}
  }
}

/** Avisa (ex.: a sincronização com a conta) que o progresso mudou. */
export const EVENTO_PROGRESSO = 'atlas3d:progresso'

/** Substitui o progresso guardado (ex.: dados vindos da conta). */
export function escreverProgresso(p: Progresso) {
  salvar(p)
}

function salvar(p: Progresso) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_PROGRESSO))
  } catch {
    // armazenamento indisponível (modo privado): o progresso vale só nesta sessão
  }
}

/** Registra uma resposta e reagenda a estrutura. */
export function registrarResposta(id: string, acertou: boolean, agora = Date.now()) {
  const p = lerProgresso()
  const r = p[id] ?? { caixa: 1, proxima: agora, acertos: 0, erros: 0 }
  r.caixa = acertou ? Math.min(5, r.caixa + 1) : 1
  r.proxima = agora + INTERVALOS[r.caixa]
  if (acertou) r.acertos++
  else r.erros++
  p[id] = r
  salvar(p)
}

/** Estruturas que já deveriam ser revistas (as mais "atrasadas" e mais erradas primeiro). */
export function pendentes(p: Progresso = lerProgresso(), agora = Date.now()): string[] {
  return Object.entries(p)
    .filter(([, r]) => r.proxima <= agora && r.erros > 0)
    .sort(([, a], [, b]) => a.caixa - b.caixa || b.erros - a.erros)
    .map(([id]) => id)
}

/** Taxa de acerto por sistema (para o painel de desempenho). */
export function desempenhoPorSistema(p: Progresso, sistemaDe: (id: string) => string | undefined) {
  const res = new Map<string, { acertos: number; total: number; dominadas: number }>()
  for (const [id, r] of Object.entries(p)) {
    const s = sistemaDe(id)
    if (!s) continue
    const d = res.get(s) ?? { acertos: 0, total: 0, dominadas: 0 }
    d.acertos += r.acertos
    d.total += r.acertos + r.erros
    if (r.caixa >= 4) d.dominadas++
    res.set(s, d)
  }
  return res
}

export function limparProgresso() {
  salvar({})
}
