#!/usr/bin/env node
/**
 * Gera as camadas 3D do atlas e o catálogo de estruturas a partir do BodyParts3D.
 *
 * Uso:
 *   node scripts/modelos/gerar.mjs <pasta-do-bodyparts3d>
 *
 * Saída:
 *   public/models/<camada>.glb  uma mesh por estrutura, com o id FMA como nome
 *   src/data/sistemas.json      camadas (gerado)
 *   src/data/estruturas.json    todas as estruturas com nome em português (gerado)
 *   src/data/conteudo.json      só é criado se não existir (conteúdo didático é editado à mão)
 *
 * Todos os modelos saem no mesmo "espaço do corpo": metros, y para cima,
 * frente em +z, lado esquerdo do paciente em +x, pés em y = 0.
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BodyParts3D, pontosSemOutliers } from './bodyparts3d.mjs'
import { classificar, COR_ESTRUTURA, SISTEMAS } from './sistemas.mjs'
import { calcularNormais, reconstruirLobos, volumePorFatias } from './superficie.mjs'
import { traduzirOsso } from './ossos.mjs'
import { desconhecidas, traduzir } from './traducao.mjs'

const RAIZ = new URL('../..', import.meta.url).pathname
const SAIDA = join(RAIZ, 'public/models')
const DADOS = join(RAIZ, 'src/data')
const pasta = process.argv[2]
if (!pasta) {
  console.error('Uso: node scripts/modelos/gerar.mjs <pasta-do-bodyparts3d>')
  process.exit(1)
}

const bp = new BodyParts3D(pasta)
const conceitos = bp.listarConceitos()
console.log(`${conceitos.size} estruturas encontradas em ${bp.arquivos.size} arquivos OBJ`)

// ---------------------------------------------------------------------------
// Sistema de coordenadas: BodyParts3D (mm, z para cima, y para trás) -> espaço do corpo
// ---------------------------------------------------------------------------
const pele = [...conceitos.values()].find((c) => c.nome.toLowerCase() === 'skin')
const ORIGEM = (() => {
  const { posicoes } = bp.malhaDeArquivos(pele.fj)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  for (let i = 0; i < posicoes.length; i += 3) {
    minX = Math.min(minX, posicoes[i])
    maxX = Math.max(maxX, posicoes[i])
    minY = Math.min(minY, posicoes[i + 1])
    maxY = Math.max(maxY, posicoes[i + 1])
    minZ = Math.min(minZ, posicoes[i + 2])
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: minZ }
})()

function converter({ posicoes, normais, indices }) {
  const n = posicoes.length / 3
  const p = new Float32Array(n * 3)
  const nn = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    p[3 * i] = (posicoes[3 * i] - ORIGEM.x) / 1000
    p[3 * i + 1] = (posicoes[3 * i + 2] - ORIGEM.z) / 1000
    p[3 * i + 2] = -(posicoes[3 * i + 1] - ORIGEM.y) / 1000
    nn[3 * i] = normais[3 * i]
    nn[3 * i + 1] = normais[3 * i + 2]
    nn[3 * i + 2] = -normais[3 * i + 1]
  }
  return { p, nn, idx: Uint32Array.from(indices) }
}

/** "#rrggbb" (sRGB) -> [r, g, b, 1] linear. */
function corLinear(hex) {
  const canal = (i) => {
    const c = Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return [canal(0), canal(1), canal(2), 1]
}

// ---------------------------------------------------------------------------
// Pulmões: superfícies dos lobos reconstruídas (o BodyParts3D só tem as árvores internas)
// ---------------------------------------------------------------------------
const LOBOS = [
  { id: 'FMA7333', en: 'Upper lobe of right lung', lado: 'Right' },
  { id: 'FMA7383', en: 'Middle lobe of right lung', lado: 'Right' },
  { id: 'FMA7337', en: 'Lower lobe of right lung', lado: 'Right' },
  { id: 'FMA7370', en: 'Upper lobe of left lung', lado: 'Left' },
  { id: 'FMA7371', en: 'Lower lobe of left lung', lado: 'Left' },
]
const NOMES_LOBOS = {
  FMA7333: 'Lobo superior do pulmão direito',
  FMA7383: 'Lobo médio do pulmão direito',
  FMA7337: 'Lobo inferior do pulmão direito',
  FMA7370: 'Lobo superior do pulmão esquerdo',
  FMA7371: 'Lobo inferior do pulmão esquerdo',
}

function reconstruirPulmoes() {
  const pontosDe = (nomes) =>
    [...conceitos.values()]
      .filter((c) => nomes.test(c.nome.toLowerCase()))
      .flatMap((c) => bp.malhaDeArquivos(c.fj).posicoes)
  const caixa = volumePorFatias(pontosDe(/rib$|sternum|manubrium|xiphoid|thoracic vertebra$/), 5, 20)
  const mediastino = volumePorFatias(pontosDe(/^(wall|cavity) of|aorta|vena cava|esophagus|trachea/), 5, 12)
  const permitido = (x, y, z, lado) =>
    (lado === 'Right' ? x < -4 : x > 4) && caixa(x, y, z, 6) && !mediastino(x, y, z, -3)
  const grupos = LOBOS.map((l) => ({ nome: l.id, lado: l.lado, pontos: pontosSemOutliers(bp, l.id) }))
  const res = new Map()
  for (const r of reconstruirLobos(grupos, {
    voxel: 2.5,
    dilatacao: 38,
    fissura: 1,
    suavizar: 3,
    iteracoesTaubin: 20,
    permitido,
  }))
    res.set(r.nome, { posicoes: r.posicoes, normais: calcularNormais(r.posicoes, r.indices), indices: r.indices })
  return res
}

// ---------------------------------------------------------------------------
// Classificação e tradução
// ---------------------------------------------------------------------------
const porSistema = new Map(SISTEMAS.map((s) => [s.id, []]))
const semSistema = []
for (const c of conceitos.values()) {
  const sistema = classificar(c.nome.toLowerCase(), bp.ancestrais(c.fma).join(' | ').toLowerCase())
  if (!sistema) semSistema.push(c.nome)
  else porSistema.get(sistema).push(c)
}
if (semSistema.length) console.warn(`! ${semSistema.length} sem sistema:`, semSistema.slice(0, 30))

// ---------------------------------------------------------------------------
// Geração das camadas
// ---------------------------------------------------------------------------
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

await MeshoptEncoder.ready
await MeshoptSimplifier.ready

const estruturasSaida = []
const sistemasSaida = []

for (const sistema of SISTEMAS) {
  const doc = new Document()
  doc.createBuffer()
  const cena = doc.createScene(sistema.id)
  const materiais = new Map()
  const material = (cor) => {
    if (!materiais.has(cor))
      materiais.set(
        cor,
        doc.createMaterial(cor).setBaseColorFactor(corLinear(cor)).setRoughnessFactor(0.55).setMetallicFactor(0),
      )
    return materiais.get(cor)
  }

  // Lista de estruturas desta camada: [id, nome en, malha bruta]
  const itens = []
  if (sistema.id === 'pulmoes') {
    const lobos = reconstruirPulmoes()
    for (const l of LOBOS) itens.push({ id: l.id, en: l.en, malha: lobos.get(l.id), nomePt: NOMES_LOBOS[l.id] })
  } else {
    for (const c of porSistema.get(sistema.id)) itens.push({ id: c.fma, en: c.nome, fj: c.fj })
  }

  let triOriginais = 0
  for (const item of itens) {
    const bruta = item.malha ?? bp.malhaDeArquivos(item.fj)
    if (!bruta.indices.length) continue
    const geo = converter(bruta)
    triOriginais += geo.idx.length / 3
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(geo.p))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(geo.nn))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(geo.idx))
      .setMaterial(material(COR_ESTRUTURA(sistema, item.en.toLowerCase())))
    cena.addChild(doc.createNode(item.id).setMesh(doc.createMesh(item.id).addPrimitive(prim)))
    estruturasSaida.push({ id: item.id, nome: item.nomePt ?? traduzir(item.en), en: item.en, sistema: sistema.id })
  }
  if (!cena.listChildren().length) continue

  await doc.transform(
    weld(),
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: sistema.reducao,
      error: sistema.erro ?? 0.0006,
      lockBorder: false,
    }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  let tri = 0
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tri += p.getIndices().getCount() / 3
  const arquivo = join(SAIDA, `${sistema.id}.glb`)
  await io.write(arquivo, doc)
  const kb = Math.round(readFileSync(arquivo).length / 1024)
  const total = cena.listChildren().length
  console.log(
    `✓ ${sistema.id.padEnd(13)} ${String(total).padStart(4)} estruturas  ${triOriginais} → ${tri} tri  ${kb} KB`,
  )
  sistemasSaida.push({
    id: sistema.id,
    nome: sistema.nome,
    cor: sistema.cor,
    modelo: `/models/${sistema.id}.glb`,
    visivelPorPadrao: sistema.visivelPorPadrao,
    total,
    ...(sistema.estilo ? { estilo: sistema.estilo } : {}),
    ...(sistema.interativo === false ? { interativo: false } : {}),
    ...(sistema.raioX ? { raioX: true } : {}),
  })
}

