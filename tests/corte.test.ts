import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { atualizarPlano, direcaoDaVista, mantido } from '../src/components/3d/corte'
import type { Corte } from '../src/store/useAtlasStore'

const p = (x: number, y: number, z: number) => new Vector3(x, y, z)

describe('plano de corte', () => {
  it('sem corte, tudo é mantido', () => {
    atualizarPlano(null)
    expect(mantido(p(0, 99, 0))).toBe(true)
  })

  it.each<[Corte, Vector3, Vector3]>([
    // [corte, ponto mantido, ponto removido]
    [{ plano: 'axial', posicao: 1.3, inverter: false }, p(0, 1.0, 0), p(0, 1.5, 0)],
    [{ plano: 'axial', posicao: 1.3, inverter: true }, p(0, 1.5, 0), p(0, 1.0, 0)],
    [{ plano: 'sagital', posicao: 0, inverter: false }, p(-0.1, 1, 0), p(0.1, 1, 0)], // mantém o lado direito do paciente
    [{ plano: 'coronal', posicao: 0, inverter: false }, p(0, 1, -0.05), p(0, 1, 0.05)], // mantém a metade posterior
  ])('%o mantém o lado certo', (corte, dentro, fora) => {
    atualizarPlano(corte)
    expect(mantido(dentro)).toBe(true)
    expect(mantido(fora)).toBe(false)
  })

  it('a câmera olha a face cortada a partir do lado removido', () => {
    const corte: Corte = { plano: 'coronal', posicao: 0, inverter: false }
    atualizarPlano(corte)
    const camera = direcaoDaVista(corte).multiplyScalar(2)
    expect(mantido(camera)).toBe(false)
  })
})
