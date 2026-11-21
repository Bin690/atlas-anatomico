import { create } from 'zustand'

/**
 * Preferências de leitura e desempenho, guardadas no aparelho.
 * - tamanho do texto: aumenta as letras (variáveis --text-* em index.css), sem mexer nos botões;
 * - alto contraste: textos secundários mais claros e contornos mais visíveis;
 * - desempenho: "leve" fica com os modelos simplificados e menos resolução, para telemóveis modestos.
 */
export type TamanhoTexto = 'normal' | 'grande' | 'muito-grande'
export type Desempenho = 'auto' | 'leve' | 'detalhado'

interface Preferencias {
  tamanhoTexto: TamanhoTexto
  altoContraste: boolean
  desempenho: Desempenho
  definir: (p: Partial<Pick<Preferencias, 'tamanhoTexto' | 'altoContraste' | 'desempenho'>>) => void
}

const CHAVE = 'atlas3d:preferencias'

function ler(): Pick<Preferencias, 'tamanhoTexto' | 'altoContraste' | 'desempenho'> {
  const padrao = { tamanhoTexto: 'normal' as const, altoContraste: false, desempenho: 'auto' as const }
  try {
    return { ...padrao, ...(JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as object) }
  } catch {
    return padrao
  }
}

export const usePreferencias = create<Preferencias>()((set, get) => ({
  ...ler(),
  definir: (p) => {
    set(p)
    const { tamanhoTexto, altoContraste, desempenho } = get()
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ tamanhoTexto, altoContraste, desempenho }))
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  },
}))

/** O aparelho parece modesto (pouca memória ou poucos núcleos) ou pediu para poupar dados? */
export function aparelhoModesto(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) ||
    nav.connection?.saveData === true
  )
}

/** Modo leve em vigor (escolhido, ou automático num aparelho modesto). */
export const useModoLeve = () =>
  usePreferencias((s) => s.desempenho === 'leve' || (s.desempenho === 'auto' && aparelhoModesto()))
