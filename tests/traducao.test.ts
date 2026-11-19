import { describe, expect, it } from 'vitest'
import estruturas from '../src/data/estruturas.json'
// @ts-expect-error módulo JS do gerador, sem tipos
import { desconhecidas, traduzir } from '../scripts/modelos/traducao.mjs'

describe('tradução FMA -> Terminologia Anatômica', () => {
  it.each([
    ['Left posterior inferior cerebellar artery', 'Artéria cerebelar inferior posterior esquerda'],
    ['Long head of left biceps brachii', 'Cabeça longa do músculo bíceps braquial esquerdo'],
    ['Right lower first secondary premolar tooth', '1º dente pré-molar permanente inferior direito'],
    ['Fourth lumbar vertebra', 'Vértebra lombar L4'],
    ['Intervertebral disk of fourth thoracic vertebra', 'Disco intervertebral da vértebra torácica T4'],
    [
      'Branch of left middle cerebral artery to left angular gyrus',
      'Ramo da artéria cerebral média esquerda para o giro angular esquerdo',
    ],
    [
      'Communicating branch of left nasociliary nerve with left ciliary ganglion',
      'Ramo comunicante do nervo nasociliar esquerdo com o gânglio ciliar esquerdo',
    ],
    ['Set of dorsal interossei of right hand', 'Conjunto dos músculos interósseos dorsais da mão direita'],
    ['Right great saphenous vein', 'Veia safena magna direita'],
    ['Hepatovenous segment VII', 'Segmento hepatovenoso VII'],
    ['Anterior leaflet of mitral valve', 'Cúspide anterior da valva mitral'],
    ['Peduncle of midbrain', 'Pedúnculo cerebral'],
    ['Diaphragm', 'Diafragma'],
  ])('%s', (en, pt) => {
    expect(traduzir(en)).toBe(pt)
  })

  it('reproduz exatamente os nomes do catálogo gerado (exceto lobos pulmonares, nomeados à mão)', () => {
    const lobos = new Set(['FMA7333', 'FMA7383', 'FMA7337', 'FMA7370', 'FMA7371'])
    const diferentes = estruturas.filter((e) => !lobos.has(e.id) && traduzir(e.en) !== e.nome)
    expect(diferentes.map((e) => `${e.en} -> ${traduzir(e.en)} ≠ ${e.nome}`)).toEqual([])
  })

  it('não deixa nenhuma palavra sem tradução', () => {
    for (const e of estruturas) traduzir(e.en)
    expect([...desconhecidas.keys()]).toEqual([])
  })

  it('não deixa palavras em inglês nos nomes', () => {
    const ingles = /\b(of|the|artery|vein|branch|left|right|muscle|nerve|bone|lobe|gyrus|longus|brevis|minimi)\b/i
    expect(estruturas.filter((e) => ingles.test(e.nome)).map((e) => e.nome)).toEqual([])
  })
})
