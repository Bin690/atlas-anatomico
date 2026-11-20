#!/usr/bin/env node
/**
 * Gera o corpo feminino a partir dos órgãos de referência do HuBMAP (Human Reference Atlas,
 * Visible Human Female, licença CC BY 4.0) e o encaixa no "espaço do corpo" do atlas.
 *
 * Uso:
 *   node scripts/modelos/feminino.mjs <pasta-com-os-glb-do-hubmap>
 *
 * A pasta precisa ter (baixados de https://cdn.humanatlas.io/digital-objects/ref-organ/...):
 *   3d-vh-f-skin.glb, 3d-vh-f-pelvis.glb, 3d-vh-f-uterus.glb, 3d-vh-f-ovary-{l,r}.glb,
 *   3d-vh-f-fallopian-tube-{l,r}.glb, 3d-vh-f-mammary-gland-{l,r}.glb, 3d-vh-f-knee-{l,r}.glb
 *
 * Saída:
 *   public/models/pele-feminina.glb    pele feminina deformada para vestir o esqueleto do atlas
 *   public/models/genital-feminino.glb útero, tubas uterinas, ovários e mamas
 *   src/data/feminino.json             camadas femininas, estruturas e o que é só masculino (gerado)
 *
 * Encaixe:
 *   1. Translação única que leva a pelve feminina à pelve do esqueleto do atlas (os dois modelos já
 *      usam metros, y para cima, frente em +z e esquerda do paciente em +x; a escala é a mesma).
 *   2. A doadora do Visible Human está com braços abertos e pernas afastadas, e tem pernas mais curtas
 *      que o esqueleto do atlas. A pele é deformada como num "rig": cada segmento do membro (coxa,
 *      perna, braço, antebraço, mão) é girado e esticado até o osso correspondente do atlas. Os pesos
 *      de cada membro são suavizados pela própria malha (interpolação harmônica) na axila e na
 *      virilha, para não abrir costuras.
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt, prune, simplifyPrimitive, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { calcularNormais } from './superficie.mjs'
import { versionarDados } from './versionar.mjs'

const RAIZ = new URL('../..', import.meta.url).pathname
const SAIDA = join(RAIZ, 'public/models')
const DADOS = join(RAIZ, 'src/data')
const pasta = process.argv[2]
if (!pasta) {
  console.error('Uso: node scripts/modelos/feminino.mjs <pasta-com-os-glb-do-hubmap>')
  process.exit(1)
}

await MeshoptDecoder.ready
await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/** Malhas de um .glb em coordenadas do mundo: [{ nome, posicoes: Float32Array, indices: Uint32Array }]. */
async function lerMalhas(arquivo) {
  const doc = await io.read(arquivo)
  const out = []
  for (const no of doc.getRoot().listNodes()) {
    const malha = no.getMesh()
    if (!malha) continue
    const M = no.getWorldMatrix()
    for (const prim of malha.listPrimitives()) {
      const a = prim.getAttribute('POSITION')
      const n = a.getCount()
      const pos = new Float32Array(n * 3)
      const v = [0, 0, 0]
      for (let i = 0; i < n; i++) {
        a.getElement(i, v)
        for (let k = 0; k < 3; k++) pos[3 * i + k] = M[k] * v[0] + M[4 + k] * v[1] + M[8 + k] * v[2] + M[12 + k]
      }
      const ind = prim.getIndices()
      const indices = ind ? Uint32Array.from(ind.getArray()) : Uint32Array.from({ length: n }, (_, i) => i)
      out.push({ nome: no.getName(), posicoes: pos, indices })
    }
  }
  return out
}

const hubmap = (nome) => lerMalhas(join(pasta, nome))
const atlas = (nome) => lerMalhas(join(SAIDA, nome))
const porNome = (malhas, re) => malhas.filter((m) => re.test(m.nome))

// ---------------------------------------------------------------------------
// Geometria básica
// ---------------------------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norma = (a) => Math.hypot(a[0], a[1], a[2])
const unit = (a) => mul(a, 1 / norma(a))
const lerp = (a, b, t) => add(a, mul(sub(b, a), t))
const espelhar = (p) => [-p[0], p[1], p[2]]
const smooth = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const fmt = (p) => `(${p.map((x) => x.toFixed(3)).join(', ')})`

/** Pontos de uma lista de malhas. */
function pontos(malhas) {
  const out = []
  for (const m of malhas) for (let i = 0; i < m.posicoes.length; i += 3) out.push([m.posicoes[i], m.posicoes[i + 1], m.posicoes[i + 2]])
  return out
}
const media = (pts) => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length)
/** Média dos 3% de pontos mais altos e mais baixos (extremidades de um osso longo). */
function pontas(pts) {
  const ord = [...pts].sort((a, b) => b[1] - a[1])
  const k = Math.max(3, Math.floor(pts.length * 0.03))
  return { topo: media(ord.slice(0, k)), base: media(ord.slice(-k)) }
}
function caixa(pts) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const p of pts)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k])
      max[k] = Math.max(max[k], p[k])
    }
  return { min, max }
}

/** Rotação mínima que leva a direção unitária a para b (Rodrigues), como função. */
function rotacao(a, b) {
  const v = cross(a, b)
  const s = norma(v)
  const c = dot(a, b)
  if (s < 1e-9) return (p) => p
  const k = mul(v, 1 / s)
  return (p) => add(add(mul(p, c), mul(cross(k, p), s)), mul(k, dot(k, p) * (1 - c)))
}

/**
 * Transformação de um segmento de membro: leva o segmento feminino [A, B] ao masculino [A2, B2],
 * girando e esticando ao longo do eixo; a espessura é multiplicada por `radial` (1 = preservada).
 * Com `largura` (mão), o eixo transversal da palma feminina vai para o da mão do atlas, o que corrige
 * a rotação em torno do antebraço, e a largura da palma passa a ser a do atlas.
 */
function segmento(A, B, A2, B2, radial = 1, largura = null) {
  const d = unit(sub(B, A))
  const d2 = unit(sub(B2, A2))
  const k = norma(sub(B2, A2)) / norma(sub(B, A))
  const R = rotacao(d, d2)
  let aplicarPerp = (perp) => R(mul(perp, radial))
  if (largura) {
    const eF = largura.eixoF
    const nF = cross(d, eF)
    let eM = largura.eixoM
    if (dot(R(eF), eM) < 0) eM = mul(eM, -1) // menor torção possível
    const nM = cross(d2, eM)
    const escala = largura.larguraM / largura.larguraF
    aplicarPerp = (perp) => add(mul(eM, dot(perp, eF) * escala), mul(nM, dot(perp, nF) * radial))
  }
  return {
    A,
    d,
    L: norma(sub(B, A)),
    aplicar(p) {
      const v = sub(p, A)
      const a = dot(v, d)
      return add(add(A2, mul(d2, a * k)), aplicarPerp(sub(v, mul(d, a))))
    },
  }
}

/**
 * Eixo transversal (largura) de um conjunto de pontos em volta do eixo `d` que passa por `origem`:
 * maior variância no plano perpendicular. Retorna o eixo e a largura (percentis 3–97%).
 */
function eixoLargura(pts, origem, d) {
  const base1 = unit(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]))
  const base2 = cross(d, base1)
  const uv = pts.map((p) => {
    const v = sub(p, origem)
    return [dot(v, base1), dot(v, base2)]
  })
  const mu = [0, 1].map((k) => uv.reduce((s, q) => s + q[k], 0) / uv.length)
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const [u, v] of uv) {
    sxx += (u - mu[0]) ** 2
    syy += (v - mu[1]) ** 2
    sxy += (u - mu[0]) * (v - mu[1])
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const eixo = add(mul(base1, Math.cos(ang)), mul(base2, Math.sin(ang)))
  const proj = pts.map((p) => dot(sub(p, origem), eixo)).sort((a, b) => a - b)
  const q = (f) => proj[Math.floor(f * (proj.length - 1))]
  return { eixo, largura: q(0.97) - q(0.03) }
}

/** Cadeia de segmentos (ex.: ombro→cotovelo→punho→ponta dos dedos) com transição suave nas articulações. */
function cadeia(juntasF, juntasM, transicao, radiais = [], larguras = []) {
  const segs = []
  for (let i = 0; i + 1 < juntasF.length; i++)
    segs.push(segmento(juntasF[i], juntasF[i + 1], juntasM[i], juntasM[i + 1], radiais[i] ?? 1, larguras[i] ?? null))
  return (p) => {
    let r = segs[0].aplicar(p)
    for (let i = 1; i < segs.length; i++) {
      const anterior = segs[i - 1]
      const u = smooth(dot(sub(p, anterior.A), anterior.d) - anterior.L, -transicao, transicao)
      if (u > 0) r = lerp(r, segs[i].aplicar(p), u)
    }
    return r
  }
}

