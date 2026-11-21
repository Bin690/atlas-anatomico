import { useState } from 'react'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeFechar } from './Icones'
import { PainelRegioes } from './PainelRegioes'

/** Liga/desliga os sistemas do corpo (camadas), como num atlas em camadas, ou isola uma região. */
export function PainelCamadas() {
  const { sistemas } = useCatalogo()
  const camadas = useAtlasStore((s) => s.camadas)
  const alternarCamada = useAtlasStore((s) => s.alternarCamada)
  const definirCamadas = useAtlasStore((s) => s.definirCamadas)
  const raioX = useAtlasStore((s) => s.raioX)
  const alternarRaioX = useAtlasStore((s) => s.alternarRaioX)
  const ocultas = useAtlasStore((s) => s.ocultas)
  const isoladas = useAtlasStore((s) => s.isoladas)
  const mostrarTudo = useAtlasStore((s) => s.mostrarTudo)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const [aba, setAba] = useState<'sistemas' | 'regioes'>('sistemas')
  const separador = (id: typeof aba, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => setAba(id)}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        aba === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {texto}
    </button>
  )

  return (
    <section aria-label="Camadas do corpo" className="flex max-h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-borda px-4 py-3">
        <div role="tablist" aria-label="Ver por" className="-ml-2 flex gap-1">
          {separador('sistemas', 'Sistemas')}
          {separador('regioes', 'Regiões')}
        </div>
        <button
          type="button"
          onClick={() => abrirPainel(null)}
          aria-label="Fechar camadas"
          className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </header>

      {aba === 'regioes' && <PainelRegioes />}
      <ul className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 ${aba === 'regioes' ? 'hidden' : ''}`}>
        {sistemas.map((s) => {
          const ativo = camadas.has(s.id)
          return (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} aria-hidden />
                <span className="flex-1 text-sm text-slate-100">{s.nome}</span>
                <span className="text-xs text-slate-500">{s.total}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={ativo}
                  onChange={() => alternarCamada(s.id)}
                  aria-label={`Mostrar ${s.nome}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative h-6 w-10 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-sky-500 peer-focus-visible:outline-2 peer-focus-visible:outline-sky-400 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
                />
              </label>
            </li>
          )
        })}
      </ul>

      <footer className="flex flex-wrap gap-2 border-t border-borda p-3">
        <button
          type="button"
          onClick={alternarRaioX}
          aria-pressed={raioX}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${raioX ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
        >
          Raio-X
        </button>
        <button
          type="button"
          onClick={() => definirCamadas(sistemas.map((s) => s.id))}
          className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => definirCamadas(sistemas.filter((s) => s.visivelPorPadrao).map((s) => s.id))}
          className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          Padrão
        </button>
        {(ocultas.size > 0 || isoladas) && (
          <button
            type="button"
            onClick={mostrarTudo}
            className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/25"
          >
            Mostrar ocultas
          </button>
        )}
      </footer>
    </section>
  )
}
