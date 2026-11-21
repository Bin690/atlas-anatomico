interface CarregandoProps {
  texto?: string
}

/** Indicador de carregamento em tela cheia (usado como fallback de Suspense). */
export function Carregando({ texto = 'A carregar…' }: CarregandoProps) {
  return (
    <output aria-live="polite" className="flex h-full flex-col items-center justify-center gap-4 text-slate-400">
      <img src="/icone.svg" alt="" className="size-28 animate-pulse" />
      <span className="flex items-center gap-3">
        <span className="size-4 animate-spin rounded-full border-2 border-slate-600 border-t-destaque" aria-hidden />
        {texto}
      </span>
    </output>
  )
}
