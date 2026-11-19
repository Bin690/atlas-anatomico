/**
 * Leitura do BodyParts3D (DBCLS): listas de conceitos FMA e arquivos OBJ por elemento.
 * Fonte: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function lerTsv(arquivo) {
  return readFileSync(arquivo, 'utf8')
    .split('\n')
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.replace(/\r$/, '').split('\t'))
}

export class BodyParts3D {
  /** @param {string} pasta pasta com os .txt e as subpastas de OBJ extraídas */
  constructor(pasta) {
    this.pasta = pasta
    this.elementos = { partof: new Map(), isa: new Map() }
    this.nomes = new Map()
    for (const conjunto of ['partof', 'isa']) {
      const arq = join(pasta, `${conjunto}_element_parts.txt`)
      if (!existsSync(arq)) continue
      for (const [fma, nome, fj] of lerTsv(arq)) {
        if (!this.elementos[conjunto].has(fma)) this.elementos[conjunto].set(fma, [])
        this.elementos[conjunto].get(fma).push(fj)
        this.nomes.set(fma, nome)
      }
    }
    // Índice FJ -> caminho do .obj (procura em todas as subpastas extraídas)
    this.arquivos = new Map()
    const varrer = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) varrer(p)
        else if (e.name.endsWith('.obj')) this.arquivos.set(e.name.slice(0, -4), p)
      }
    }
    varrer(pasta)
  }

  /**
   * Todas as estruturas "folha": cada arquivo OBJ declara no cabeçalho o conceito FMA mais
   * específico que representa. Agrupa os arquivos por conceito.
   * @returns {Map<string, { fma: string, nome: string, fj: string[] }>}
   */
  listarConceitos() {
    const conceitos = new Map()
    for (const [fj, arquivo] of this.arquivos) {
      const cab = readFileSync(arquivo, 'utf8').slice(0, 1500)
      const nome = cab.match(/# English name : (.+)/)?.[1]?.trim()
      const fma = cab.match(/# Concept ID : (\S+)/)?.[1]
      if (!nome || !fma) continue
      if (!conceitos.has(fma)) conceitos.set(fma, { fma, nome, fj: [] })
      conceitos.get(fma).fj.push(fj)
    }
    return conceitos
  }

  /** Ancestrais (nomes) de um conceito na hierarquia is-a. */
  ancestrais(fma) {
    if (!this.paisIsa) {
      this.paisIsa = new Map()
      this.nomesIsa = new Map()
      const arq = join(this.pasta, 'isa_inclusion_relation_list.txt')
      if (existsSync(arq))
        for (const [p, pn, c, cn] of lerTsv(arq)) {
          if (!this.paisIsa.has(c)) this.paisIsa.set(c, [])
          this.paisIsa.get(c).push(p)
          this.nomesIsa.set(p, pn)
          this.nomesIsa.set(c, cn)
        }
    }
    const vistos = new Set()
    const pilha = [fma]
    while (pilha.length) {
      for (const p of this.paisIsa.get(pilha.pop()) ?? []) {
        if (vistos.has(p)) continue
        vistos.add(p)
        pilha.push(p)
      }
    }
    return [...vistos].map((f) => this.nomesIsa.get(f))
  }

  /** Malha de uma lista de arquivos FJ (coordenadas originais, mm). */
  malhaDeArquivos(fjs) {
    const m = { posicoes: [], normais: [], indices: [] }
    for (const fj of new Set(fjs))
      if (this.arquivos.has(fj)) lerObj(this.arquivos.get(fj), m.posicoes, m.normais, m.indices)
    return m
  }

  /** Lista de arquivos FJ de um conceito, priorizando o conjunto pedido. */
  elementosDe(fma, conjunto = 'partof') {
    const outro = conjunto === 'partof' ? 'isa' : 'partof'
    const lista = this.elementos[conjunto].get(fma) ?? this.elementos[outro].get(fma) ?? []
    return lista.filter((fj) => this.arquivos.has(fj))
  }

  /** Malha de um conceito (todos os seus elementos), em coordenadas originais (mm). */
  malhaDe(fma, conjunto = 'partof') {
    const posicoes = []
    const normais = []
    const indices = []
    const vistos = new Set()
    for (const fj of this.elementosDe(fma, conjunto)) {
      if (vistos.has(fj)) continue
      vistos.add(fj)
      lerObj(this.arquivos.get(fj), posicoes, normais, indices)
    }
    return { posicoes, normais, indices }
  }
}

/**
 * Pontos (mm) de todos os elementos de um conceito, descartando elementos "perdidos":
 * alguns arquivos do BodyParts3D estão catalogados num lobo mas posicionados longe dele.
 */
export function pontosSemOutliers(bp, fma, limiteMm = 130) {
  const elementos = bp.elementosDe(fma).map((fj) => {
    const m = { posicoes: [], normais: [], indices: [] }
    lerObj(bp.arquivos.get(fj), m.posicoes, m.normais, m.indices)
    const c = [0, 1, 2].map((k) => {
      let s = 0
      for (let i = k; i < m.posicoes.length; i += 3) s += m.posicoes[i]
      return s / (m.posicoes.length / 3)
    })
    return { fj, pontos: m.posicoes, centro: c }
  })
  const mediana = [0, 1, 2].map((k) => {
    const v = elementos.map((e) => e.centro[k]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  })
  const pontos = []
  for (const e of elementos) {
    const d = Math.hypot(...e.centro.map((v, k) => v - mediana[k]))
    if (d > limiteMm) {
      console.warn(`  ! ${fma}: ignorando ${e.fj} (a ${Math.round(d)} mm do lobo)`)
      continue
    }
    for (const v of e.pontos) pontos.push(v)
  }
  return pontos
}

/** OBJ simples do BodyParts3D: "v", "vn" e faces "f a//a b//b c//c" (vértice e normal com o mesmo índice). */
function lerObj(arquivo, posicoes, normais, indices) {
  const base = posicoes.length / 3
  const v = []
  const vn = []
  const faces = []
  for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
    if (linha.startsWith('v ')) v.push(linha.trim().split(/\s+/).slice(1, 4).map(Number))
    else if (linha.startsWith('vn ')) vn.push(linha.trim().split(/\s+/).slice(1, 4).map(Number))
    else if (linha.startsWith('f '))
      faces.push(
        linha
          .trim()
          .split(/\s+/)
          .slice(1)
          .map((t) => parseInt(t, 10) - 1),
      )
  }
  for (const p of v) posicoes.push(...p)
  for (let i = 0; i < v.length; i++) normais.push(...(vn[i] ?? [0, 0, 1]))
  for (const f of faces) for (let i = 1; i + 1 < f.length; i++) indices.push(base + f[0], base + f[i], base + f[i + 1])
}
