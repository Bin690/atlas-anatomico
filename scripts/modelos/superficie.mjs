/**
 * Reconstrução de superfícies a partir de nuvens de pontos (usada nos lobos pulmonares:
 * o BodyParts3D tem as árvores brônquica e vascular de cada lobo, mas não a superfície).
 *
 * 1. Voxeliza os pontos de cada lobo.
 * 2. Propaga a distância (BFS) e rotula cada voxel com o lobo mais próximo (território).
 * 3. Abre uma fissura entre lobos vizinhos e suaviza o campo.
 * 4. Extrai a superfície com "surface nets" e aplica suavização de Taubin.
 */

/** @param {Float32Array|number[]} pts pontos xyz em mm */
function limites(listas, margem) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const pts of listas)
    for (let i = 0; i < pts.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pts[i + k])
        max[k] = Math.max(max[k], pts[i + k])
      }
  return { min: min.map((v) => v - margem), max: max.map((v) => v + margem) }
}

/**
 * BFS multi-fonte com distância euclidiana aproximada: cada voxel herda a semente
 * (ponto real, em mm) e o rótulo mais próximos, até a distância máxima.
 * Se `dentro` for dado, a propagação fica restrita aos voxels marcados.
 */
function propagar(grade, sementes, distMax, dentro = null) {
  const { n, min, voxel, id } = grade
  const [nx, ny, nz] = n
  const total = nx * ny * nz
  const rotulo = new Int8Array(total).fill(-1)
  const semente = new Float64Array(total * 3)
  const dist2 = new Float64Array(total).fill(Infinity)
  let fila = []
  for (const { ponto: p, rotulo: r } of sementes) {
    const c = p.map((v, k) => Math.min(n[k] - 1, Math.max(0, Math.round((v - min[k]) / voxel))))
    const j = id(c[0], c[1], c[2])
    const d = p.reduce((s, v, k) => s + (v - (min[k] + c[k] * voxel)) ** 2, 0)
    if (d < dist2[j]) {
      if (dist2[j] === Infinity) fila.push(j)
      dist2[j] = d
      rotulo[j] = r
      semente.set(p, j * 3)
    }
  }
  const max2 = distMax * distMax
  const naFila = new Uint8Array(total)
  const vizinhos = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]
  while (fila.length) {
    const prox = []
    naFila.fill(0)
    for (const j of fila) {
      const x = j % nx
      const y = Math.floor(j / nx) % ny
      const z = Math.floor(j / (nx * ny))
      const s0 = semente[j * 3],
        s1 = semente[j * 3 + 1],
        s2 = semente[j * 3 + 2]
      for (const [dx, dy, dz] of vizinhos) {
        const a = x + dx,
          b = y + dy,
          c = z + dz
        if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue
        const k = id(a, b, c)
        if (dentro && !dentro[k]) continue
        const d = (min[0] + a * voxel - s0) ** 2 + (min[1] + b * voxel - s1) ** 2 + (min[2] + c * voxel - s2) ** 2
        if (d < dist2[k] && d <= max2) {
          if (!naFila[k]) {
            naFila[k] = 1
            prox.push(k)
          }
          dist2[k] = d
          rotulo[k] = rotulo[j]
          semente[k * 3] = s0
          semente[k * 3 + 1] = s1
          semente[k * 3 + 2] = s2
        }
      }
    }
    fila = prox
  }
  return { rotulo, dist2 }
}

/**
 * @param {{ nome: string, lado: string, pontos: number[] }[]} grupos nuvens de pontos (mm), uma por lobo
 * @param {{ voxel?: number, dilatacao?: number, erosao?: number, fissura?: number, suavizar?: number, iteracoesTaubin?: number,
 *   permitido?: (x: number, y: number, z: number, lado: string) => boolean }} opcoes
 *   dilatacao/erosao (mm): fechamento morfológico por lado — preenche reentrâncias menores que ~erosão.
 *   permitido: se dado, o volume é "o que é permitido (ex.: cavidade torácica) até `dilatacao` das árvores",
 *   em vez do fechamento morfológico.
 * @returns {{ nome: string, posicoes: number[], indices: number[] }[]}
 */
