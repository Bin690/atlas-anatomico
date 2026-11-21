import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { buscar, termoAlternativo, useCatalogo } from '../../data'
import { useCaderno } from '../../store/caderno'
import type { Estrutura } from '../../types/atlas'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeBusca, IconeEstrela, IconeFechar } from './Icones'

/** Pesquisa em todas as estruturas do corpo; ao escolher, liga a camada, seleciona e voa até a peça. */
export function PainelBusca() {
  const { estruturas, sistemaPorId, porId } = useCatalogo()
  const favoritos = useCaderno((s) => s.favoritos)
  const notas = useCaderno((s) => s.notas)
  const [termo, setTermo] = useState('')
  const termoAdiado = useDeferredValue(termo)
  const resultados = buscar(estruturas, termoAdiado)
  const alternativo = termoAlternativo(termoAdiado)
  // Favoritos do corpo atual (os do outro corpo aparecem quando se troca)
  const meus = favoritos.map((id) => porId.get(id)).filter((e): e is Estrutura => !!e)
  const entrada = useRef<HTMLInputElement>(null)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const camadas = useAtlasStore((s) => s.camadas)
  const alternarCamada = useAtlasStore((s) => s.alternarCamada)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)

  useEffect(() => entrada.current?.focus(), [])

  const item = (e: Estrutura) => {
    const sistema = sistemaPorId.get(e.sistema)
    const nota = notas[e.id]
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
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: sistema?.cor }} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white">{e.nome}</span>
            {nota && !termoAdiado && <span className="block truncate text-xs text-slate-300">📝 {nota}</span>}
            <span className="block truncate text-xs text-slate-500">
              {sistema?.nome} · <span lang="en">{e.en}</span>
            </span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <section aria-label="Pesquisar estrutura" className="flex max-h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-borda p-3">
        <IconeBusca className="size-5 shrink-0 text-slate-400" />
        <input
          ref={entrada}
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && abrirPainel(null)}
          placeholder="Pesquisar estruturas…"
          aria-label="Nome da estrutura"
          className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => abrirPainel(null)}
          aria-label="Fechar pesquisa"
          className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" aria-live="polite">
        {termoAdiado && !resultados.length && (
          <li className="p-4 text-center text-xs text-slate-400">Nenhuma estrutura encontrada.</li>
        )}
        {!termoAdiado && (
          <li className="p-4 text-xs leading-relaxed text-slate-400">
            Escreva em português, inglês ou pelo nome popular: <em className="text-slate-300">fémur</em>,{' '}
            <em className="text-slate-300">aorta</em>, <em className="text-slate-300">rótula</em>,{' '}
            <em className="text-slate-300">omoplata</em>, <em className="text-slate-300">trompa</em>…
            {meus.length === 0 && (
              <span className="mt-2 block">
                Toque na <IconeEstrela className="inline size-3.5 align-[-2px]" /> de uma estrutura para a guardar aqui.
              </span>
            )}
          </li>
        )}
        {termoAdiado && alternativo && resultados.length > 0 && (
          <li className="px-3 pt-1 pb-2 text-xs text-slate-400">
            Inclui resultados para <em className="text-slate-300">{alternativo}</em>
          </li>
        )}
        {!termoAdiado && meus.length > 0 && (
          <li className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-amber-300 uppercase">
            <IconeEstrela cheia className="size-3.5" /> Favoritos
          </li>
        )}
        {(termoAdiado ? resultados : meus).map((e) => item(e))}
      </ul>
    </section>
  )
}
