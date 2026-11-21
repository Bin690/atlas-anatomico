import { describe, expect, it } from 'vitest'
import { escalaDoBatimento } from '../src/components/3d/CamadaBatched'

describe('batimento do coração', () => {
  const amostras = Array.from({ length: 200 }, (_, i) => escalaDoBatimento((i / 200) * (60 / 72)))

  it('nunca encolhe e o pico fica dentro dos 3,5% (+ o segundo pulso) de amplitude', () => {
    expect(Math.min(...amostras)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...amostras)).toBeGreaterThan(1.03)
    expect(Math.max(...amostras)).toBeLessThanOrEqual(1.04)
  })

  it('tem dois pulsos por ciclo (tum-tá), o segundo mais fraco, e repousa entre eles', () => {
    const picos = amostras.filter((v, i) => v > (amostras[i - 1] ?? 0) && v >= (amostras[i + 1] ?? 0) && v > 1.01)
    expect(picos).toHaveLength(2)
    expect(picos[1]).toBeLessThan(picos[0])
    expect(escalaDoBatimento(0.6)).toBeCloseTo(1, 3)
  })

  it('repete-se a cada ciclo (72 batimentos por minuto)', () => {
    expect(escalaDoBatimento(0.2)).toBeCloseTo(escalaDoBatimento(0.2 + 60 / 72), 6)
  })
})
