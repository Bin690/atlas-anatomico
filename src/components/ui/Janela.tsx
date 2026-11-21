import { useEffect, type ReactNode } from 'react'
import { IconeFechar } from './Icones'

/** Janela modal: folha inferior no telemóvel, janela central no computador; Esc ou toque fora fecha. */
export function Janela({
  aberta,
  fechar,
  titulo,
  children,
}: {
  aberta: boolean
  fechar: () => void
  titulo: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!aberta) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      fechar()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [aberta, fechar])

  if (!aberta) return null
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center"
      onClick={fechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-borda bg-superficie shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-borda px-5 py-3">
          <h2 className="font-semibold text-white">{titulo}</h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <IconeFechar />
          </button>
        </header>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-sky-300 uppercase">{titulo}</h3>
      {children}
    </section>
  )
}
