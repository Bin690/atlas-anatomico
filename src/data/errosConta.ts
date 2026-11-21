/**
 * Mensagens de erro da conta em português, para o aluno. O Supabase devolve texto em inglês e códigos;
 * aqui traduz-se o que é comum e dá-se uma mensagem genérica ao resto.
 */
const REGRAS: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email ou palavra-passe incorretos.'],
  [/email not confirmed/i, 'Confirme primeiro o seu email: enviámos-lhe uma ligação.'],
  [
    /user already registered|already been registered|email_exists/i,
    'Já existe uma conta com este email. Entre ou recupere a palavra-passe.',
  ],
  [
    /password should be at least|weak_password|password.*(short|weak)/i,
    'A palavra-passe é demasiado fraca: use pelo menos 8 caracteres.',
  ],
  [/same.*password|different from the old/i, 'A nova palavra-passe tem de ser diferente da anterior.'],
  [
    /rate limit|too many requests|over_.*_rate_limit|security purposes/i,
    'Demasiadas tentativas. Aguarde um pouco e tente de novo.',
  ],
  [
    /token has expired|otp.*(expired|invalid)|invalid.*(token|otp)|verification/i,
    'Código inválido ou expirado. Peça um novo.',
  ],
  [
    /invalid.*(phone|email)|unable to validate email|phone.*(invalid|format)/i,
    'Verifique o número ou o email: não parece válido.',
  ],
  [
    /sms.*(provider|send|fail)|unsupported phone provider|failed to send/i,
    'Não foi possível enviar a mensagem. Tente mais tarde ou use outro método.',
  ],
  [/signups? (not allowed|disabled)/i, 'A criação de contas está desativada de momento.'],
  [/provider.*(not enabled|disabled)|unsupported provider/i, 'Este método de entrada ainda não está ativo.'],
  [/failed to fetch|network|load failed|fetch failed/i, 'Sem ligação à internet. Verifique a rede e tente de novo.'],
]

export function traduzirErroConta(erro: unknown): string {
  const e = erro as { message?: string; code?: string } | string | null
  const texto = typeof e === 'string' ? e : `${e?.message ?? ''} ${e?.code ?? ''}`
  for (const [regra, mensagem] of REGRAS) if (regra.test(texto)) return mensagem
  return 'Não foi possível concluir. Tente de novo dentro de instantes.'
}

/** Palavra-passe aceitável: pelo menos 8 caracteres. Devolve a mensagem de erro, ou null se estiver bem. */
export const validarPassword = (p: string) =>
  p.length >= 8 ? null : 'A palavra-passe precisa de pelo menos 8 caracteres.'

export const validarEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()) ? null : 'Escreva um email válido.'

/**
 * Número de telefone no formato internacional (+244…): tira espaços, hífenes e parênteses; aceita o
 * prefixo 00 e, sem prefixo, assume Angola (+244). Devolve null se não parecer um número válido.
 */
export function normalizarTelefone(texto: string, prefixoPorDefeito = '+244'): string | null {
  let t = texto.replace(/[\s().-]/g, '')
  if (t.startsWith('00')) t = `+${t.slice(2)}`
  if (!t.startsWith('+')) t = `${prefixoPorDefeito}${t.replace(/^0+/, '')}`
  return /^\+[1-9]\d{7,14}$/.test(t) ? t : null
}
