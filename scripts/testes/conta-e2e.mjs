/**
 * Teste de ponta a ponta da conta e da sincronização, com dois "aparelhos" (contextos de navegador isolados)
 * e um servidor que imita o Supabase (mock-supabase.mjs): criar conta com os dados locais, entrar noutro
 * aparelho, enviar e receber alterações, sair, entrar por telefone e apagar a conta.
 *
 * Como correr (precisa do Google Chrome e do pacote puppeteer-core: npm i --no-save puppeteer-core):
 *   1. crie .env.local com  VITE_SUPABASE_URL=http://localhost:54321  e  VITE_SUPABASE_ANON_KEY=teste
 *   2. npm run dev   (noutro terminal)
 *   3. node scripts/testes/conta-e2e.mjs [pasta-para-as-capturas]
 * Depois apague o .env.local de teste (ou volte a pôr os valores do seu projeto).
 */
import puppeteer from 'puppeteer-core'
import { estado, iniciar } from './mock-supabase.mjs'
await iniciar()
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const DIR = process.argv[2] ?? (await import('node:os')).tmpdir()
let falhas = 0
const ok = (cond, msg) => {
  console.log(cond ? '  ✓' : '  ✗ FALHOU:', msg)
  if (!cond) falhas++
}

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const clicarTexto = (p, texto, seletor = 'button') =>
  p.evaluate(
    (t, s) => {
      const e = [...document.querySelectorAll(s)].find((x) => x.innerText.trim() === t)
      e?.click()
      return !!e
    },
    texto,
    seletor,
  )
const texto = (p) => p.evaluate(() => document.body.innerText)
const escrever = async (p, seletor, valor) => {
  await p.click(seletor, { clickCount: 3 })
  await p.type(seletor, valor)
}

async function aparelho(nome) {
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log(`[${nome}] pageerror`, e.message))
  await p.setViewport({ width: 1100, height: 800 })
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => {
    localStorage.setItem('atlas3d:primeiros-passos', '1')
    localStorage.setItem('atlas3d:sexo', 'masculino')
  })
  await p.goto('http://localhost:5173/?camadas=esqueleto', { waitUntil: 'domcontentloaded' })
  await espera(2500)
  return p
}
const favoritar = async (p, termo, nota) => {
  await p.keyboard.press('/')
  await espera(300)
  await p.keyboard.type(termo)
  await espera(700)
  await p.evaluate(() => document.querySelector('section[aria-label="Pesquisar estrutura"] li button')?.click())
  await espera(800)
  await p.evaluate(() => document.querySelector('button[aria-label="Guardar nos favoritos"]')?.click())
  if (nota) {
    await clicarTexto(p, '+ Escrever uma nota')
    await espera(300)
    await p.type('article textarea', nota)
  }
  await espera(400)
  await p.keyboard.press('Escape')
  await p.keyboard.press('Escape')
  await espera(300)
}
const verFavoritos = async (p) => {
  await p.keyboard.press('/')
  await espera(500)
  const t = await texto(p)
  await p.keyboard.press('Escape')
  await espera(200)
  return t
}
const submeter = async (p) => {
  await p.click('form button[type=submit]')
}
const abrirConta = async (p) => {
  if (await p.$('[role=dialog]')) return
  await p.click('button[aria-label^="Entrar ou criar conta"], button[aria-label^="A minha conta"]')
  await espera(500)
}

