import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { buscar, useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeBusca, IconeFechar } from './Icones'

/** Busca em todas as estruturas do corpo; ao escolher, liga a camada, seleciona e voa até a peça. */
export function PainelBusca() {
  const { estruturas, sistemaPorId } = useCatalogo()
  const [termo, setTermo] = useState('')
  const termoAdiado = useDeferredValue(termo)
  const resultados = buscar(estruturas, termoAdiado)
  const entrada = useRef<HTMLInputElement>(null)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const camadas = useAtlasStore((s) => s.camadas)
  const alternarCamada = useAtlasStore((s) => s.alternarCamada)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)

  useEffect(() => entrada.current?.focus(), [])

  return (
    <section aria-label="Buscar estrutura" className="flex max-h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-borda p-3">
        <IconeBusca className="size-5 shrink-0 text-slate-400" />
        <input
          ref={entrada}
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && abrirPainel(null)}
          placeholder={`Buscar entre ${estruturas.length} estruturas…`}
          aria-label="Nome da estrutura"
          className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => abrirPainel(null)}
          aria-label="Fechar busca"
          className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" aria-live="polite">
        {termoAdiado && !resultados.length && (
          <li className="p-4 text-center text-sm text-slate-400">Nenhuma estrutura encontrada.</li>
        )}
        {!termoAdiado && (
          <li className="p-4 text-sm text-slate-400">
            Digite em português ou inglês: <em className="text-slate-300">fêmur</em>,{' '}
            <em className="text-slate-300">aorta</em>, <em className="text-slate-300">bíceps</em>,{' '}
            <em className="text-slate-300">giro pré-central</em>…
          </li>
        )}
        {resultados.map((e) => {
          const sistema = sistemaPorId.get(e.sistema)
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  if (!camadas.has(e.sistema)) alternarCamada(e.sistema)
                  selecionar(e.id, { focar: true })
                  abrirPainel(null)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 focus-visible:bg-white/5"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: sistema?.cor }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{e.nome}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {sistema?.nome} · <span lang="en">{e.en}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
