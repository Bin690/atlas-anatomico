#!/usr/bin/env node
/**
 * Gera os ícones PNG do app a partir de public/icone.svg (símbolo neon, sem fundo), compondo-o sobre o
 * fundo escuro em degradê da marca:
 *   public/icone-192.png, icone-512.png            ícones do manifesto (PWA)
 *   public/icone-maskable-512.png                   com margem de segurança (o sistema recorta em círculo)
 *   public/apple-touch-icon.png                     ícone do iOS (180×180, sem transparência)
 *
 * Uso: node scripts/gerar-icones.mjs   (precisa do pacote puppeteer-core e do Google Chrome instalado:
 * npm i --no-save puppeteer-core)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const RAIZ = new URL('..', import.meta.url).pathname
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const simbolo = readFileSync(`${RAIZ}public/icone.svg`).toString('base64')

/** [ficheiro, lado em px, fração do lado ocupada pelo símbolo] */
const ICONES = [
  ['icone-192.png', 192, 1],
  ['icone-512.png', 512, 1],
  // Maskable: o desenho tem de caber nos 80% centrais (zona segura)
  ['icone-maskable-512.png', 512, 0.72],
  ['apple-touch-icon.png', 180, 1],
]

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true })
try {
  const pagina = await navegador.newPage()
  for (const [ficheiro, lado, fracao] of ICONES) {
    await pagina.setViewport({ width: lado, height: lado, deviceScaleFactor: 1 })
    await pagina.setContent(`<body style="margin:0;width:${lado}px;height:${lado}px;display:grid;place-items:center;
      background:radial-gradient(circle at 50% 45%, #0E2240 0%, #040915 100%)">
      <img src="data:image/svg+xml;base64,${simbolo}" width="${lado * fracao}" height="${lado * fracao}"></body>`)
    writeFileSync(`${RAIZ}public/${ficheiro}`, await pagina.screenshot({ type: 'png' }))
    console.log('✓', ficheiro)
  }
} finally {
  await navegador.close()
}