// ---------------------------------------------------------------------------
// 1. Translação: pelve feminina -> pelve do atlas
// ---------------------------------------------------------------------------
const pelveF = await hubmap('3d-vh-f-pelvis.glb')
const esqueleto = await atlas('esqueleto.glb')
const estruturas = JSON.parse(readFileSync(join(DADOS, 'estruturas.json'), 'utf8'))
const idPorEn = new Map(estruturas.map((e) => [e.en.toLowerCase(), e.id]))
const osso = (en) => {
  const id = idPorEn.get(en.toLowerCase())
  const m = esqueleto.filter((x) => x.nome === id)
  if (!m.length) throw new Error(`osso não encontrado no esqueleto do atlas: ${en}`)
  return pontos(m)
}

const cxPelveF = caixa(pontos(porNome(pelveF, /ilium|ischium|pubis/)))
const cxPelveM = caixa([...osso('Right hip bone'), ...osso('Left hip bone')])
const sacroF = caixa(pontos(porNome(pelveF, /sacrum/)))
const sacroM = caixa(osso('Sacrum'))
// x: linha média; y: média entre a crista ilíaca e o túber isquiático; z: entre o sacro e a sínfise púbica
const T = [
  (cxPelveM.min[0] + cxPelveM.max[0]) / 2 - (cxPelveF.min[0] + cxPelveF.max[0]) / 2,
  (cxPelveM.min[1] + cxPelveM.max[1]) / 2 - (cxPelveF.min[1] + cxPelveF.max[1]) / 2,
  (sacroM.min[2] + cxPelveM.max[2]) / 2 - (sacroF.min[2] + cxPelveF.max[2]) / 2,
]
console.log(`Translação da pelve: ${fmt(T)}`)
const transladar = (malhas) => {
  for (const m of malhas)
    for (let i = 0; i < m.posicoes.length; i += 3) for (let k = 0; k < 3; k++) m.posicoes[i + k] += T[k]
  return malhas
}

// ---------------------------------------------------------------------------
// 2. Articulações dos dois corpos (lado direito; o esquerdo é espelhado)
// ---------------------------------------------------------------------------
const joelhoF = transladar(await hubmap('3d-vh-f-knee-r.glb'))
const femurF = pontas(pontos(porNome(joelhoF, /^VH_F_femur_R$/)))
const tibiaF = pontas(pontos(porNome(joelhoF, /^VH_F_tibia_R$/)))
const femurM = pontas(osso('Right femur'))
const tibiaM = pontas(osso('Right tibia'))
const pernaF = [femurF.topo, lerp(femurF.base, tibiaF.topo, 0.5), tibiaF.base]
const pernaM = [femurM.topo, lerp(femurM.base, tibiaM.topo, 0.5), tibiaM.base]
// Ponta do pé do atlas: ponto mais à frente dos ossos do pé direito
const pontaPeM = (() => {
  const pts = pontos(esqueleto).filter((p) => p[1] < 0.06 && p[0] < -0.01)
  const ord = pts.sort((a, b) => b[2] - a[2])
  return media(ord.slice(0, 10))
})()

const umeroM = pontas(osso('Right humerus'))
const radioM = pontas(osso('Right radius'))
const ulnaM = pontas(osso('Right ulna'))
// O topo do úmero é o alto da cabeça; o centro da articulação fica ~2 cm abaixo
const ombroM = add(umeroM.topo, [-0.004, -0.022, 0])
const cotoveloM = lerp(umeroM.base, ulnaM.topo, 0.5)
const punhoM = lerp(radioM.base, ulnaM.base, 0.5)

// Ponta dos dedos no atlas: ponta da falange distal do dedo médio (+ ~8 mm de polpa digital).
// A pele masculina não serve: os dedos dela estão curvados para a frente, ao contrário dos ossos.
const peleM = await atlas('pele.glb')
const pontaDedosM = (() => {
  const falange = pontas(osso('Distal phalanx of right middle finger'))
  return add(falange.base, mul(unit(sub(falange.base, falange.topo)), 0.008))
})()
const bracoM = [ombroM, cotoveloM, punhoM, pontaDedosM]

// Pele feminina (soldada para ter conectividade)
const peleBruta = transladar(await hubmap('3d-vh-f-skin.glb'))[0]
const { posicoes: P, indices: I } = soldar(peleBruta.posicoes, peleBruta.indices)
const nV = P.length / 3
const vert = (i) => [P[3 * i], P[3 * i + 1], P[3 * i + 2]]
console.log(`Pele feminina: ${nV} vértices, ${I.length / 3} triângulos`)

// Ponta do pé feminino: vértice mais à frente da pele perto do chão, lado direito
const pontaPeF = (() => {
  let soloF = Infinity
  for (let i = 1; i < P.length; i += 3) soloF = Math.min(soloF, P[i])
  const pts = []
  for (let i = 0; i < nV; i++) if (P[3 * i + 1] < soloF + 0.04 && P[3 * i] < -0.01) pts.push(vert(i))
  const ord = pts.sort((a, b) => b[2] - a[2])
  return media(ord.slice(0, 10))
})()
pernaF.push(pontaPeF)
pernaM.push(add(pontaPeM, [0, 0, 0.012])) // a pele passa ~1 cm à frente da falange distal

// Cabeça: leva a cabeça feminina ao crânio do atlas (alto da cabeça, nuca e ponta do nariz da pele)
function marcosCabeca(pts) {
  const topo = Math.max(...pts.map((p) => p[1]))
  const faixa = pts.filter((p) => p[1] > topo - 0.2 && p[1] < topo - 0.05 && Math.abs(p[0]) < 0.03)
  const nuca = Math.min(...faixa.map((p) => p[2]))
  const nariz = Math.max(...faixa.filter((p) => p[1] < topo - 0.08).map((p) => p[2]))
  return { topo, nuca, nariz }
}
const cabecaF = marcosCabeca(Array.from({ length: nV }, (_, i) => vert(i)).filter((p) => p[1] > 1.3))
const cabecaM = marcosCabeca(pontos(porNome(peleM, new RegExp(`^${idPorEn.get('skin')}$`))).filter((p) => p[1] > 1.3))
const escalaCabeca = (cabecaM.nariz - cabecaM.nuca) / (cabecaF.nariz - cabecaF.nuca)
const cabeca = (p) => [
  p[0] * escalaCabeca,
  cabecaM.topo + (p[1] - cabecaF.topo) * escalaCabeca,
  cabecaM.nuca + (p[2] - cabecaF.nuca) * escalaCabeca,
]
console.log(
  `Cabeça F: topo ${cabecaF.topo.toFixed(3)} nuca ${cabecaF.nuca.toFixed(3)} nariz ${cabecaF.nariz.toFixed(3)} | ` +
    `M: topo ${cabecaM.topo.toFixed(3)} nuca ${cabecaM.nuca.toFixed(3)} nariz ${cabecaM.nariz.toFixed(3)} | escala ${escalaCabeca.toFixed(3)}`,
)

/** Junta vértices na mesma posição (o arquivo do HuBMAP repete vértices por triângulo). */
function soldar(pos, ind) {
  const mapa = new Map()
  const novo = new Uint32Array(pos.length / 3)
  const saida = []
  for (let i = 0; i < pos.length / 3; i++) {
    const ch = `${Math.round(pos[3 * i] * 1e5)},${Math.round(pos[3 * i + 1] * 1e5)},${Math.round(pos[3 * i + 2] * 1e5)}`
    let j = mapa.get(ch)
    if (j === undefined) {
      j = saida.length / 3
      mapa.set(ch, j)
      saida.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2])
    }
    novo[i] = j
  }
  const indices = new Uint32Array(ind.length)
  for (let i = 0; i < ind.length; i++) indices[i] = novo[ind[i]]
  return { posicoes: Float32Array.from(saida), indices }
}

// Faixas horizontais de 1 cm: o tronco é o grupo (separado por lacunas em x) que contém a linha média
const FAIXA = 0.01
const faixas = new Map()
for (let i = 0; i < nV; i++) {
  const f = Math.floor(P[3 * i + 1] / FAIXA)
  if (!faixas.has(f)) faixas.set(f, [])
  faixas.get(f).push(i)
}
const tronco = new Map() // faixa -> [xmin, xmax] do tronco
for (const [f, ids] of faixas) {
  const xs = ids.map((i) => P[3 * i]).sort((a, b) => a - b)
  const grupos = []
  let ini = xs[0]
  for (let k = 1; k <= xs.length; k++) {
    if (k === xs.length || xs[k] - xs[k - 1] > 0.012) {
      grupos.push([ini, xs[k - 1]])
      ini = xs[k]
    }
  }
  const g = grupos.find(([a, b]) => a <= 0.005 && b >= -0.005)
  if (g) tronco.set(f, g)
}
// Axila: faixa mais alta (abaixo dos ombros) em que há grupos laterais separados do tronco
const axila = (() => {
  let y = 0
  for (const [f, [a, b]] of tronco) {
    const ids = faixas.get(f)
    const fora = ids.some((i) => P[3 * i] < a - 0.005) && ids.some((i) => P[3 * i] > b + 0.005)
    if (fora && f * FAIXA > 1.0 && f * FAIXA < 1.45) y = Math.max(y, f * FAIXA)
  }
  return y
})()
console.log(`Axila em y = ${axila.toFixed(3)}`)
const foraDoTronco = (i) => {
  const t = tronco.get(Math.floor(P[3 * i + 1] / FAIXA))
  return t ? P[3 * i] < t[0] - 0.002 || P[3 * i] > t[1] + 0.002 : false
}

