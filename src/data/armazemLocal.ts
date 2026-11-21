import { useCaderno } from '../store/caderno'
import { dadosVazios, metaInicial, type Armazem, type DadosNuvem, type Meta } from './nuvem'
import { escreverProgresso, EVENTO_PROGRESSO, lerProgresso } from './progresso'

/**
 * Os dados do aluno guardados neste aparelho (caderno e progresso do quiz), vistos pela sincronização
 * com a conta. Também guarda a "meta" da sincronização: a que conta pertencem os dados, que versão do
 * documento foi vista e se há alterações por enviar.
 */
const CHAVE_META = 'atlas3d:nuvem:meta'

export function lerMeta(): Meta {
  try {
    return { ...metaInicial(), ...(JSON.parse(localStorage.getItem(CHAVE_META) ?? '{}') as Partial<Meta>) }
  } catch {
    return metaInicial()
  }
}

export function gravarMeta(meta: Meta) {
  try {
    localStorage.setItem(CHAVE_META, JSON.stringify(meta))
  } catch {
    // sem armazenamento (modo privado): a sincronização vale só nesta sessão
  }
}

/** Enquanto se aplicam dados vindos da conta, as mudanças não contam como alterações do aluno. */
let aplicando = false

export const armazemLocal: Armazem = {
  ler(): DadosNuvem {
    const c = useCaderno.getState()
    return {
      favoritos: [...c.favoritos],
      notas: Object.fromEntries(Object.entries(c.notas).map(([id, texto]) => [id, { texto, em: c.notasEm[id] ?? 0 }])),
      aulasConcluidas: [...c.aulasConcluidas],
      progresso: lerProgresso(),
    }
  },
  aplicar(d) {
    aplicando = true
    try {
      useCaderno.getState().substituir({
        favoritos: d.favoritos,
        notas: Object.fromEntries(Object.entries(d.notas).map(([id, n]) => [id, n.texto])),
        notasEm: Object.fromEntries(Object.entries(d.notas).map(([id, n]) => [id, n.em])),
        aulasConcluidas: d.aulasConcluidas,
      })
      escreverProgresso(d.progresso)
    } finally {
      aplicando = false
    }
  },
  lerMeta,
  gravarMeta,
}

/**
 * Avisa quando o aluno altera os dados neste aparelho (e marca-os como por enviar).
 * Devolve a função que cancela o aviso.
 */
export function aoMudarLocal(aviso: () => void): () => void {
  const mudou = () => {
    if (aplicando) return
    gravarMeta({ ...lerMeta(), temAlteracoes: true })
    aviso()
  }
  const cancelarCaderno = useCaderno.subscribe(mudou)
  window.addEventListener(EVENTO_PROGRESSO, mudou)
  return () => {
    cancelarCaderno()
    window.removeEventListener(EVENTO_PROGRESSO, mudou)
  }
}

/** Esvazia os dados do aluno neste aparelho e esquece a sincronização (ex.: ao sair da conta). */
export function limparDadosLocais() {
  armazemLocal.aplicar(dadosVazios())
  gravarMeta(metaInicial())
}
