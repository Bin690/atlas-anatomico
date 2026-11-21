import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAtlasStore } from '../store/useAtlasStore'
import { IconeAlvo, IconeCamadas, IconeCorte, IconeMover, IconeQuiz, IconeRaioX, IconeRotacao } from './ui/Icones'

interface BotaoProps {
  rotulo: string
  ativo?: boolean
  onClick: () => void
  children: ReactNode
}

function Botao({ rotulo, ativo, onClick, children }: BotaoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[10px] font-medium transition sm:min-w-16 ${
        ativo ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
      <span className="hidden sm:block">{rotulo}</span>
    </button>
  )
}

export function Toolbar() {
  const painel = useAtlasStore((s) => s.painel)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const raioX = useAtlasStore((s) => s.raioX)
  const alternarRaioX = useAtlasStore((s) => s.alternarRaioX)
  const rotacao = useAtlasStore((s) => s.rotacaoAutomatica)
  const alternarRotacao = useAtlasStore((s) => s.alternarRotacao)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const temCorte = useAtlasStore((s) => s.corte !== null)
  const mover = useAtlasStore((s) => s.modoMover)
  const alternarMover = useAtlasStore((s) => s.alternarMover)

  return (
    <nav
      aria-label="Ferramentas"
      className="pointer-events-auto flex items-center gap-0.5 rounded-3xl border border-borda bg-superficie/90 p-1 shadow-2xl backdrop-blur"
    >
      <Botao rotulo="Camadas" ativo={painel === 'camadas'} onClick={() => abrirPainel('camadas')}>
        <IconeCamadas />
      </Botao>
      <Botao rotulo="Cortes" ativo={painel === 'cortes' || temCorte} onClick={() => abrirPainel('cortes')}>
        <IconeCorte />
      </Botao>
      <Botao rotulo="Raio-X" ativo={raioX} onClick={alternarRaioX}>
        <IconeRaioX />
      </Botao>
      <Botao rotulo="Rodar" ativo={rotacao} onClick={alternarRotacao}>
        <IconeRotacao />
      </Botao>
      <Botao rotulo="Mover" ativo={mover} onClick={alternarMover}>
        <IconeMover />
      </Botao>
      <Botao
        rotulo="Corpo todo"
        onClick={() => {
          useAtlasStore.setState({ vista: null })
          selecionar(null, { focar: true })
        }}
      >
        <IconeAlvo />
      </Botao>
      <Link
        to="/quiz"
        aria-label="Quiz"
        title="Quiz"
        className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[10px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:min-w-16"
      >
        <IconeQuiz />
        <span className="hidden sm:block">Quiz</span>
      </Link>
    </nav>
  )
}