// Braço feminino: linha central a partir dos centros dos grupos laterais abaixo da axila
const bracoF = (() => {
  const centros = []
  for (let y = axila - FAIXA; y > 0.5; y -= FAIXA) {
    const ids = (faixas.get(Math.floor(y / FAIXA)) ?? []).filter((i) => P[3 * i] < 0 && foraDoTronco(i))
    if (ids.length < 8) break
    centros.push(media(ids.map(vert)))
  }
  const ponta = (() => {
    const ids = []
    for (let i = 0; i < nV; i++) if (P[3 * i] < 0 && foraDoTronco(i) && P[3 * i + 1] < axila) ids.push(i)
    const ord = ids.map(vert).sort((a, b) => a[1] - b[1])
    return media(ord.slice(0, 10))
  })()
  // Ombro: prolonga a linha do braço até a altura proporcional à do atlas acima da axila
  const dir = unit(sub(centros[0], centros[Math.min(8, centros.length - 1)]))
  const subida = ombroM[1] - (axila + 0.01) - 0.02
  const ombro = add(centros[0], mul(dir, subida / dir[1]))
  ombro[0] += 0.025 // o centro da cabeça do úmero fica medial à linha central do braço
  // Cotovelo e punho: mesma proporção do comprimento do membro que no atlas
  const linha = [ombro, ...centros, ponta]
  const acum = [0]
  for (let k = 1; k < linha.length; k++) acum.push(acum[k - 1] + norma(sub(linha[k], linha[k - 1])))
  const noComprimento = (s) => {
    for (let k = 1; k < linha.length; k++)
      if (acum[k] >= s) return lerp(linha[k - 1], linha[k], (s - acum[k - 1]) / (acum[k] - acum[k - 1]))
    return ponta
  }
  const total = acum.at(-1)
  const totalM = norma(sub(cotoveloM, ombroM)) + norma(sub(punhoM, cotoveloM)) + norma(sub(pontaDedosM, punhoM))
  const fE = norma(sub(cotoveloM, ombroM)) / totalM
  const fW = fE + norma(sub(punhoM, cotoveloM)) / totalM
  return [ombro, noComprimento(fE * total), noComprimento(fW * total), ponta]
})()

console.log('Perna  F:', pernaF.map(fmt).join(' → '))
console.log('Perna  M:', pernaM.map(fmt).join(' → '))
console.log('Braço  F:', bracoF.map(fmt).join(' → '))
console.log('Braço  M:', bracoM.map(fmt).join(' → '))

// ---------------------------------------------------------------------------
// 3. Pesos dos membros (fixos onde o membro é óbvio, harmônicos na transição)
// ---------------------------------------------------------------------------
const vizinhos = (() => {
  const conj = Array.from({ length: nV }, () => new Set())
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]]
    conj[a].add(b).add(c)
    conj[b].add(a).add(c)
    conj[c].add(a).add(b)
  }
  return conj.map((s) => Uint32Array.from(s))
})()

/** Interpolação harmônica: mantém os valores fixos e suaviza os demais pela malha. */
function harmonico(fixo, valor, iteracoes) {
  const w = Float32Array.from(valor)
  const livres = []
  for (let i = 0; i < nV; i++) if (!fixo[i]) livres.push(i)
  for (let it = 0; it < iteracoes; it++)
    for (const i of livres) {
      const nb = vizinhos[i]
      if (!nb.length) continue
      let s = 0
      for (const j of nb) s += w[j]
      w[i] = s / nb.length
    }
  return w
}

const yQuadril = pernaF[0][1]
const pesos = (lado) => {
  const sinal = lado === 'direito' ? -1 : 1
  // Braço
  const fixoB = new Uint8Array(nV)
  const valB = new Float32Array(nV)
  for (let i = 0; i < nV; i++) {
    const [x, y] = [P[3 * i], P[3 * i + 1]]
    if (y < axila - 0.005 && foraDoTronco(i)) {
      fixoB[i] = 1
      valB[i] = Math.sign(x) === sinal ? 1 : 0
    } else if (y < axila - 0.005 || y > ombroM[1] + 0.09 || Math.abs(x) < 0.1 || Math.sign(x) !== sinal) fixoB[i] = 1
  }
  // Perna
  const fixoP = new Uint8Array(nV)
  const valP = new Float32Array(nV)
  for (let i = 0; i < nV; i++) {
    const [x, y] = [P[3 * i], P[3 * i + 1]]
    if (fixoB[i] && valB[i] === 1) fixoP[i] = 1
    else if (foraDoTronco(i) && y > yQuadril - 0.15) fixoP[i] = 1 // mãos e antebraços ao lado do quadril
    else if (y < yQuadril - 0.13) {
      fixoP[i] = 1
      valP[i] = Math.sign(x) === sinal ? 1 : 0
    } else if (y > yQuadril + 0.08) fixoP[i] = 1
  }
  return { braco: harmonico(fixoB, valB, 400), perna: harmonico(fixoP, valP, 400) }
}
const wD = pesos('direito')
const wE = pesos('esquerdo')

// ---------------------------------------------------------------------------
// 4. Deformação
// ---------------------------------------------------------------------------
// Espessura: antebraço e perna da doadora são mais finos que os ossos do atlas
const RAIO_BRACO = [1, 1.12, 1]
// Mão: orientação e largura da palma (pele feminina × ossos da mão do atlas + ~1 cm de partes moles por lado)
const larguraMao = (() => {
  const [, , W, Tp] = bracoF
  const dF = unit(sub(Tp, W))
  const LF = norma(sub(Tp, W))
  const ptsF = []
  for (let i = 0; i < nV; i++) {
    if (P[3 * i] > -0.1) continue
    const v = sub(vert(i), W)
    const a = dot(v, dF)
    if (a > 0.15 * LF && a < 0.6 * LF && norma(sub(v, mul(dF, a))) < 0.07) ptsF.push(vert(i))
  }
  const ossos = estruturas
    .filter((e) => e.sistema === 'esqueleto' && /right/i.test(e.en))
    .filter((e) => /metacarp|capitate|hamate|trapezi|phalanx of right (index|middle|ring|little)/i.test(e.en))
    .filter((e) => /metacarp|proximal phalanx/i.test(e.en) && !/toe|foot|first/i.test(e.en)) // palma, sem o polegar
    .map((e) => e.id)
  const ptsM = pontos(esqueleto.filter((m) => ossos.includes(m.nome)))
  const dM = unit(sub(pontaDedosM, punhoM))
  const f = eixoLargura(ptsF, W, dF)
  const m = eixoLargura(ptsM, punhoM, dM)
  console.log(`Palma: largura F ${f.largura.toFixed(3)} m, M (ossos) ${m.largura.toFixed(3)} m, ${ptsF.length}/${ptsM.length} pontos`)
  return { eixoF: f.eixo, larguraF: f.largura, eixoM: m.eixo, larguraM: m.largura + 0.02 }
})()
const LARGURA_BRACO = [null, null, larguraMao]
const RAIO_PERNA = [1, 1.15, 1]
const bracoD = cadeia(bracoF, bracoM, 0.035, RAIO_BRACO, LARGURA_BRACO)
const larguraMaoE = { ...larguraMao, eixoF: espelhar(larguraMao.eixoF), eixoM: espelhar(larguraMao.eixoM) }
const bracoE = cadeia(bracoF.map(espelhar), bracoM.map(espelhar), 0.035, RAIO_BRACO, [null, null, larguraMaoE])
const pernaD = cadeia(pernaF, pernaM, 0.05, RAIO_PERNA)
const pernaE = cadeia(pernaF.map(espelhar), pernaM.map(espelhar), 0.05, RAIO_PERNA)
// Peso da cabeça: 0 abaixo do pescoço, 1 acima do queixo; some nos ombros
const pesoCabeca = (p) => smooth(p[1], cabecaF.topo - 0.31, cabecaF.topo - 0.21) * (1 - smooth(Math.abs(p[0]), 0.09, 0.15))

const Pd = new Float32Array(P.length)
for (let i = 0; i < nV; i++) {
  const p = vert(i)
  const pesosI = [
    [wD.braco[i], bracoD],
    [wE.braco[i], bracoE],
    [wD.perna[i], pernaD],
    [wE.perna[i], pernaE],
    [pesoCabeca(p), cabeca],
  ].filter(([w]) => w > 1e-4)
  const soma = pesosI.reduce((s, [w]) => s + w, 0)
  let r = mul(p, Math.max(0, 1 - soma))
  for (const [w, f] of pesosI) r = add(r, mul(f(p), w / Math.max(1, soma)))
  Pd.set(r, 3 * i)
}
// Sola dos pés no chão (y = 0)
let minY = Infinity
for (let i = 1; i < Pd.length; i += 3) minY = Math.min(minY, Pd[i])
console.log(`Sola dos pés depois da deformação: y = ${minY.toFixed(3)} (ajustada para 0 nas pernas)`)
for (let i = 0; i < nV; i++) {
  const w = Math.min(1, wD.perna[i] + wE.perna[i])
  Pd[3 * i + 1] -= minY * w
}

