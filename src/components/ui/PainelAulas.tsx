import { useNavigate } from 'react-router'
import { AULAS } from '../../data/aulas'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeFechar } from './Icones'
import { SeloPro } from './Pro'

export function PainelAulas() {
  const navigate = useNavigate()
  const premium = useAtlasStore((s) => s.premium)
  const exigirPro = useAtlasStore((s) => s.exigirPro)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)

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
        {AULAS.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => {
                const abrir = () => navigate(`/aula/${a.id}`)
                if (a.premium) exigirPro(`A aula “${a.titulo}”`, abrir)
                else abrir()
              }}
              className="w-full rounded-xl border border-borda p-3 text-left transition hover:border-amber-400/60 hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold text-white">{a.titulo}</span>
                {a.premium && !premium && <SeloPro />}
                {!a.premium && (
                  <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                    GRÁTIS
                  </span>
                )}
                {a.sexo === 'feminino' && (
                  <span className="rounded bg-pink-400/15 px-1.5 py-0.5 text-[9px] font-bold text-pink-200">
                    CORPO FEMININO
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs text-slate-300">{a.resumo}</span>
              <span className="mt-1 block text-[11px] text-slate-500">
                {a.passos.length} passos · ~{a.duracaoMin} min
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