export function reconstruirLobos(
  grupos,
  { voxel = 3, dilatacao = 40, erosao = 28, fissura = 1, suavizar = 2, iteracoesTaubin = 12, permitido = null } = {},
) {
  const { min, max } = limites(
    grupos.map((g) => g.pontos),
    dilatacao + 4 * voxel,
  )
  const n = [0, 1, 2].map((k) => Math.ceil((max[k] - min[k]) / voxel) + 1)
  const [nx, ny, nz] = n
  const total = nx * ny * nz
  const id = (x, y, z) => x + nx * (y + ny * z)
  const grade = { n, min, voxel, id }
  const rotulo = new Int8Array(total).fill(-1)

  // 1-2. Fechamento morfológico por lado (pulmão direito e esquerdo separados)
  for (const lado of new Set(grupos.map((g) => g.lado))) {
    const sementes = []
    grupos.forEach((g, gi) => {
      if (g.lado !== lado) return
      for (let i = 0; i < g.pontos.length; i += 3)
        sementes.push({ ponto: [g.pontos[i], g.pontos[i + 1], g.pontos[i + 2]], rotulo: gi })
    })
    const dil = propagar(grade, sementes, dilatacao)
    if (permitido) {
      for (let z = 0; z < nz; z++)
        for (let y = 0; y < ny; y++)
          for (let x = 0; x < nx; x++) {
            const j = id(x, y, z)
            if (dil.rotulo[j] >= 0 && permitido(min[0] + x * voxel, min[1] + y * voxel, min[2] + z * voxel, lado))
              rotulo[j] = dil.rotulo[j]
          }
      continue
    }
    const mascara = new Uint8Array(total)
    for (let j = 0; j < total; j++) mascara[j] = dil.dist2[j] <= dilatacao * dilatacao ? 1 : 0

    // Erosão: distância a partir dos voxels de fora que tocam a máscara
    const borda = []
    for (let z = 1; z < nz - 1; z++)
      for (let y = 1; y < ny - 1; y++)
        for (let x = 1; x < nx - 1; x++) {
          const j = id(x, y, z)
          if (mascara[j]) continue
          if (
            mascara[j + 1] ||
            mascara[j - 1] ||
            mascara[j + nx] ||
            mascara[j - nx] ||
            mascara[j + nx * ny] ||
            mascara[j - nx * ny]
          )
            borda.push({ ponto: [min[0] + x * voxel, min[1] + y * voxel, min[2] + z * voxel], rotulo: 0 })
        }
    const ero = propagar(grade, borda, erosao)
    for (let j = 0; j < total; j++) if (mascara[j] && ero.dist2[j] > erosao * erosao) rotulo[j] = dil.rotulo[j]
  }

  // 3. Fissuras: voxels encostados em outro lobo ficam vazios
  const final = Int8Array.from(rotulo)
  for (let it = 0; it < fissura; it++) {
    const atual = Int8Array.from(final)
    for (let z = 1; z < nz - 1; z++)
      for (let y = 1; y < ny - 1; y++)
        for (let x = 1; x < nx - 1; x++) {
          const j = id(x, y, z)
          const r = atual[j]
          if (r < 0) continue
          for (const k of [j + 1, j - 1, j + nx, j - nx, j + nx * ny, j - nx * ny])
            if (atual[k] >= 0 && atual[k] !== r) {
              final[j] = -1
              break
            }
        }
  }

  return grupos.map((g, gi) => {
    // Campo: +1 dentro do lobo, -1 fora; borrado para suavizar
    let campo = new Float32Array(total)
    for (let j = 0; j < total; j++) campo[j] = final[j] === gi ? 1 : -1
    for (let s = 0; s < suavizar; s++) campo = borrar(campo, n)
    const malha = surfaceNets(campo, n)
    taubin(malha, iteracoesTaubin)
    // Coordenadas de volta para mm
    for (let i = 0; i < malha.posicoes.length; i += 3)
      for (let k = 0; k < 3; k++) malha.posicoes[i + k] = min[k] + malha.posicoes[i + k] * voxel
    return { nome: g.nome, ...malha }
  })
}

/** Média 3×3×3 separável. */
function borrar(campo, [nx, ny, nz]) {
  let a = campo
  for (const passo of [1, nx, nx * ny]) {
    const b = new Float32Array(a.length)
    const lim = passo === 1 ? nx : passo === nx ? ny : nz
    for (let j = 0; j < a.length; j++) {
      const coord = passo === 1 ? j % nx : passo === nx ? Math.floor(j / nx) % ny : Math.floor(j / (nx * ny))
      const ant = coord > 0 ? a[j - passo] : a[j]
      const pos = coord < lim - 1 ? a[j + passo] : a[j]
      b[j] = (ant + a[j] + pos) / 3
    }
    a = b
  }
  return a
}