// Braços e ombros: a doadora tinha braços e ombros bem mais volumosos que o modelo do atlas, e a pele
// ficava 4–5 cm por fora do deltoide e do trapézio. Aqui a pele é mantida entre 1 e 5 mm por fora
// da pele do atlas (que envolve os músculos certos). Tórax, mamas, quadris e coxas não mudam.
// Peso: braços (pesos do "rig") + cintura escapular (topo do ombro e trapézio), exceto perto das mamas
// (o tecido adiposo da mama vai até a axila: apertar a pele ali faria a mama atravessá-la)
const distanciaMama = await (async () => {
  const pts = []
  for (const arq of ['3d-vh-f-mammary-gland-r.glb', '3d-vh-f-mammary-gland-l.glb'])
    for (const m of transladar(await hubmap(arq))) if (/_fat_/.test(m.nome)) pts.push(...pontos([m]).filter((_, k) => k % 7 === 0))
  const CEL = 0.03
  const grade = new Map()
  for (const p of pts) {
    const k = p.map((v) => Math.floor(v / CEL)).join(',')
    if (!grade.has(k)) grade.set(k, [])
    grade.get(k).push(p)
  }
  return (p) => {
    const g = p.map((v) => Math.floor(v / CEL))
    let d = Infinity
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++)
          for (const q of grade.get(`${g[0] + x},${g[1] + y},${g[2] + z}`) ?? []) d = Math.min(d, norma(sub(p, q)))
    return d
  }
})()
const pesoOmbroBraco = (i) => {
  const p = [Pd[3 * i], Pd[3 * i + 1], Pd[3 * i + 2]]
  const braco = Math.min(1, 1.5 * (wD.braco[i] + wE.braco[i]))
  const cintura = smooth(Math.abs(p[0]), 0.06, 0.15) * smooth(p[1], 1.2, 1.32) * (1 - smooth(p[1], 1.48, 1.58))
  const longeDaMama = smooth(distanciaMama(p), 0.005, 0.035)
  return Math.max(braco, cintura) * longeDaMama
}
// Três passagens: cada uma é suavizada (sem espinhos) e a seguinte corrige o que a suavização diluiu.
// Suavização forte (60): o braço fica do tamanho certo sem copiar o relevo muscular da pele masculina
for (let passada = 0; passada < 3; passada++) ajustarAoAtlas(pesoOmbroBraco, 0.001, 0.005, 60)

// Barriga: a doadora tinha o abdome ~4 cm à frente da pele do atlas. Entre o púbis e as mamas, a frente
// da barriga passa a ficar até 8 mm por fora da pele do atlas. Flancos e costas não mudam (mexer neles
// marcava a cintura e deixava uma linha no alto das nádegas). Monte do púbis, quadris e mamas também não.
const pesoBarriga = (i) => {
  const p = [Pd[3 * i], Pd[3 * i + 1], Pd[3 * i + 2]]
  if (wD.braco[i] + wE.braco[i] > 0.3) return 0
  const faixa = smooth(p[1], 0.92, 1.02) * (1 - smooth(p[1], 1.15, 1.3))
  const frente = smooth(p[2], -0.005, 0.045) * (1 - smooth(Math.abs(p[0]), 0.08, 0.15))
  return faixa * frente * smooth(distanciaMama(p), 0.005, 0.035)
}
// Suavização forte (80 iterações): a barriga recua como um todo e mantém a superfície lisa da doadora,
// sem copiar o relevo dos abdominais da pele masculina
for (let passada = 0; passada < 3; passada++) ajustarAoAtlas(pesoBarriga, 0.002, 0.008, 80, 'Barriga')

/** Ponto mais próximo de p no triângulo abc (Ericson, Real-Time Collision Detection). */
function pontoNoTriangulo(p, a, b, c) {
  const ab = sub(b, a)
  const ac = sub(c, a)
  const ap = sub(p, a)
  const d1 = dot(ab, ap)
  const d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return a
  const bp = sub(p, b)
  const d3 = dot(ab, bp)
  const d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)))
  const cp = sub(p, c)
  const d5 = dot(ab, cp)
  const d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))))
  const den = 1 / (va + vb + vc)
  return add(a, add(mul(ab, vb * den), mul(ac, vc * den)))
}

/**
 * Mantém a pele feminina (onde peso(i) > 0) a uma distância entre `dentro` e `fora` da pele do atlas,
 * medida na normal do triângulo mais próximo. Peso 1 = ajuste completo.
 */
function ajustarAoAtlas(peso, dentro, fora, suavizacao = 12, rotulo = 'Braços e ombros') {
  const pele = porNome(peleM, new RegExp(`^${idPorEn.get('skin')}$`))[0]
  const PM = pele.posicoes
  const IM = pele.indices
  const CEL = 0.03
  const grade = new Map()
  const chave = (x, y, z) => `${Math.floor(x / CEL)},${Math.floor(y / CEL)},${Math.floor(z / CEL)}`
  const tris = []
  for (let t = 0; t < IM.length; t += 3) {
    const v = [IM[t], IM[t + 1], IM[t + 2]].map((k) => [PM[3 * k], PM[3 * k + 1], PM[3 * k + 2]])
    const n = cross(sub(v[1], v[0]), sub(v[2], v[0]))
    if (norma(n) < 1e-12) continue
    const id = tris.length
    tris.push({ v, n: unit(n) })
    const cx = caixa(v)
    for (let x = Math.floor(cx.min[0] / CEL); x <= Math.floor(cx.max[0] / CEL); x++)
      for (let y = Math.floor(cx.min[1] / CEL); y <= Math.floor(cx.max[1] / CEL); y++)
        for (let z = Math.floor(cx.min[2] / CEL); z <= Math.floor(cx.max[2] / CEL); z++) {
          const k = `${x},${y},${z}`
          if (!grade.has(k)) grade.set(k, [])
          grade.get(k).push(id)
        }
  }
  const proximo = (p) => {
    let melhor = null
    let d = Infinity
    const [gx, gy, gz] = chave(...p).split(',').map(Number)
    for (let x = gx - 2; x <= gx + 2; x++)
      for (let y = gy - 2; y <= gy + 2; y++)
        for (let z = gz - 2; z <= gz + 2; z++)
          for (const id of grade.get(`${x},${y},${z}`) ?? []) {
            const q = pontoNoTriangulo(p, ...tris[id].v)
            const dq = norma(sub(p, q))
            if (dq < d) [melhor, d] = [{ q, n: tris[id].n }, dq]
          }
    return melhor
  }
  // Calcula os deslocamentos; o sentido das normais (para fora) é decidido pela maioria
  const ajustes = []
  for (let i = 0; i < nV; i++) {
    const w = peso(i)
    if (w <= 0.01) continue
    const p = [Pd[3 * i], Pd[3 * i + 1], Pd[3 * i + 2]]
    const m = proximo(p)
    if (m) ajustes.push({ i, w, n: m.n, d: dot(sub(p, m.q), m.n) })
  }
  const positivos = ajustes.filter((a) => a.d > 0).length
  const sentido = positivos >= ajustes.length / 2 ? 1 : -1
  // Deslocamento de cada vértice (limitado a 5 cm), depois suavizado pela malha: sem isso, um vértice
  // que pega a normal de um triângulo vizinho "errado" vira um espinho
  const D = new Float32Array(nV * 3)
  for (const a of ajustes) {
    const d = a.d * sentido
    const alvo = Math.min(fora, Math.max(dentro, d))
    const delta = Math.max(-0.05, Math.min(0.05, (d - alvo) * a.w))
    for (let k = 0; k < 3; k++) D[3 * a.i + k] = -a.n[k] * sentido * delta
  }
  const afetados = new Set()
  for (const a of ajustes) {
    afetados.add(a.i)
    for (const j of vizinhos[a.i]) afetados.add(j)
  }
  for (let it = 0; it < suavizacao; it++) {
    const novo = Float32Array.from(D)
    for (const i of afetados) {
      const nb = vizinhos[i]
      for (let k = 0; k < 3; k++) {
        let soma = D[3 * i + k]
        for (const j of nb) soma += D[3 * j + k]
        novo[3 * i + k] = soma / (nb.length + 1)
      }
    }
    D.set(novo)
  }
  let movidos = 0
  let soma = 0
  for (const i of afetados) {
    const m = Math.hypot(D[3 * i], D[3 * i + 1], D[3 * i + 2])
    if (m < 1e-4) continue
    for (let k = 0; k < 3; k++) Pd[3 * i + k] += D[3 * i + k]
    movidos++
    soma += m
  }
  console.log(`${rotulo}: ${movidos} vértices ajustados à pele do atlas (média ${((soma / Math.max(1, movidos)) * 100).toFixed(1)} cm)`)
}

