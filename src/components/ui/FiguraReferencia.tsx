import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Figura } from '../../data/figuras'
import { IconeFechar } from './Icones'

/**
 * Ilustração ampliada (toque fora, ✕ ou Esc fecham). Vai direto para o <body> (portal): os cartões
 * usam desfoque de fundo, que prenderia um elemento "fixed" dentro deles.
 */
export function FiguraAmpliada({ figura, fechar }: { figura: Figura; fechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      fechar()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [fechar])

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-3 backdrop-blur-sm"
      onClick={fechar}
    >
      <figure
        role="dialog"
        aria-modal="true"
        aria-label="Figura de referência"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-2xl bg-white p-3 shadow-2xl sm:p-5"
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar figura"
          className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
        >
          <IconeFechar />
        </button>
        <img src={figura.src} alt={figura.legenda} className="w-full" />
        <figcaption className="mt-2 text-center text-xs text-slate-600 sm:text-sm">{figura.legenda}</figcaption>
      </figure>
    </div>,
    document.body,
  )
}

/** Miniatura que abre a figura ampliada (usada nos passos das aulas). */
export function MiniaturaFigura({ figura }: { figura: Figura }) {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Ampliar a figura de referência"
        className="mt-3 block w-full overflow-hidden rounded-xl bg-white p-1.5 transition hover:ring-2 hover:ring-amber-300"
      >
        <img src={figura.src} alt="" className="w-full" />
        <span className="mt-1 block text-[11px] text-slate-500">Figura de referência · toque para ampliar</span>
      </button>
      {aberta && <FiguraAmpliada figura={figura} fechar={() => setAberta(false)} />}
    </>
  )
}