try {
  console.log('1) Botão da conta e criação de conta no aparelho A (já com dados locais)')
  const A = await aparelho('A')
  ok(!!(await A.$('button[aria-label="Entrar ou criar conta"]')), 'o botão da conta aparece quando há configuração')
  await favoritar(A, 'femur direito', 'nota do A')
  await abrirConta(A)
  await A.screenshot({ path: `${DIR}/conta-1-entrada.png` })
  // sem aceitar o consentimento
  await clicarTexto(A, 'Criar conta', '[role=tab]')
  await espera(200)
  await escrever(A, 'input[type=email]', 'aluna@exemplo.com')
  await escrever(A, 'input[type=password]', 'segredo123')
  await submeter(A)
  await espera(400)
  ok((await texto(A)).includes('aceite que os seus dados sejam guardados'), 'criar conta sem consentimento é recusado')
  // palavra-passe curta
  await escrever(A, 'input[type=password]', 'curta')
  await A.click('input[type=checkbox]')
  await submeter(A)
  await espera(400)
  ok((await texto(A)).includes('pelo menos 8 caracteres'), 'palavra-passe curta é recusada')
  await escrever(A, 'input[type=password]', 'segredo123')
  await submeter(A)
  await espera(3500)
  const tA = await texto(A)
  ok(tA.includes('aluna@exemplo.com') && /Sincronizado/.test(tA), 'conta criada, sessão iniciada e sincronizada')
  await A.screenshot({ path: `${DIR}/conta-2-painel.png` })
  const doc = [...estado.linhas.values()][0]
  ok(doc?.dados.favoritos.length === 1, 'o favorito local foi para a conta')
  ok(Object.values(doc?.dados.notas ?? {})[0]?.texto === 'nota do A', 'a nota local foi para a conta')
  ok(!!(await A.$('button[aria-label^="A minha conta"]')), 'o botão mostra que há sessão')

  console.log('2) Aparelho B entra com a mesma conta e recebe os dados')
  const B = await aparelho('B')
  await abrirConta(B)
  await escrever(B, 'input[type=email]', 'aluna@exemplo.com')
  await escrever(B, 'input[type=password]', 'errada')
  await submeter(B)
  await espera(800)
  ok(
    (await texto(B)).includes('Email ou palavra-passe incorretos'),
    'palavra-passe errada dá uma mensagem em português',
  )
  await escrever(B, 'input[type=password]', 'segredo123')
  await submeter(B)
  await espera(3500)
  await B.keyboard.press('Escape')
  await espera(300)
  const fB = await verFavoritos(B)
  ok(/favoritos/i.test(fB) && /Fémur direito/.test(fB), 'B recebeu o favorito do A')
  ok(/nota do A/.test(fB), 'B recebeu a nota do A')

  console.log('3) B acrescenta um favorito → vai para a conta → A recebe ao voltar ao separador')
  await favoritar(B, 'aorta', null)
  await espera(4500)
  ok(
    [...estado.linhas.values()][0].dados.favoritos.length === 2,
    'o favorito novo do B foi enviado sozinho para a conta',
  )
  await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await espera(2500)
  const fA = await verFavoritos(A)
  ok(/Fémur direito/.test(fA) && /Aorta|Arco da aorta|aorta/i.test(fA), 'A recebeu o favorito do B')

  console.log('4) Sair limpa o aparelho; entrar de novo traz tudo de volta')
  await abrirConta(A)
  await clicarTexto(A, 'Sair')
  await espera(2500)
  const limpo = await A.evaluate(() => JSON.parse(localStorage.getItem('atlas3d:caderno:v1') ?? '{}'))
  ok(!(limpo.favoritos ?? []).length, 'depois de sair, o aparelho não guarda os dados da conta')
  ok(!!(await A.$('button[aria-label="Entrar ou criar conta"]')), 'o botão volta ao estado "sem sessão"')
  ok([...estado.linhas.values()].length === 1, 'os dados continuam guardados na conta')
  await abrirConta(A)
  await escrever(A, 'input[type=email]', 'aluna@exemplo.com')
  await escrever(A, 'input[type=password]', 'segredo123')
  await submeter(A)
  await espera(3500)
  await A.keyboard.press('Escape')
  await espera(300)
  ok(/Fémur direito/.test(await verFavoritos(A)), 'ao entrar de novo, os favoritos voltam')

  console.log('5) Entrar por telefone (código por SMS)')
  const C = await aparelho('C')
  await abrirConta(C)
  await clicarTexto(C, 'Entrar com o número de telefone')
  await espera(300)
  await escrever(C, 'input[type=tel]', '923 000 111')
  await submeter(C)
  await espera(800)
  ok(estado.ultimoSms === '+244923000111', 'o número é normalizado para +244… (' + estado.ultimoSms + ')')
  await escrever(C, 'input[autocomplete=one-time-code]', '000000')
  await submeter(C)
  await espera(800)
  ok((await texto(C)).includes('Código inválido ou expirado'), 'código errado dá mensagem em português')
  await escrever(C, 'input[autocomplete=one-time-code]', '123456')
  await submeter(C)
  await espera(3000)
  ok((await texto(C)).includes('+244923000111'), 'sessão iniciada por telefone')
  await C.screenshot({ path: `${DIR}/conta-3-telefone.png` })

  console.log('6) Privacidade: um aluno não vê os dados de outro, e apagar a conta apaga os dados')
  const tokenC = await C.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')).length)
  ok(tokenC === 1, 'a sessão fica guardada no aparelho')
  await abrirConta(B)
  await clicarTexto(B, 'Apagar a minha conta')
  await clicarTexto(B, 'Apagar')
  await espera(2500)
  ok(!estado.utilizadores.has('aluna@exemplo.com'), 'a conta foi apagada')
  ok([...estado.linhas.values()].length === 0, 'os dados da conta foram apagados')
  const localB = await B.evaluate(() => JSON.parse(localStorage.getItem('atlas3d:caderno:v1') ?? '{}'))
  ok((localB.favoritos ?? []).length === 2, 'os dados do aparelho mantêm-se depois de apagar a conta')
} catch (e) {
  console.log('ERRO NO TESTE:', e.message)
  falhas++
} finally {
  await b.close()
  console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTudo certo')
  process.exit(falhas ? 1 : 0)
}