// ---------------------------------------------------------------------------
// 5. Gravação
// ---------------------------------------------------------------------------
function corLinear(hex) {
  const canal = (i) => {
    const c = Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return [canal(0), canal(1), canal(2), 1]
}

/**
 * Grava um .glb com uma mesh por item ({ id, posicoes, indices, cor }), simplificado e comprimido.
 * Cada malha é reduzida até `alvo` triângulos (no máximo), com erro geométrico até `erro`.
 */
async function gravar(nome, itens, alvo, erro) {
  const doc = new Document()
  doc.createBuffer()
  const cena = doc.createScene(nome)
  const materiais = new Map()
  const material = (cor) => {
    if (!materiais.has(cor))
      materiais.set(cor, doc.createMaterial(cor).setBaseColorFactor(corLinear(cor)).setRoughnessFactor(0.55).setMetallicFactor(0))
    return materiais.get(cor)
  }
  let triAntes = 0
  const prims = []
  for (const it of itens) {
    triAntes += it.indices.length / 3
    // Solda antes das normais: com vértices repetidos por triângulo, as normais sairiam facetadas
    // e impediriam a simplificação
    const { posicoes, indices } = soldar(it.posicoes, it.indices)
    const normais = Float32Array.from(calcularNormais(posicoes, indices))
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(posicoes))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normais))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices))
      .setMaterial(material(it.cor))
    cena.addChild(doc.createNode(it.id).setMesh(doc.createMesh(it.id).addPrimitive(prim)))
    prims.push([prim, it.alvo ?? alvo, indices.length / 3, !!it.travarBorda, it.erro ?? erro])
  }
  await doc.transform(weld())
  for (const [prim, alvoItem, tri, travarBorda, erroItem] of prims)
    if (tri > alvoItem)
      simplifyPrimitive(prim, {
        simplifier: MeshoptSimplifier,
        ratio: alvoItem / tri,
        error: erroItem,
        lockBorder: travarBorda,
      })
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  let tri = 0
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tri += p.getIndices().getCount() / 3
  const arquivo = join(SAIDA, `${nome}.glb`)
  await new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
    .write(arquivo, doc)
  console.log(`✓ ${nome.padEnd(17)} ${String(itens.length).padStart(3)} estruturas  ${triAntes} → ${tri} tri  ${Math.round(readFileSync(arquivo).length / 1024)} KB`)
}

/**
 * Mãos: a doadora tem dedos e polegar em outra posição que o esqueleto do atlas, e girar a mão inteira
 * não basta. A mão da pele feminina é cortada no punho e substituída pela mão da pele do atlas (feita
 * do mesmo corpo que os ossos e músculos, então alinhada por construção). Nos 4 cm antes do corte, a
 * pele feminina é levada aos poucos à forma do punho do atlas, para fechar a emenda.
 */
function trocarMaos() {
  const idPele = idPorEn.get('skin')
  const peleAtlas = porNome(peleM, new RegExp(`^${idPele}$`))[0]
  const PM = peleAtlas.posicoes
  const IM = peleAtlas.indices
  const nM = PM.length / 3
  const vizM = Array.from({ length: nM }, () => new Set())
  for (let t = 0; t < IM.length; t += 3)
    for (let k = 0; k < 3; k++) vizM[IM[t + k]].add(IM[t + ((k + 1) % 3)]).add(IM[t + ((k + 2) % 3)])
  const vM = (i) => [PM[3 * i], PM[3 * i + 1], PM[3 * i + 2]]
  const vF = (i) => [Pd[3 * i], Pd[3 * i + 1], Pd[3 * i + 2]]

  /** Vértices conectados à semente cujo "s" (posição ao longo do antebraço) passa no teste. */
  const inundar = (semente, viz, s, aceita) => {
    const visto = new Set([semente])
    const fila = [semente]
    while (fila.length) {
      const i = fila.pop()
      for (const j of viz[i])
        if (!visto.has(j) && aceita(s(j))) {
          visto.add(j)
          fila.push(j)
        }
    }
    return visto
  }
  const maisProximo = (n, v, alvo) => {
    let melhor = 0
    let d = Infinity
    for (let i = 0; i < n; i++) {
      const di = norma(sub(v(i), alvo))
      if (di < d) [melhor, d] = [i, di]
    }
    return melhor
  }

  const remover = new Set()
  const posicoes = Float32Array.from(Pd)
  const extras = [] // triângulos da mão do atlas (coordenadas)
  for (const sinal of [-1, 1]) {
    const lado = (p) => (sinal < 0 ? p : espelhar(p))
    const punho = lado(punhoM)
    const eixo = unit(sub(punho, lado(cotoveloM))) // eixo do antebraço, apontando para a mão
    const ponta = lado(pontaDedosM)
    const s = (p) => dot(sub(p, punho), eixo)
    // Feminino: tudo o que pertence a este braço (peso do "rig") e passa de 6 cm antes do punho.
    // Pelo peso, e não pela conectividade: há pedaços da pele da mão que não se ligam ao resto pela malha
    const pesoBraco = sinal < 0 ? wD.braco : wE.braco
    const regiaoF = []
    for (let i = 0; i < nV; i++) if (pesoBraco[i] > 0.5 && s(vF(i)) > -0.06) regiaoF.push(i)
    // Atlas: mão + antebraço até 6 cm antes do punho
    const sementeM = maisProximo(nM, vM, ponta)
    const regiaoM = inundar(sementeM, vizM, (j) => s(vM(j)), (x) => x > -0.06)
    // Perfil do punho do atlas: raio da pele em cada ângulo em volta do eixo, perto do corte
    const u1 = unit(cross(eixo, [0, 0, 1]))
    const u2 = cross(eixo, u1)
    const BINS = 48
    const angulo = (v) => {
      const a = Math.atan2(dot(v, u2), dot(v, u1))
      return Math.floor(((a + Math.PI) / (2 * Math.PI)) * BINS) % BINS
    }
    const raiosBin = Array.from({ length: BINS }, () => [])
    for (const j of regiaoM) {
      const v = sub(vM(j), punho)
      const sj = dot(v, eixo)
      if (Math.abs(sj) > 0.012) continue
      const radial = sub(v, mul(eixo, sj))
      raiosBin[angulo(radial)].push(norma(radial))
    }
    const perfil = raiosBin.map((rs) => (rs.length ? rs.sort((a, b) => a - b)[Math.floor(rs.length / 2)] : null))
    for (let k = 0; k < BINS; k++) // preenche ângulos sem vértice com o vizinho mais próximo
      if (perfil[k] === null)
        for (let d = 1; d < BINS && perfil[k] === null; d++)
          perfil[k] = perfil[(k + d) % BINS] ?? perfil[(k - d + BINS) % BINS]
    // A pele do atlas tem poucos vértices: suaviza o perfil (média móvel circular de 7 ângulos)
    const bruto = perfil.slice()
    for (let k = 0; k < BINS; k++) {
      let soma = 0
      for (let d = -3; d <= 3; d++) soma += bruto[(k + d + BINS) % BINS]
      perfil[k] = soma / 7
    }
    let removidos = 0
    let ajustados = 0
    for (const i of regiaoF) {
      const p = vF(i)
      const si = s(p)
      if (si > 0) {
        remover.add(i)
        removidos++
        continue
      }
      // Mantém a direção em volta do eixo e leva o raio ao do punho do atlas nesse ângulo
      const radial = sub(sub(p, punho), mul(eixo, si))
      const raio = perfil[angulo(radial)]
      // Restos da mão da doadora que a deformação deixou antes do plano do punho, longe do eixo
      // (formavam uma aba): vão por inteiro para a superfície do punho
      const resto = norma(radial) > 1.35 * raio
      const w = resto ? 1 : smooth(si, -0.06, -0.003)
      if (w <= 0) continue
      const alvo = add(add(punho, mul(eixo, si)), mul(unit(radial), raio))
      posicoes.set(lerp(p, alvo, w), 3 * i)
      ajustados++
    }
    for (let t = 0; t < IM.length; t += 3) {
      const tri = [IM[t], IM[t + 1], IM[t + 2]]
      // triângulos depois do corte, com ~1 cm de sobreposição na faixa já ajustada (fecha a emenda)
      if (tri.every((v) => regiaoM.has(v) && s(vM(v)) > -0.012))
        extras.push(...tri.map(vM))
    }
    console.log(`  mão ${sinal < 0 ? 'direita' : 'esquerda'}: ${removidos} vértices removidos, ${ajustados} ajustados no punho`)
  }
  // Monta: pele feminina sem as mãos + mãos do atlas. Perto dos punhos, descarta triângulos esticados
  // (aresta > 2,5 cm; a malha tem ~5 mm): são abas criadas pelo ajuste da faixa
  const punhos = [punhoM, espelhar(punhoM)]
  const ind = []
  let esticados = 0
  for (let t = 0; t < I.length; t += 3) {
    const tri = [I[t], I[t + 1], I[t + 2]]
    if (tri.some((v) => remover.has(v))) continue
    const v = tri.map((k) => [posicoes[3 * k], posicoes[3 * k + 1], posicoes[3 * k + 2]])
    const centro = mul(add(add(v[0], v[1]), v[2]), 1 / 3)
    const aresta = Math.max(norma(sub(v[0], v[1])), norma(sub(v[1], v[2])), norma(sub(v[2], v[0])))
    if (aresta > 0.025 && punhos.some((pu) => norma(sub(centro, pu)) < 0.12)) {
      esticados++
      continue
    }
    ind.push(...tri)
  }
  console.log(`  punhos: ${esticados} triângulos esticados descartados`)
  const base = nV
  const pos = Array.from(posicoes)
  extras.forEach((p, k) => {
    pos.push(...p)
    ind.push(base + k)
  })
  return { posicoes: Float32Array.from(pos), indices: Uint32Array.from(ind) }
}