// Hierarquia: "X of Y" -> Y é a estrutura-mãe (ex.: "Long head of left biceps brachii" -> bíceps braquial esquerdo)
const porEn = new Map(estruturasSaida.map((e) => [e.en.toLowerCase(), e.id]))
for (const e of estruturasSaida) {
  const m = e.en.match(/ of (.+?)(?: to | with |$)/i)
  if (!m || /^set of /i.test(e.en)) continue
  const paiEn = m[1].trim()
  e.pai = traduzir(paiEn)
  const paiId = porEn.get(paiEn.toLowerCase())
  if (paiId && paiId !== e.id) e.paiId = paiId
}

estruturasSaida.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
writeFileSync(join(DADOS, 'sistemas.json'), JSON.stringify(sistemasSaida, null, 2) + '\n')
writeFileSync(join(DADOS, 'estruturas.json'), JSON.stringify(estruturasSaida) + '\n')
console.log(`✓ ${estruturasSaida.length} estruturas no catálogo`)
if (desconhecidas.size) console.warn('! Palavras sem tradução:', [...desconhecidas.keys()].join(', '))

// Conteúdo didático inicial (ossos) — só se ainda não existir, para não sobrescrever edições
const arqConteudo = join(DADOS, 'conteudo.json')
if (!existsSync(arqConteudo)) {
  const conteudo = {}
  for (const e of estruturasSaida) {
    const osso = traduzirOsso(e.en.toLowerCase())
    if (osso) conteudo[e.id] = { descricao: osso.descricao, correlacaoClinica: osso.correlacaoClinica }
  }
  writeFileSync(arqConteudo, JSON.stringify(conteudo, null, 2) + '\n')
  console.log(`✓ conteudo.json criado com ${Object.keys(conteudo).length} entradas`)
}
