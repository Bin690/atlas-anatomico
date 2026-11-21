import { create } from 'zustand'

/**
 * O "caderno" do aluno, guardado no aparelho: estruturas favoritas, notas pessoais e aulas concluídas.
 * (Num produto com conta de utilizador, isto sincronizaria entre aparelhos.)
 */
interface Dados {
  /** Ids das estruturas favoritas, da mais recente para a mais antiga. */
  favoritos: string[]
  /** Nota pessoal por id de estrutura. */
  notas: Record<string, string>
  /** Ids das aulas vistas até ao último passo. */
  aulasConcluidas: string[]
}

interface Caderno extends Dados {
  alternarFavorito: (id: string) => void
  definirNota: (id: string, texto: string) => void
  concluirAula: (id: string) => void
  apagarCaderno: () => void
}

const CHAVE = 'atlas3d:caderno:v1'
const VAZIO: Dados = { favoritos: [], notas: {}, aulasConcluidas: [] }

function ler(): Dados {
  try {
    return { ...VAZIO, ...(JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Dados>) }
  } catch {
    return VAZIO
  }
}

function guardar({ favoritos, notas, aulasConcluidas }: Dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ favoritos, notas, aulasConcluidas }))
  } catch {
    // sem armazenamento (modo privado): vale só nesta sessão
  }
}

export const useCaderno = create<Caderno>()((set, get) => {
  const mudar = (parcial: Partial<Dados>) => {
    set(parcial)
    guardar(get())
  }
  return {
    ...ler(),
    alternarFavorito: (id) => {
      const { favoritos } = get()
      mudar({ favoritos: favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [id, ...favoritos] })
    },
    definirNota: (id, texto) => {
      const notas = { ...get().notas }
      if (texto.trim()) notas[id] = texto
      else delete notas[id]
      mudar({ notas })
    },
    concluirAula: (id) => {
      const { aulasConcluidas } = get()
      if (!aulasConcluidas.includes(id)) mudar({ aulasConcluidas: [...aulasConcluidas, id] })
    },
    apagarCaderno: () => mudar(VAZIO),
  }
})
