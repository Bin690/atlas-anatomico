#!/usr/bin/env node
/**
 * Mantém os pulmões reconstruídos dentro da caixa torácica, por trás.
 *
 * O BodyParts3D só tem as árvores brônquicas: as superfícies dos lobos são reconstruídas em gerar.mjs, e
 * perto da coluna elas vazavam para trás das costelas, cobrindo os colos das costelas e os processos
 * transversos (de costas, parecia que as costelas não chegavam à coluna).
 *
 * Este passo lê public/models/pulmoes.glb e esqueleto.glb, calcula a parede posterior formada pelas
 * costelas (para cada faixa de 1 cm em x e y, a face anterior da costela mais posterior) e empurra para a
 * frente o que do pulmão estiver atrás dela, com o deslocamento suavizado pela malha.
 *
 * Uso: node scripts/modelos/ajustar-pulmoes.mjs   (rode depois de gerar.mjs)
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dequantize, meshopt, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { versionarDados } from './versionar.mjs'

const RAIZ = new URL('../..', import.meta.url).pathname
const MODELOS = join(RAIZ, 'public/models')
const FOLGA = 0.004 // o pulmão fica pelo menos 4 mm à frente da face interna das costelas
const CEL = 0.01

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const estruturas = JSON.parse(readFileSync(join(RAIZ, 'src/data/estruturas.json'), 'utf8'))
const costelas = new Set(estruturas.filter((e) => / rib$/i.test(e.en)).map((e) => e.id))

// Parede posterior: em cada célula (x, y), a maior z (mais anterior) entre os pontos das costelas
// que estão na metade de trás do tórax
const esqueleto = await io.read(join(MODELOS, 'esqueleto.glb'))
const parede = new Map()
const chave = (x, y) => `${Math.floor(x / CEL)},${Math.floor(y / CEL)}`
for (const no of esqueleto.getRoot().listNodes()) {
  if (!no.getMesh() || !costelas.has(no.getName())) continue
  const M = no.getWorldMatrix()
  for (const prim of no.getMesh().listPrimitives()) {
    const a = prim.getAttribute('POSITION')
    const v = [0, 0, 0]
    for (let i = 0; i < a.getCount(); i++) {
      a.getElement(i, v)
      const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12]
      const y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13]
      const z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]
      if (z > -0.03) continue // só a parte de trás da caixa
      const k = chave(x, y)
      parede.set(k, Math.max(parede.get(k) ?? -Infinity, z))
    }
  }
}
/** Limite posterior em (x, y): a célula, ou a vizinha mais próxima em y (espaços intercostais). */
function limite(x, y) {
  const gx = Math.floor(x / CEL)
  const gy = Math.floor(y / CEL)
  for (let d = 0; d <= 3; d++) {
    const valores = [parede.get(`${gx},${gy + d}`), parede.get(`${gx},${gy - d}`)].filter((z) => z !== undefined)
    if (valores.length) return Math.max(...valores)
  }
  return null
}

const pulmoes = await io.read(join(MODELOS, 'pulmoes.glb'))
await pulmoes.transform(dequantize())
let movidos = 0
let maior = 0
for (const no of pulmoes.getRoot().listNodes()) {
  const malha = no.getMesh()
  if (!malha) continue
  const M = no.getWorldMatrix()
  for (const prim of malha.listPrimitives()) {
    const a = prim.getAttribute('POSITION')
    const n = a.getCount()
    const p = []
    const v = [0, 0, 0]
    for (let i = 0; i < n; i++) {
      a.getElement(i, v)
      p.push([0, 1, 2].map((k) => M[k] * v[0] + M[4 + k] * v[1] + M[8 + k] * v[2] + M[12 + k]))
    }
    // Deslocamento em z de cada vértice, suavizado pela malha (sem degraus entre faixas)
    const dz = p.map(([x, y, z]) => {
      const lim = limite(x, y)
      return lim !== null && z < lim + FOLGA ? lim + FOLGA - z : 0
    })
    const ind = prim.getIndices().getArray()
    const viz = Array.from({ length: n }, () => new Set())
    for (let t = 0; t < ind.length; t += 3)
      for (let k = 0; k < 3; k++) viz[ind[t + k]].add(ind[t + ((k + 1) % 3)]).add(ind[t + ((k + 2) % 3)])
    let d = dz
    for (let it = 0; it < 8; it++) d = d.map((val, i) => Math.max(dz[i], ([...viz[i]].reduce((s, j) => s + d[j], val) / (viz[i].size + 1))))
    // Grava em coordenadas locais do nó (inverso da matriz: aqui ela só tem escala/translação)
    for (let i = 0; i < n; i++) {
      if (d[i] <= 0) continue
      movidos++
      maior = Math.max(maior, d[i])
      a.getElement(i, v)
      v[2] += d[i] / M[10]
      a.setElement(i, v)
    }
  }
}
await pulmoes.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  .write(join(MODELOS, 'pulmoes.glb'), pulmoes)
console.log(`✓ pulmões: ${movidos} vértices levados para dentro da caixa torácica (até ${(maior * 100).toFixed(1)} cm)`)
versionarDados()
