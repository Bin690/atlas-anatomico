interface CarregandoProps {
  texto?: string
}

/** Indicador de carregamento em tela cheia (usado como fallback de Suspense). */
export function Carregando({ texto = 'Carregando…' }: CarregandoProps) {
  return (
    <output aria-live="polite" className="flex h-full items-center justify-center gap-3 text-slate-400">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-destaque" aria-hidden />
      <span>{texto}</span>
    </output>
  )
}
