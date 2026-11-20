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
      title={texto}
      className="grid size-11 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-200 backdrop-blur transition hover:border-slate-500 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}
