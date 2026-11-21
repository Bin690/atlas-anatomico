import { useNavigate } from 'react-router'
import { AULAS_AGRUPADAS } from '../../data/aulas'
import type { Aula } from '../../types/atlas'
import { useAtlasStore } from '../../store/useAtlasStore'
import { useCaderno } from '../../store/caderno'
import { IconeFechar } from './Icones'
import { BotoesVersao, SimboloSexo } from './SeletorCorpo'
import { SeloPro } from './Pro'

export function PainelAulas() {
  const navigate = useNavigate()
  const premium = useAtlasStore((s) => s.premium)
  const exigirPro = useAtlasStore((s) => s.exigirPro)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const abrirAula = (a: Aula) => {
    const abrir = () => navigate(`/aula/${a.id}`)
    if (a.premium) exigirPro(`A aula “${a.titulo}”`, abrir)
    else abrir()
  }

  return (
    <section aria-label="Aulas guiadas" className="flex max-h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-borda px-4 py-3">
        <h2 className="font-semibold text-white">Aulas guiadas</h2>
        <button
          type="button"
          onClick={() => abrirPainel(null)}
          aria-label="Fechar aulas"
          className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </header>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {AULAS_AGRUPADAS.map((grupo) =>
          grupo.length > 1 ? (
            <li key={grupo[0].id}>
              <CartaoVersoes grupo={grupo} abrir={(a) => abrirAula(a)} premium={premium} />
            </li>
          ) : (
            <CartaoAula key={grupo[0].id} a={grupo[0]} abrir={abrirAula} premium={premium} />
          ),
        )}
      </ul>
    </section>
  )
}

/** ✓ discreto para aulas já vistas até ao fim. */
function Concluida({ id }: { id: string }) {
  const feita = useCaderno((s) => s.aulasConcluidas.includes(id))
  if (!feita) return null
  return (
    <span title="Aula concluída" className="text-xs font-semibold text-emerald-300">
      ✓<span className="sr-only"> concluída</span>
    </span>
  )
}

function Selos({ aulas, premium }: { aulas: Aula[]; premium: boolean }) {
  const paga = aulas.some((a) => a.premium)
  return (
    <>
      {paga && !premium && <SeloPro />}
      {!paga && (
        <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">GRÁTIS</span>
      )}
    </>
  )
}

/** Um tema com versões ♂/♀: um cartão, com um botão por corpo à frente do título. */
function CartaoVersoes({ grupo, abrir, premium }: { grupo: Aula[]; abrir: (a: Aula) => void; premium: boolean }) {
  const passos = grupo.map((a) => a.passos.length)
  const minutos = grupo.map((a) => a.duracaoMin)
  const faixa = (v: number[]) => (Math.min(...v) === Math.max(...v) ? `${v[0]}` : `${Math.min(...v)}–${Math.max(...v)}`)
  return (
    <div className="rounded-xl border border-borda p-3">
      <span className="flex items-center gap-2">
        <span className="font-semibold text-white">{grupo[0].titulo}</span>
        <BotoesVersao
          sexos={grupo.map((a) => a.sexo!)}
          escolher={(sexo) => abrir(grupo.find((a) => a.sexo === sexo)!)}
        />
        <span className="ml-auto">
          <Selos aulas={grupo} premium={premium} />
        </span>
      </span>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
        {grupo.map((a) => (
          <li key={a.id} className="flex gap-1.5">
            <SimboloSexo sexo={a.sexo!} />
            <span>
              {a.resumo} <Concluida id={a.id} />
            </span>
          </li>
        ))}
      </ul>
      <span className="mt-1 block text-[11px] text-slate-500">
        {faixa(passos)} passos · ~{faixa(minutos)} min
      </span>
    </div>
  )
}

function CartaoAula({ a, abrir, premium }: { a: Aula; abrir: (a: Aula) => void; premium: boolean }) {
  return (
    <li key={a.id}>
      <button
        type="button"
        onClick={() => abrir(a)}
        className="w-full rounded-xl border border-borda p-3 text-left transition hover:border-amber-400/60 hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            {a.sexo && <SimboloSexo sexo={a.sexo} className="text-lg leading-none" />}
            {a.titulo}
          </span>
          <Concluida id={a.id} />
          <Selos aulas={[a]} premium={premium} />
        </span>
        <span className="mt-1 block text-xs text-slate-300">{a.resumo}</span>
        <span className="mt-1 block text-[11px] text-slate-500">
          {a.passos.length} passos · ~{a.duracaoMin} min
        </span>
      </button>
    </li>
  )
}