/**
 * Regiões da vulva na pele deformada (coordenadas do corpo, medidas no perfil da linha média):
 * monte do púbis à frente da sínfise (y 0,845–0,925 m) e lábios maiores ao redor da rima do pudendo,
 * que desce e curva para trás até o períneo (y 0,795–0,85 m, z de +0,06 a −0,065 m).
 */
function recortarVulva() {
  const normais = calcularNormais(Pd, I)
  // Cada região é um conjunto de semiespaços lineares [a, b, c, d]: a·x + b·y + c·z + d >= 0,
  // mais um filtro por triângulo (orientação da normal), para a borda sair reta e lisa
  const largura = (x0, k) => [
    [-1, k, 0, x0 - 0.845 * k], //  x <= x0 + k·(y − 0,845)
    [1, k, 0, x0 - 0.845 * k], // −x <= x0 + k·(y − 0,845)
  ]
  const LABIO = [[0, 1, 0, -0.795], [0, -1, 0, 0.845], [0, 0, 1, 0.065], [0, 0, -1, 0.06]]
  const REGIOES = {
    monte: { planos: [[0, 1, 0, -0.845], [0, -1, 0, 0.925], [0, 0, 1, -0.03], ...largura(0.03, 0.6)], nz: 0.35 },
    // Lábios: continuam da ponta do monte (3 cm de cada lado) e afinam para trás, rumo ao períneo
    // De frente, o contorno é convexo: 3 cm no alto, 3,6 cm em y = 0,82 m e 2 cm embaixo
    D: { planos: [...LABIO, [-1, 0, 0, 0], [1, 0, 0.1, 0.03], [1, -0.24, 0, 0.2328], [1, 0.64, 0, -0.4888]] },
    E: { planos: [...LABIO, [1, 0, 0, 0], [-1, 0, 0.1, 0.03], [-1, -0.24, 0, 0.2328], [-1, 0.64, 0, -0.4888]] },
  }
  const f = (pl, p) => pl[0] * p[0] + pl[1] * p[1] + pl[2] * p[2] + pl[3]
  /** Sutherland–Hodgman: recorta um polígono 3D por um semiespaço. */
  const recortar = (poli, pl) => {
    const out = []
    for (let i = 0; i < poli.length; i++) {
      const a = poli[i]
      const b = poli[(i + 1) % poli.length]
      const fa = f(pl, a)
      const fb = f(pl, b)
      if (fa >= 0) out.push(a)
      if (fa >= 0 !== fb >= 0) {
        const t = fa / (fa - fb)
        out.push(a.map((x, k) => x + (b[k] - x) * t))
      }
    }
    return out
  }
  const grupos = { monte: [], D: [], E: [] }
  for (let t = 0; t < I.length; t += 3) {
    const tri = [I[t], I[t + 1], I[t + 2]]
    const vs = tri.map((v) => [Pd[3 * v], Pd[3 * v + 1], Pd[3 * v + 2]])
    // descarta cedo o que está longe da pelve
    if (vs.every((p) => p[1] < 0.79 || p[1] > 0.93 || Math.abs(p[0]) > 0.1)) continue
    const nz = tri.reduce((s, v) => s + normais[3 * v + 2], 0) / 3
    const n = tri.map((v) => [normais[3 * v], normais[3 * v + 1], normais[3 * v + 2]])
    for (const [nome, r] of Object.entries(REGIOES)) {
      if (r.nz !== undefined && nz <= r.nz) continue
      // recorta posição e normal juntas (6 coordenadas), para deslocar 0,5 mm para fora da pele
      let poli = vs.map((p, i) => [...p, ...n[i]])
      for (const pl of r.planos) {
        poli = recortar(poli, pl)
        if (poli.length < 3) break
      }
      if (poli.length < 3) continue
      const pts = poli.map((q) => {
        const nn = unit([q[3], q[4], q[5]])
        return add([q[0], q[1], q[2]], mul(nn, 0.0005))
      })
      for (let k = 1; k + 1 < pts.length; k++) grupos[nome].push(pts[0], pts[k], pts[k + 1])
    }
  }
  const malha = (pts) => {
    const pos = new Float32Array(pts.length * 3)
    pts.forEach((p, i) => pos.set(p, 3 * i))
    return { posicoes: pos, indices: Uint32Array.from(pts.keys()) }
  }
  const pai = 'Pudendo feminino (vulva)'
  const partes = [
    ['monte', 'VHF_mons_pubis', 'Monte do púbis', 'Mons pubis'],
    ['D', 'VHF_labium_majus_R', 'Lábio maior direito', 'Labium majus, right'],
    ['E', 'VHF_labium_majus_L', 'Lábio maior esquerdo', 'Labium majus, left'],
  ]
  return partes.map(([g, id, nome, en]) => {
    if (grupos[g].length < 90) throw new Error(`região da vulva vazia: ${nome}`)
    console.log(`  vulva: ${nome} com ${grupos[g].length / 3} triângulos`)
    return {
      estrutura: { id, nome, en, sistema: 'pele', pai },
      malha: { id, ...malha(grupos[g]), cor: '#c98f7e', travarBorda: true },
    }
  })
}

// Vulva recortada da própria pele da doadora (só há a superfície externa: lábios menores e clitóris não
// existem no modelo). As partes ficam 0,5 mm por fora, na camada de pele (vidro), e respondem ao toque.
const vulva = recortarVulva()
const peleFinal = trocarMaos()

// Órgãos genitais e mamas
const NOMES = {
  fundus_of_uterus: ['Fundo do útero', 'Útero'],
  body_of_uterus: ['Corpo do útero', 'Útero'],
  cornua: ['Cornos do útero', 'Útero'],
  anterior_wall_of_uterus: ['Parede anterior do útero', 'Útero'],
  posterior_wall_of_uterus: ['Parede posterior do útero', 'Útero'],
  lower_uterine_segment: ['Segmento inferior do útero', 'Útero'],
  cervix: ['Colo do útero', 'Útero'],
  internal_cervical_os: ['Óstio interno do colo do útero', 'Colo do útero'],
  external_cervical_os: ['Óstio do útero (óstio externo)', 'Colo do útero'],
  cervicovaginal_junction: ['Junção cervicovaginal', 'Colo do útero'],
  // No arquivo do HuBMAP se chama "abdominal ostium", mas a malha está nos cornos do útero: são os óstios uterinos
  abdominal_ostium_of_uterine_tube: ['Óstios uterinos das tubas', 'Útero'],
  right_ovary: ['Ovário direito'],
  left_ovary: ['Ovário esquerdo'],
  uterine_tube_infundibulum: ['Infundíbulo da tuba uterina', 'Tuba uterina'],
  fibria_of_uterine_tube: ['Fímbrias da tuba uterina', 'Tuba uterina'],
  ampulla_of_uterine_tube: ['Ampola da tuba uterina', 'Tuba uterina'],
  isthmus_of_fallopian_tube: ['Istmo da tuba uterina', 'Tuba uterina'],
  fat: ['Tecido adiposo da mama', 'Mama'],
  areolar_tubercles: ['Tubérculos areolares da mama', 'Mama'],
  nipple: ['Papila mamária', 'Mama'],
  areola: ['Aréola', 'Mama'],
  mammary_lobes: ['Lobos da glândula mamária', 'Mama'],
  main_lactiferous_ducts: ['Ductos lactíferos da mama', 'Mama'],
  main_lactiferous_sinuses: ['Seios lactíferos da mama', 'Mama'],
  suspensory_ligaments: ['Ligamentos suspensores da mama', 'Mama'],
}
const COR = {
  uterus: '#e0807f',
  cervix: '#e4938f',
  ovary: '#f0cfc0',
  tube: '#e2827f',
  fat: '#efd39b',
  lobes: '#e3a49c',
  ducts: '#f0c7b9',
  areola: '#a8665a',
  ligaments: '#e2dccd',
}
const corDe = (base) => {
  if (/ovary/.test(base)) return COR.ovary
  if (/tube|ostium_of_uterine/.test(base)) return COR.tube
  if (/cervi|os$/.test(base)) return COR.cervix
  if (/^fat$/.test(base)) return COR.fat
  if (/lobes/.test(base)) return COR.lobes
  if (/duct|sinus/.test(base)) return COR.ducts
  if (/areol|nipple/.test(base)) return COR.areola
  if (/ligament/.test(base)) return COR.ligaments
  return COR.uterus
}
const ARQUIVOS = [
  '3d-vh-f-uterus.glb',
  '3d-vh-f-ovary-r.glb',
  '3d-vh-f-ovary-l.glb',
  '3d-vh-f-fallopian-tube-r.glb',
  '3d-vh-f-fallopian-tube-l.glb',
  '3d-vh-f-mammary-gland-r.glb',
  '3d-vh-f-mammary-gland-l.glb',
]
/**
 * Tubo ao longo de uma curva (lista de pontos), com seção elíptica: `raios(t)` -> [lateral, ântero-posterior].
 * O eixo lateral é o x do corpo; as pontas ficam abertas.
 */
