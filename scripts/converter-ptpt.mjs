/**
 * Converte para a norma europeia os textos dos dados: só os valores de texto dos JSON (ids, chaves
 * técnicas e nomes em inglês ficam), sem mexer na formatação dos ficheiros.
 * Uso: node scripts/converter-ptpt.mjs
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { paraPtPt } from './ptpt.mjs'

const TECNICAS = new Set(['id', 'en', 'paiId', 'modelo', 'modeloLeve', 'cor', 'src', 'sistema', 'sexo', 'figura'])

for (const f of [...globSync('src/data/*.json'), ...globSync('src/data/aulas/*.json')]) {
  const antes = readFileSync(f, 'utf8')
  // "chave": "valor" ou valores soltos em listas; a chave anterior decide se é texto técnico
  const depois = antes.replace(/("([^"\\]*)"\s*:\s*)?"((?:[^"\\]|\\.)*)"/g, (tudo, prefixo, chave, valor) => {
    if (prefixo === undefined) return tudo.startsWith('"') && /\p{L}{3,}\s/u.test(valor) ? `"${paraPtPt(valor)}"` : tudo
    if (TECNICAS.has(chave)) return tudo
    return `${prefixo.replace(chave, paraPtPt(chave))}"${paraPtPt(valor)}"`
  })
  if (depois !== antes) {
    writeFileSync(f, depois)
    console.log('convertido', f)
  }
}
