import { create } from 'zustand'

/**
 * Preferências de leitura e desempenho, guardadas no aparelho.
 * - tamanho do texto: aumenta as letras (variáveis --text-* em index.css), sem mexer nos botões;
 * - alto contraste: textos secundários mais claros e contornos mais visíveis;
 * - desempenho: "leve" fica com os modelos simplificados e menos resolução, para telemóveis modestos.
 */
export type TamanhoTexto = 'normal' | 'grande' | 'muito-grande'
export type Desempenho = 'auto' | 'leve' | 'detalhado'
type Opcoes = 'tamanhoTexto' | 'altoContraste' | 'desempenho' | 'batimento'

interface Preferencias {
  tamanhoTexto: TamanhoTexto
  altoContraste: boolean
  desempenho: Desempenho
  /** Batimento animado do coração (ligado por defeito, exceto se o sistema pede menos movimento). */
  batimento: boolean
  definir: (p: Partial<Pick<Preferencias, Opcoes>>) => void
}

const CHAVE = 'atlas3d:preferencias'

const menosMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function ler(): Pick<Preferencias, Opcoes> {
  const padrao = {
    tamanhoTexto: 'normal' as const,
    altoContraste: false,
    desempenho: 'auto' as const,
    batimento: !menosMovimento(),
  }
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
    const { tamanhoTexto, altoContraste, desempenho, batimento } = get()
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ tamanhoTexto, altoContraste, desempenho, batimento }))
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

/** Batimento do coração ligado nas preferências? */
export const useBatimento = () => usePreferencias((s) => s.batimento)
