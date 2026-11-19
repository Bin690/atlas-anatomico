import { Link } from 'react-router'

interface BotaoVoltarProps {
  para?: string
  texto?: string
}

export function BotaoVoltar({ para = '/', texto = 'Voltar ao corpo' }: BotaoVoltarProps) {
  return (
    <Link
      to={para}
      aria-label={texto}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borda bg-superficie/80 min-w-11 justify-center px-3 text-sm sm:px-4 font-medium text-slate-200 backdrop-blur transition hover:border-slate-500 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">{texto}</span>
    </Link>
  )
}
