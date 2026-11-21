// Servidor de teste que imita o Supabase (autenticação e a tabela dados_utilizador) o suficiente para o Nitu.
// Usado por conta-e2e.mjs; também corre sozinho:  node scripts/testes/mock-supabase.mjs  (porta 54321).
// O código por SMS aceite é sempre 123456.
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const utilizadores = new Map() // email|telefone -> { user, password }
const sessoes = new Map() // access_token -> user
const refrescos = new Map() // refresh_token -> user
const linhas = new Map() // utilizador_id -> { dados, versao }
export const estado = { utilizadores, linhas, pedidos: [] }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (user) =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.assinatura`

function sessao(user) {
  const access_token = jwt(user)
  const refresh_token = randomUUID()
  sessoes.set(access_token, user)
  refrescos.set(refresh_token, user)
  return {
    access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token,
    user,
  }
}
const novoUser = (email, phone) => ({
  id: randomUUID(),
  aud: 'authenticated',
  role: 'authenticated',
  email: email ?? '',
  phone: (phone ?? '').replace('+', ''),
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: email ? 'email' : 'phone' },
  user_metadata: {},
  created_at: new Date().toISOString(),
})

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
    'access-control-expose-headers': '*',
  }
  const enviar = (codigo, corpo, extra = {}) => {
    res.writeHead(codigo, { 'content-type': 'application/json', ...cors, ...extra })
    res.end(corpo === undefined ? '' : JSON.stringify(corpo))
  }
  if (req.method === 'OPTIONS') return enviar(204)
  let corpo = {}
  const texto = await new Promise((r) => {
    let d = ''
    req.on('data', (c) => (d += c))
    req.on('end', () => r(d))
  })
  if (texto)
    try {
      corpo = JSON.parse(texto)
    } catch {
      /* ignora */
    }
  const token = (req.headers.authorization ?? '').replace('Bearer ', '')
  const user = sessoes.get(token)
  estado.pedidos.push(`${req.method} ${url.pathname}${url.search}`)
  const p = url.pathname

  // --- autenticação ---
  if (p === '/auth/v1/signup') {
    if (utilizadores.has(corpo.email))
      return enviar(422, { code: 'user_already_exists', msg: 'User already registered' })
    if ((corpo.password ?? '').length < 6)
      return enviar(422, { code: 'weak_password', msg: 'Password should be at least 6 characters' })
    const u = novoUser(corpo.email)
    utilizadores.set(corpo.email, { user: u, password: corpo.password })
    return enviar(200, sessao(u))
  }
  if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const reg = utilizadores.get(corpo.email)
    if (!reg || reg.password !== corpo.password)
      return enviar(400, { code: 'invalid_credentials', msg: 'Invalid login credentials' })
    return enviar(200, sessao(reg.user))
  }
  if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const u = refrescos.get(corpo.refresh_token)
    return u ? enviar(200, sessao(u)) : enviar(400, { code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
  }
  if (p === '/auth/v1/otp') {
    estado.ultimoSms = corpo.phone
    return enviar(200, {})
  }
  if (p === '/auth/v1/verify') {
    if (corpo.token !== '123456') return enviar(403, { code: 'otp_expired', msg: 'Token has expired or is invalid' })
    let reg = utilizadores.get(corpo.phone)
    if (!reg) {
      reg = { user: novoUser(null, corpo.phone), password: null }
      utilizadores.set(corpo.phone, reg)
    }
    return enviar(200, sessao(reg.user))
  }
  if (p === '/auth/v1/recover') return enviar(200, {})
  if (p === '/auth/v1/logout') {
    sessoes.delete(token)
    return enviar(204)
  }
  if (p === '/auth/v1/user') return user ? enviar(200, user) : enviar(401, { msg: 'invalid JWT' })

  // --- tabela dados_utilizador ---
  if (p === '/rest/v1/rpc/apagar_a_minha_conta') {
    if (!user) return enviar(401, { message: 'sem sessão' })
    linhas.delete(user.id)
    for (const [k, v] of utilizadores) if (v.user.id === user.id) utilizadores.delete(k)
    sessoes.delete(token)
    return enviar(204)
  }
  if (p === '/rest/v1/dados_utilizador') {
    if (!user) return enviar(401, { message: 'JWT inválido', code: 'PGRST301' })
    const filtro = (n) => (url.searchParams.get(n) ?? '').replace(/^eq\./, '')
    const id = filtro('utilizador_id')
    if (id && id !== user.id) return enviar(200, []) // regra de privacidade: só o próprio documento
    if (req.method === 'GET') {
      const l = linhas.get(user.id)
      return enviar(200, l ? [{ dados: l.dados, versao: l.versao }] : [])
    }
    if (req.method === 'POST') {
      if (linhas.has(user.id))
        return enviar(409, { code: '23505', message: 'duplicate key value violates unique constraint' })
      linhas.set(user.id, { dados: corpo.dados, versao: corpo.versao })
      return enviar(201)
    }
    if (req.method === 'PATCH') {
      const l = linhas.get(user.id)
      if (!l || String(l.versao) !== filtro('versao')) return enviar(200, [])
      l.dados = corpo.dados
      l.versao = corpo.versao
      return enviar(200, [{ versao: l.versao }])
    }
  }
  enviar(404, { message: 'não implementado: ' + p })
})
export const iniciar = (porta = 54321) => new Promise((r) => servidor.listen(porta, () => r(servidor)))
if (process.argv[1].endsWith('mock-supabase.mjs')) iniciar().then(() => console.log('mock supabase em :54321'))
