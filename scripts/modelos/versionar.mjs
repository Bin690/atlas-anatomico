#!/usr/bin/env node
/**
 * Põe a versão (hash do conteúdo) no endereço de cada modelo: /models/pele.glb?v=1a2b3c4d.
 *
 * O app guarda os modelos no aparelho com a estratégia "cache primeiro" (para funcionar offline). Sem a
 * versão no endereço, um modelo regenerado nunca chegaria a quem já o tinha baixado.
 *
 * Uso: node scripts/modelos/versionar.mjs   (os geradores já chamam no fim)
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = new URL('../..', import.meta.url).pathname
const DADOS = join(RAIZ, 'src/data')

/** "/models/x.glb?v=antiga" -> "/models/x.glb?v=<hash do arquivo>" */
export function versionar(url) {
  const caminho = url.split('?')[0]
  const hash = createHash('sha256')
    .update(readFileSync(join(RAIZ, 'public', caminho)))
    .digest('hex')
    .slice(0, 10)
  return `${caminho}?v=${hash}`
}

export function versionarDados() {
  const sistemas = JSON.parse(readFileSync(join(DADOS, 'sistemas.json'), 'utf8'))
  for (const s of sistemas) {
    s.modelo = versionar(s.modelo)
    if (s.modeloLeve) s.modeloLeve = versionar(s.modeloLeve)
  }
  writeFileSync(join(DADOS, 'sistemas.json'), JSON.stringify(sistemas, null, 2) + '\n')

  const feminino = JSON.parse(readFileSync(join(DADOS, 'feminino.json'), 'utf8'))
  for (const c of Object.values(feminino.camadas)) c.modelo = versionar(c.modelo)
  writeFileSync(join(DADOS, 'feminino.json'), JSON.stringify(feminino, null, 2) + '\n')
  console.log('✓ versões dos modelos atualizadas em sistemas.json e feminino.json')
}

if (import.meta.url === `file://${process.argv[1]}`) versionarDados()
