import { describe, expect, it } from 'vitest'
import { normalizarTelefone, traduzirErroConta, validarEmail, validarPassword } from '../src/data/errosConta'
import { haQuanto } from '../src/data/haQuanto'

describe('mensagens de erro da conta', () => {
  it.each([
    [{ message: 'Invalid login credentials' }, 'Email ou palavra-passe incorretos.'],
    [{ message: 'User already registered' }, 'Já existe uma conta com este email. Entre ou recupere a palavra-passe.'],
    [
      { message: 'Password should be at least 6 characters.' },
      'A palavra-passe é demasiado fraca: use pelo menos 8 caracteres.',
    ],
    [{ message: 'Email not confirmed' }, 'Confirme primeiro o seu email: enviámos-lhe uma ligação.'],
    [{ message: 'Token has expired or is invalid' }, 'Código inválido ou expirado. Peça um novo.'],
    [{ message: 'email rate limit exceeded' }, 'Demasiadas tentativas. Aguarde um pouco e tente de novo.'],
    [{ message: 'Failed to fetch' }, 'Sem ligação à internet. Verifique a rede e tente de novo.'],
    [{ message: 'Unsupported provider: provider is not enabled' }, 'Este método de entrada ainda não está ativo.'],
    [{ code: 'otp_expired' }, 'Código inválido ou expirado. Peça um novo.'],
  ])('traduz %j', (erro, mensagem) => {
    expect(traduzirErroConta(erro)).toBe(mensagem)
  })

  it('dá uma mensagem genérica em português ao que não conhece, sem mostrar texto técnico', () => {
    const m = traduzirErroConta({ message: 'duplicate key value violates unique constraint "x_pkey"' })
    expect(m).toBe('Não foi possível concluir. Tente de novo dentro de instantes.')
    expect(traduzirErroConta(null)).toBe(m)
  })
})

describe('validações', () => {
  it('email', () => {
    expect(validarEmail('aluna@exemplo.com')).toBeNull()
    expect(validarEmail('  aluna@exemplo.ao ')).toBeNull()
    expect(validarEmail('aluna@')).not.toBeNull()
    expect(validarEmail('sem-arroba.com')).not.toBeNull()
  })

  it('palavra-passe: pelo menos 8 caracteres', () => {
    expect(validarPassword('1234567')).not.toBeNull()
    expect(validarPassword('12345678')).toBeNull()
  })

  it('telefone: normaliza para o formato internacional e assume Angola sem indicativo', () => {
    expect(normalizarTelefone('+244 923 000 111')).toBe('+244923000111')
    expect(normalizarTelefone('923 000 111')).toBe('+244923000111')
    expect(normalizarTelefone('0923000111')).toBe('+244923000111')
    expect(normalizarTelefone('00351 912 345 678')).toBe('+351912345678')
    expect(normalizarTelefone('(+55) 11 91234-5678')).toBe('+5511912345678')
    expect(normalizarTelefone('12')).toBeNull()
    expect(normalizarTelefone('abc')).toBeNull()
  })
})

describe('haQuanto', () => {
  const agora = new Date('2026-11-21T12:00:00').getTime()
  it('descreve quanto tempo passou', () => {
    expect(haQuanto(agora - 10_000, agora)).toBe('há instantes')
    expect(haQuanto(agora - 5 * 60_000, agora)).toBe('há 5 min')
    expect(haQuanto(agora - 3 * 3_600_000, agora)).toBe('há 3 h')
    expect(haQuanto(agora - 86_400_000, agora)).toBe('há 1 dia')
    expect(haQuanto(agora - 3 * 86_400_000, agora)).toBe('há 3 dias')
  })
})
