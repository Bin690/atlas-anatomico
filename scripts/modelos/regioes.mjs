#!/usr/bin/env node
/**
 * Regiões do corpo de cada estrutura (cabeça, pescoço, tórax, abdómen, pelve; braço, antebraço, mão,
 * coxa, perna e pé de cada lado), para a seleção por regiões no explorador.
 *
 * Cada triângulo de cada estrutura é classificado pela posição do centro em relação aos marcos do
 * esqueleto (ombro, cotovelo, punho, anca, joelho, tornozelo e níveis da coluna); a estrutura pertence
 * às regiões onde está uma fatia significativa da sua superfície (um vaso longo pertence à coxa e à perna).
 *
 * Uso: node scripts/modelos/regioes.mjs   (depois de gerar os modelos)
 * Saída: src/data/regioes.json   { id: ["coxa-d", "perna-d"], ... }
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { regiaoDoPonto } from '../../src/data/marcos.ts'

const RAIZ = new URL('../..', import.meta.url).pathname
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const regiao = regiaoDoPonto
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

const sistemas = JSON.parse(readFileSync(join(RAIZ, 'src/data/sistemas.json'), 'utf8'))
const feminino = JSON.parse(readFileSync(join(RAIZ, 'src/data/feminino.json'), 'utf8'))
const arquivos = [...sistemas.map((s) => s.modelo), ...Object.values(feminino.camadas).map((c) => c.modelo)].map((m) =>
  join(RAIZ, 'public', m.split('?')[0]),
)

const saida = {}
for (const arquivo of arquivos) {
  const doc = await io.read(arquivo)
  for (const no of doc.getRoot().listNodes()) {
    const malha = no.getMesh()
    if (!malha) continue
    const M = no.getWorldMatrix()
    // Peso de cada região = área dos triângulos cujo centro cai nela (a densidade da malha varia muito:
    // um músculo tem muitos vértices nas inserções e poucos ao longo do ventre)
    const contagem = new Map()
    let total = 0
    let yMin = Infinity
    let yMax = -Infinity
    for (const prim of malha.listPrimitives()) {
      const a = prim.getAttribute('POSITION')
      const v = [0, 0, 0]
      const pts = Array.from({ length: a.getCount() }, (_, i) => {
        a.getElement(i, v)
        return [0, 1, 2].map((k) => M[k] * v[0] + M[4 + k] * v[1] + M[8 + k] * v[2] + M[12 + k])
      })
      const ind = prim.getIndices()?.getArray() ?? pts.map((_, i) => i)
      for (let t = 0; t + 2 < ind.length; t += 3) {
        const [p0, p1, p2] = [pts[ind[t]], pts[ind[t + 1]], pts[ind[t + 2]]]
        const u = sub(p1, p0)
        const w = sub(p2, p0)
        const area = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2
        const c = [0, 1, 2].map((k) => (p0[k] + p1[k] + p2[k]) / 3)
        yMin = Math.min(yMin, c[1])
        yMax = Math.max(yMax, c[1])
        const r = regiao(c)
        contagem.set(r, (contagem.get(r) ?? 0) + area)
        total += area
      }
    }
    if (!total) continue
    // Peças que cobrem o corpo quase todo (a pele) não pertencem a uma região
    if (yMax - yMin > 1.2) continue
    // Regiões com pelo menos 15% da superfície (ou a principal, se nenhuma chegar a isso)
    const ordenadas = [...contagem].sort((x, y) => y[1] - x[1])
    const regioes = ordenadas.filter(([, n]) => n / total >= 0.15).map(([r]) => r)
    saida[no.getName()] = regioes.length ? regioes : [ordenadas[0][0]]
  }
}
writeFileSync(join(RAIZ, 'src/data/regioes.json'), JSON.stringify(saida) + '\n')
const porRegiao = {}
for (const rs of Object.values(saida)) for (const r of rs) porRegiao[r] = (porRegiao[r] ?? 0) + 1
console.log(`✓ regioes.json: ${Object.keys(saida).length} estruturas`)
console.log(
  Object.entries(porRegiao)
    .map(([r, n]) => `${r} ${n}`)
    .join(' · '),
)