function tubo(curva, raios, segmentos = 24, tampar = false) {
  const pos = []
  const ind = []
  for (let i = 0; i < curva.length; i++) {
    const t = i / (curva.length - 1)
    const tan = unit(sub(curva[Math.min(i + 1, curva.length - 1)], curva[Math.max(i - 1, 0)]))
    const lat = unit(sub([1, 0, 0], mul(tan, tan[0])))
    const ap = cross(tan, lat)
    for (let k = 0; k < segmentos; k++) {
      const ang = (2 * Math.PI * k) / segmentos
      const [ra, rb] = raios(t, ang)
      pos.push(...add(curva[i], add(mul(lat, ra * Math.cos(ang)), mul(ap, rb * Math.sin(ang)))))
    }
  }
  for (let i = 0; i + 1 < curva.length; i++)
    for (let k = 0; k < segmentos; k++) {
      const a = i * segmentos + k
      const b = i * segmentos + ((k + 1) % segmentos)
      ind.push(a, b, a + segmentos, b, b + segmentos, a + segmentos) // normais para fora do tubo
    }
  if (tampar)
    for (const [anel, inverter] of [
      [0, true],
      [curva.length - 1, false],
    ]) {
      const c = pos.length / 3
      pos.push(...curva[anel])
      for (let k = 0; k < segmentos; k++) {
        const a = anel * segmentos + k
        const b = anel * segmentos + ((k + 1) % segmentos)
        ind.push(...(inverter ? [c, b, a] : [c, a, b]))
      }
    }
  return { posicoes: Float32Array.from(pos), indices: Uint32Array.from(ind) }
}

/**
 * Relevo dos folículos no ovário (esquemático): subdivide a malha, suaviza e levanta pequenas
 * cúpulas espalhadas pela superfície.
 */
function relevoOvario(posicoes, indices) {
  let { posicoes: P0, indices: I0 } = soldar(posicoes, indices)
  let pos = Array.from(P0)
  let ind = Array.from(I0)
  for (let passo = 0; passo < 2; passo++) {
    const meio = new Map()
    const novoInd = []
    const pontoMedio = (a, b) => {
      const ch = a < b ? `${a},${b}` : `${b},${a}`
      if (!meio.has(ch)) {
        meio.set(ch, pos.length / 3)
        for (let k = 0; k < 3; k++) pos.push((pos[3 * a + k] + pos[3 * b + k]) / 2)
      }
      return meio.get(ch)
    }
    for (let t = 0; t < ind.length; t += 3) {
      const [a, b, c] = [ind[t], ind[t + 1], ind[t + 2]]
      const [ab, bc, ca] = [pontoMedio(a, b), pontoMedio(b, c), pontoMedio(c, a)]
      novoInd.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
    }
    ind = novoInd
  }
  const n = pos.length / 3
  const viz = Array.from({ length: n }, () => new Set())
  for (let t = 0; t < ind.length; t += 3)
    for (let k = 0; k < 3; k++) viz[ind[t + k]].add(ind[t + ((k + 1) % 3)]).add(ind[t + ((k + 2) % 3)])
  for (let it = 0; it < 4; it++) {
    const novo = pos.slice()
    for (let i = 0; i < n; i++) {
      const nb = [...viz[i]]
      for (let k = 0; k < 3; k++) {
        const m = nb.reduce((s2, j) => s2 + pos[3 * j + k], 0) / nb.length
        novo[3 * i + k] = pos[3 * i + k] * 0.5 + m * 0.5
      }
    }
    pos = novo
  }
  const normais = calcularNormais(pos, ind)
  // Centros dos folículos: amostragem pelo ponto mais distante (espalhados, determinístico)
  const v = (i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]]
  const centros = [0]
  const dist = new Float64Array(n).fill(Infinity)
  while (centros.length < 60) {
    const ult = v(centros.at(-1))
    let melhor = 0
    for (let i = 0; i < n; i++) {
      dist[i] = Math.min(dist[i], norma(sub(v(i), ult)))
      if (dist[i] > dist[melhor]) melhor = i
    }
    centros.push(melhor)
  }
  const saida = pos.slice()
  for (let i = 0; i < n; i++) {
    let h = 0
    centros.forEach((c, k) => {
      const raio = 0.0014 + 0.0009 * ((k * 37) % 5) / 4
      const altura = 0.0006 + 0.0006 * ((k * 53) % 7) / 6
      // cúpula de topo arredondado e borda marcada (expoente 4), como os folículos da ilustração
      h += altura * Math.exp(-((norma(sub(v(i), v(c))) / raio) ** 4))
    })
    for (let k = 0; k < 3; k++) saida[3 * i + k] += normais[3 * i + k] * h
  }
  return { posicoes: Float32Array.from(saida), indices: Uint32Array.from(ind) }
}

/** Curva de Bézier quadrática amostrada em n pontos. */
const bezier = (a, b, c, n) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return add(add(mul(a, (1 - t) ** 2), mul(b, 2 * t * (1 - t))), mul(c, t * t))
  })

/**
 * Peças que o HuBMAP não tem, construídas de forma ESQUEMÁTICA a partir de marcos reais do modelo:
 * vagina (do óstio no vestíbulo da vulva até o fórnice em volta do colo) e ligamentos próprios dos
 * ovários (do polo uterino do ovário até o ângulo do útero, abaixo da tuba).
 */