/** Surface nets (campo > 0 = dentro). Retorna vértices em coordenadas de grade. */
function surfaceNets(campo, [nx, ny, nz]) {
  const id = (x, y, z) => x + nx * (y + ny * z)
  const vertice = new Int32Array(nx * ny * nz).fill(-1)
  const posicoes = []
  const indices = []
  const cantos = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1, (i >> 1) & 1, (i >> 2) & 1])
  const arestas = []
  for (let i = 0; i < 8; i++) for (let k = 0; k < 3; k++) if (!((i >> k) & 1)) arestas.push([i, i | (1 << k)])

  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        const v = cantos.map(([a, b, c]) => campo[id(x + a, y + b, z + c)])
        let mascara = 0
        v.forEach((f, i) => f > 0 && (mascara |= 1 << i))
        if (mascara === 0 || mascara === 255) continue
        let sx = 0,
          sy = 0,
          sz = 0,
          cont = 0
        for (const [i0, i1] of arestas) {
          if (v[i0] > 0 === v[i1] > 0) continue
          const t = v[i0] / (v[i0] - v[i1])
          sx += cantos[i0][0] + t * (cantos[i1][0] - cantos[i0][0])
          sy += cantos[i0][1] + t * (cantos[i1][1] - cantos[i0][1])
          sz += cantos[i0][2] + t * (cantos[i1][2] - cantos[i0][2])
          cont++
        }
        vertice[id(x, y, z)] = posicoes.length / 3
        posicoes.push(x + sx / cont, y + sy / cont, z + sz / cont)
      }

  // Quads nas arestas da grade que cruzam a superfície
  const eixos = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  for (let z = 1; z < nz - 1; z++)
    for (let y = 1; y < ny - 1; y++)
      for (let x = 1; x < nx - 1; x++) {
        const f0 = campo[id(x, y, z)]
        for (let d = 0; d < 3; d++) {
          const [ex, ey, ez] = eixos[d]
          const f1 = campo[id(x + ex, y + ey, z + ez)]
          if (f0 > 0 === f1 > 0) continue
          const u = eixos[(d + 1) % 3]
          const w = eixos[(d + 2) % 3]
          const c0 = vertice[id(x, y, z)]
          const c1 = vertice[id(x - u[0], y - u[1], z - u[2])]
          const c2 = vertice[id(x - u[0] - w[0], y - u[1] - w[1], z - u[2] - w[2])]
          const c3 = vertice[id(x - w[0], y - w[1], z - w[2])]
          if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) continue
          if (f0 > 0) indices.push(c0, c1, c2, c0, c2, c3)
          else indices.push(c0, c2, c1, c0, c3, c2)
        }
      }
  return { posicoes, indices }
}

/** Suavização de Taubin (λ/μ) — suaviza sem encolher a malha. */
function taubin(malha, iteracoes, lambda = 0.5, mu = -0.53) {
  const { posicoes: p, indices } = malha
  const nv = p.length / 3
  const viz = Array.from({ length: nv }, () => new Set())
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]]
    viz[a].add(b).add(c)
    viz[b].add(a).add(c)
    viz[c].add(a).add(b)
  }
  const passo = (fator) => {
    const novo = p.slice()
    for (let v = 0; v < nv; v++) {
      if (!viz[v].size) continue
      const m = [0, 0, 0]
      for (const u of viz[v]) for (let k = 0; k < 3; k++) m[k] += p[3 * u + k]
      for (let k = 0; k < 3; k++) novo[3 * v + k] = p[3 * v + k] + fator * (m[k] / viz[v].size - p[3 * v + k])
    }
    for (let i = 0; i < p.length; i++) p[i] = novo[i]
  }
  for (let i = 0; i < iteracoes; i++) {
    passo(lambda)
    passo(mu)
  }
}

/** Normais por vértice (média das faces). */
export function calcularNormais(posicoes, indices) {
  const n = new Float32Array(posicoes.length)
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3]
    const e1 = [0, 1, 2].map((k) => posicoes[b + k] - posicoes[a + k])
    const e2 = [0, 1, 2].map((k) => posicoes[c + k] - posicoes[a + k])
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) n[v + k] += f[k]
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1
    n[i] /= l
    n[i + 1] /= l
    n[i + 2] /= l
  }
  return Array.from(n)
}

// ---------------------------------------------------------------------------
// Cavidade por fatias: contorno convexo 2D de uma nuvem de pontos em cada fatia horizontal
// ---------------------------------------------------------------------------

function casco2D(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const inf = []
  for (const q of p) {
    while (inf.length >= 2 && cruz(inf.at(-2), inf.at(-1), q) <= 0) inf.pop()
    inf.push(q)
  }
  const sup = []
  for (const q of p.reverse()) {
    while (sup.length >= 2 && cruz(sup.at(-2), sup.at(-1), q) <= 0) sup.pop()
    sup.push(q)
  }
  return inf.slice(0, -1).concat(sup.slice(0, -1))
}

/** Distância (com sinal: positiva dentro) do ponto ao polígono convexo anti-horário. */
function distDentro(casco, x, y) {
  let d = Infinity
  for (let i = 0; i < casco.length; i++) {
    const [ax, ay] = casco[i]
    const [bx, by] = casco[(i + 1) % casco.length]
    const ex = bx - ax,
      ey = by - ay
    const l = Math.hypot(ex, ey) || 1
    d = Math.min(d, ((y - ay) * ex - (x - ax) * ey) / l)
  }
  return d
}

/**
 * Índice de fatias (eixo vertical = índice 2, em mm) com o casco convexo dos pontos de cada fatia.
 * @returns {(x: number, y: number, z: number, margem?: number) => boolean} "está dentro do casco da fatia?"
 */
export function volumePorFatias(pontos, espessura = 5, minimoPontos = 12) {
  const fatias = new Map()
  for (let i = 0; i < pontos.length; i += 3) {
    const k = Math.round(pontos[i + 2] / espessura)
    if (!fatias.has(k)) fatias.set(k, [])
    fatias.get(k).push([pontos[i], pontos[i + 1]])
  }
  const cascos = new Map()
  for (const [k, pts] of fatias) if (pts.length >= minimoPontos) cascos.set(k, casco2D(pts))
  return (x, y, z, margem = 0) => {
    const c = cascos.get(Math.round(z / espessura))
    return !!c && c.length >= 3 && distDentro(c, x, y) > margem
  }
}
