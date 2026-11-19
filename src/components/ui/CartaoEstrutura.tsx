import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeAlvo, IconeFechar, IconeIsolar, IconeOlhoFechado } from './Icones'

/** Card da estrutura selecionada: nome, sistema, conteúdo didático e ações. */
export function CartaoEstrutura() {
  const { porId, sistemaPorId, conteudo } = useCatalogo()
  const id = useAtlasStore((s) => s.selecionada)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const focar = useAtlasStore((s) => s.focar)
  const ocultar = useAtlasStore((s) => s.ocultar)
  const isolar = useAtlasStore((s) => s.isolar)
  const isoladas = useAtlasStore((s) => s.isoladas)
  const mostrarTudo = useAtlasStore((s) => s.mostrarTudo)
  const camadas = useAtlasStore((s) => s.camadas)
  const alternarCamada = useAtlasStore((s) => s.alternarCamada)

  const estrutura = id ? porId.get(id) : undefined
  if (!estrutura) return null
  const sistema = sistemaPorId.get(estrutura.sistema)
  const texto = conteudo[estrutura.id]
  const pai = estrutura.paiId ? porId.get(estrutura.paiId) : undefined

  const irParaPai = () => {
    if (!pai) return
    if (!camadas.has(pai.sistema)) alternarCamada(pai.sistema)
    selecionar(pai.id, { focar: true })
  }

  const acao =
    'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white'

  return (
    <article
      aria-live="polite"
      aria-label={`Estrutura selecionada: ${estrutura.nome}`}
      className="pointer-events-auto flex max-h-full min-h-0 flex-col rounded-2xl border border-borda bg-superficie/95 shadow-2xl backdrop-blur"
    >
      <header className="flex items-start gap-3 p-4 pb-2">
        <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: sistema?.cor }} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-semibold text-white">{estrutura.nome}</h2>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {sistema?.nome} · <span lang="en">{estrutura.en}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => selecionar(null)}
          aria-label="Fechar"
          className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </header>

      {estrutura.pai && (
        <p className="px-4 pb-2 text-xs text-slate-400">
          Faz parte de{' '}
          {pai ? (
            <button
              type="button"
              onClick={irParaPai}
              className="font-medium text-sky-300 underline-offset-2 hover:underline"
            >
              {estrutura.pai}
            </button>
          ) : (
            <span className="text-slate-300">{estrutura.pai}</span>
          )}
        </p>
      )}

      {texto && (
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 text-sm leading-relaxed">
          <p className="text-slate-200">{texto.descricao}</p>
          {texto.ficha && Object.keys(texto.ficha).length > 0 && (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-xl bg-white/[0.03] p-3 text-[13px]">
              {Object.entries(texto.ficha).map(([rotulo, valor]) => (
                <div key={rotulo} className="contents">
                  <dt className="font-medium text-slate-400">{rotulo}</dt>
                  <dd className="text-slate-200">{valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {texto.correlacaoClinica && (
            <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <p className="text-xs font-semibold tracking-wide text-amber-300 uppercase">Correlação clínica</p>
              <p className="mt-1 text-slate-200">{texto.correlacaoClinica}</p>
            </div>
          )}
          <div className="h-2" />
        </div>
      )}

      <footer className="mt-2 flex gap-1 border-t border-borda p-2">
        <button type="button" className={acao} onClick={focar}>
          <IconeAlvo /> Focar
        </button>
        <button type="button" className={acao} onClick={() => ocultar(estrutura.id)}>
          <IconeOlhoFechado /> Ocultar
        </button>
        {isoladas ? (
          <button type="button" className={acao} onClick={mostrarTudo}>
            <IconeIsolar /> Mostrar tudo
          </button>
        ) : (
          <button type="button" className={acao} onClick={() => isolar([estrutura.id])}>
            <IconeIsolar /> Isolar
          </button>
        )}
      </footer>
    </article>
  )
}