function pecasEsquematicas() {
  const centro = (pts) => {
    const c = caixa(pts)
    return mul(add(c.min, c.max), 0.5)
  }
  // Óstio da vagina: ponto mais profundo (mais alto) da rima do pudendo na linha média, à frente do períneo
  let vestibulo = null
  for (let i = 0; i < nV; i++) {
    const [x, y, z] = [Pd[3 * i], Pd[3 * i + 1], Pd[3 * i + 2]]
    if (Math.abs(x) < 0.004 && y < 0.84 && z > -0.045 && z < 0.0 && (!vestibulo || y > vestibulo[1])) vestibulo = [x, y, z]
  }
  const ostio = add(vestibulo, [0, 0.004, 0])
  const fornice = centro(malhaPorBase.get('cervicovaginal_junction'))
  // Leve curvatura de concavidade anterior
  const meio = add(lerp(ostio, fornice, 0.5), [0, 0, -0.008])
  // Seção: alarga para cima e, no último sexto, a abóbada (fórnices) se fecha em volta do colo
  const vagina = tubo(
    bezier(ostio, meio, fornice, 32),
    (t) => {
      const abobada = 1 - 0.45 * smooth(t, 0.82, 1)
      return [(0.012 + 0.006 * t) * abobada, (0.006 + 0.008 * t ** 2) * abobada]
    },
    28,
  )
  console.log(`  vagina: óstio ${fmt(ostio)} → fórnice ${fmt(fornice)}, ${(norma(sub(fornice, ostio)) * 100).toFixed(1)} cm`)

  const ligamento = (lado) => {
    const sinal = lado === 'R' ? -1 : 1
    const ovario = malhaPorBase.get(lado === 'R' ? 'right_ovary' : 'left_ovary')
    // As pontas entram ~6 mm na parede do útero e ~2 mm no ovário, para não aparecerem abertas
    const lateral = malhaPorBase.get('cornua').reduce((m, p) => (p[0] * sinal > m[0] * sinal ? p : m))
    const angulo = add(lerp(lateral, centro(malhaPorBase.get('body_of_uterus')), 0.4), [0, -0.005, 0])
    const centroOvario = centro(ovario)
    // polo uterino: ponto do ovário mais próximo do ângulo do útero
    const superficie = ovario.reduce((m, p) => (norma(sub(p, angulo)) < norma(sub(m, angulo)) ? p : m))
    const polo = add(superficie, mul(unit(sub(centroOvario, superficie)), 0.002))
    const meioL = add(lerp(polo, angulo, 0.5), [0, -0.004, 0])
    return tubo(bezier(polo, meioL, angulo, 12), () => [0.0022, 0.0022], 10)
  }
  // Rugas: lúmen da vagina por dentro da parede, com pregas transversais (aparecem no corte)
  const rugas = tubo(
    bezier(ostio, meio, fornice, 90),
    (t) => {
      const abobada = 1 - 0.45 * smooth(t, 0.82, 1)
      const prega = 1 + 0.12 * Math.sin(2 * Math.PI * 16 * t) * (1 - smooth(t, 0.8, 0.9))
      return [(0.012 + 0.006 * t) * abobada * 0.62 * prega, (0.006 + 0.008 * t ** 2) * abobada * 0.45 * prega]
    },
    28,
  )

  // Cavidade do útero: triângulo achatado no plano frontal do útero, do óstio interno até perto do
  // fundo, com a borda do endométrio ondulada; e o canal do colo, fusiforme, até o óstio externo
  const osInterno = centro(malhaPorBase.get('internal_cervical_os'))
  const osExterno = centro(malhaPorBase.get('external_cervical_os'))
  const fundo = malhaPorBase.get('fundus_of_uterus')
  const eixoU = unit(sub(centro(fundo), osInterno))
  const alturaFundo = Math.max(...fundo.map((p) => dot(sub(p, osInterno), eixoU)))
  const topo = add(osInterno, mul(eixoU, alturaFundo - 0.012)) // ~12 mm de miométrio no fundo, que é arredondado
  // largura pelo corpo do útero, deixando ~9 mm de miométrio de cada lado
  const corpoU = malhaPorBase.get('body_of_uterus')
  const meiaLargura = (Math.max(...corpoU.map((p) => p[0])) - Math.min(...corpoU.map((p) => p[0]))) / 2 - 0.009
  const cavidade = tubo(
    bezier(osInterno, lerp(osInterno, topo, 0.5), topo, 40),
    (t, ang) => {
      const borda = Math.abs(Math.cos(ang)) ** 4 // ondulação só nas bordas laterais
      const onda = 1 + 0.07 * borda * Math.sin(2 * Math.PI * 7 * t)
      const cantos = 1 - 0.3 * smooth(t, 0.8, 1) // cantos de cima arredondados, acompanhando o fundo
      return [(0.0015 + meiaLargura * t ** 1.4) * onda * cantos, 0.0012 + 0.0022 * t]
    },
    32,
    true,
  )
  const canal = tubo(
    bezier(osExterno, lerp(osExterno, osInterno, 0.5), osInterno, 24),
    (t, ang) => {
      const fuso = 0.0012 + 0.0016 * Math.sin(Math.PI * t)
      const pregas = 1 + 0.15 * Math.sin(6 * ang) // pregas palmadas
      return [fuso * 1.3 * pregas, fuso * pregas]
    },
    24,
    true,
  )
  console.log(`  cavidade do útero: ${((alturaFundo - 0.012) * 100).toFixed(1)} cm de altura, ${(meiaLargura * 200).toFixed(1)} cm de largura`)

  const COR_VAGINA = '#e3908c'
  const COR_LIGAMENTO = '#ebc4b6'
  const COR_MUCOSA = '#b83a43'
  return [
    { id: 'VHF_vagina', nome: 'Vagina', en: 'Vagina', malha: vagina, cor: COR_VAGINA },
    { id: 'VHF_vaginal_rugae', nome: 'Rugas da vagina', en: 'Vaginal rugae', malha: rugas, cor: COR_MUCOSA },
    { id: 'VHF_uterine_cavity', nome: 'Cavidade do útero', en: 'Uterine cavity', malha: cavidade, cor: COR_MUCOSA },
    { id: 'VHF_cervical_canal', nome: 'Canal do colo do útero', en: 'Cervical canal', malha: canal, cor: COR_MUCOSA },
    { id: 'VHF_ovarian_ligament_R', nome: 'Ligamento próprio do ovário direito', en: 'Ovarian ligament, right', malha: ligamento('R'), cor: COR_LIGAMENTO },
    { id: 'VHF_ovarian_ligament_L', nome: 'Ligamento próprio do ovário esquerdo', en: 'Ovarian ligament, left', malha: ligamento('L'), cor: COR_LIGAMENTO },
  ].map((p) => ({
    estrutura: { id: p.id, nome: p.nome, en: p.en, sistema: 'genital', esquematico: true },
    malha: { id: p.id, ...p.malha, cor: p.cor },
  }))
}

const itens = []
const gorduraMama = []
const saidaEstruturas = [{ id: 'VHF_skin', nome: 'Pele', en: 'Skin', sistema: 'pele' }, ...vulva.map((v) => v.estrutura)]
const malhaPorBase = new Map() // "cornua", "right_ovary"… -> pontos (para as peças esquemáticas)
for (const arq of ARQUIVOS) {
  for (const m of transladar(await hubmap(arq))) {
    malhaPorBase.set(m.nome.replace(/^VH_F_/, ''), pontos([m]))
    const lado = /_R$/.test(m.nome) ? 'R' : /_L$/.test(m.nome) ? 'L' : null
    const base = m.nome.replace(/^VH_F_/, '').replace(/_[RL]$/, '')
    const nome = NOMES[base]
    if (!nome) throw new Error(`sem nome em português: ${m.nome}`)
    // O lado sempre qualifica a tuba ou a mama (femininas): "Ampola da tuba uterina direita"
    const sufixo = (s) => (lado ? `${s} ${lado === 'R' ? 'direita' : 'esquerda'}` : s)
    const id = `VHF_${base}${lado ? `_${lado}` : ''}`
    const en = base
      .replace(/_/g, ' ')
      .replace(/^fibria/, 'fimbria')
      .replace(/^fat$/, 'adipose tissue of breast')
      .replace(/^abdominal ostium/, 'uterine ostium')
    const e = { id, nome: sufixo(nome[0]), en: `${en}${lado ? (lado === 'R' ? ', right' : ', left') : ''}`, sistema: 'genital' }
    if (nome[1]) e.pai = sufixo(nome[1])
    saidaEstruturas.push(e)
    // Orçamento de triângulos: peças grandes da mama ganham mais detalhe
    const alvoItem = /^(fat|mammary_lobes|suspensory_ligaments)$/.test(base) ? 5000 : /duct|sinus|wall|ampulla/.test(base) ? 3000 : 1500
    // O tecido adiposo da mama vai para a pele de vidro (tocável): opaco, ele escondia a glândula e
    // parecia colado por cima dos músculos
    if (base === 'fat') {
      e.sistema = 'pele'
      gorduraMama.push({ id, posicoes: m.posicoes, indices: m.indices, cor: '#e8c49a', alvo: 5000, erro: 0.01 })
    } else if (/ovary/.test(base)) {
      itens.push({ id, ...relevoOvario(m.posicoes, m.indices), cor: corDe(base), alvo: 6000, erro: 0.002 })
    } else itens.push({ id, posicoes: m.posicoes, indices: m.indices, cor: corDe(base), alvo: alvoItem })
  }
}
for (const p of pecasEsquematicas()) {
  saidaEstruturas.push(p.estrutura)
  itens.push(p.malha)
}
await gravar('genital-feminino', itens, 1500, 0.01)
await gravar(
  'pele-feminina',
  [
    { id: 'VHF_skin', ...peleFinal, cor: '#e2b49b' },
    ...vulva.map((v) => ({ ...v.malha, alvo: 2500 })),
    ...gorduraMama,
  ],
  55000,
  0.0004,
)

// Hierarquia: liga ao id da mãe quando ela também existe (ex.: óstios -> colo do útero)
const idPorNome = new Map(saidaEstruturas.map((e) => [e.nome, e.id]))
for (const e of saidaEstruturas) if (e.pai && idPorNome.has(e.pai)) e.paiId = idPorNome.get(e.pai)
saidaEstruturas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))

const contar = (s) => saidaEstruturas.filter((e) => e.sistema === s).length
writeFileSync(
  join(DADOS, 'feminino.json'),
  JSON.stringify(
    {
      camadas: {
        pele: {
          modelo: '/models/pele-feminina.glb',
          total: contar('pele'),
          tocaveis: saidaEstruturas.filter((e) => e.sistema === 'pele' && e.id !== 'VHF_skin').map((e) => e.id),
        },
        genital: { modelo: '/models/genital-feminino.glb', total: contar('genital') },
      },
      estruturas: saidaEstruturas,
      // Estruturas de camadas comuns aos dois corpos que só existem no masculino (ficam ocultas no feminino):
      // uretra masculina, vasos do pênis e vasos testiculares
      somenteMasculino: estruturas
        .filter((e) => e.sistema !== 'genital' && (e.en === 'Urethra' || /penis|testicular/i.test(e.en)))
        .map((e) => e.id),
    },
    null,
    2,
  ) + '\n',
)
console.log(`✓ feminino.json com ${saidaEstruturas.length} estruturas`)
versionarDados()
