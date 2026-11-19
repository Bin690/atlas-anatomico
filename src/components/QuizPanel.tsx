import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalogo } from '../data'
import { gerarPerguntas, type Pergunta } from '../data/quiz'
import { useAtlasStore } from '../store/useAtlasStore'

const TOTAL = 10

type Fase =
  | { tipo: 'config' }
  | {
      tipo: 'jogando'
      perguntas: Pergunta[]
      atual: number
      resposta: string | null
      acertos: number
      erros: Pergunta[]
    }
  | { tipo: 'fim'; acertos: number; erros: Pergunta[] }

/** Mostra a estrutura da pergunta no 3D: liga a camada dela (com o esqueleto em raio-X como referência) e voa até ela. */
function mostrarNoModelo(p: Pergunta) {
  const s = useAtlasStore.getState()
  const camadas = [p.alvo.sistema]
  if (p.alvo.sistema !== 'esqueleto') camadas.push('esqueleto')
  s.definirCamadas(camadas)
  s.definirRaioX(true)
  s.mostrarTudo()
  s.definirQuiz(true, false)
  s.selecionar(p.alvo.id, { focar: true })
}

export function QuizPanel() {
  const { estruturas, conteudo, sistemas } = useCatalogo()
  const [fase, setFase] = useState<Fase>({ tipo: 'config' })
  const [sistema, setSistema] = useState<string | null>(null)

  // Guarda o estado do atlas para restaurar ao sair do quiz
  const anterior = useRef<{ camadas: string[]; raioX: boolean } | null>(null)
  useEffect(() => {
    const s = useAtlasStore.getState()
    anterior.current = { camadas: [...s.camadas], raioX: s.raioX }
    s.selecionar(null)
    s.abrirPainel(null)
    return () => {
      const st = useAtlasStore.getState()
      st.definirQuiz(false)
      if (anterior.current) {
        st.definirCamadas(anterior.current.camadas)
        st.definirRaioX(anterior.current.raioX)
      }
      st.mostrarTudo()
      st.selecionar(null, { focar: true })
    }
  }, [])

  const opcoesSistema = useMemo(() => sistemas.filter((s) => s.id !== 'pele' && s.total >= 8), [sistemas])

  const iniciar = () => {
    const perguntas = gerarPerguntas(estruturas, conteudo, sistema, TOTAL)
    if (!perguntas.length) return
    mostrarNoModelo(perguntas[0])
    setFase({ tipo: 'jogando', perguntas, atual: 0, resposta: null, acertos: 0, erros: [] })
  }

  const responder = (id: string) => {
    if (fase.tipo !== 'jogando' || fase.resposta) return
    const p = fase.perguntas[fase.atual]
    const certo = id === p.alvo.id
    useAtlasStore.getState().definirQuiz(true, true)
    setFase({
      ...fase,
      resposta: id,
      acertos: fase.acertos + (certo ? 1 : 0),
      erros: certo ? fase.erros : [...fase.erros, p],
    })
  }

  const proxima = () => {
    if (fase.tipo !== 'jogando') return
    const atual = fase.atual + 1
    if (atual >= fase.perguntas.length) {
      const s = useAtlasStore.getState()
      s.definirQuiz(false)
      s.selecionar(null, { focar: true })
      setFase({ tipo: 'fim', acertos: fase.acertos, erros: fase.erros })
      return
    }
    mostrarNoModelo(fase.perguntas[atual])
    setFase({ ...fase, atual, resposta: null })
  }

  const cartao = 'pointer-events-auto rounded-2xl border border-borda bg-superficie/95 p-4 shadow-2xl backdrop-blur'

  if (fase.tipo === 'config')
    return (
      <section aria-label="Configurar quiz" className={cartao}>
        <h2 className="text-lg font-semibold text-white">Teste seus conhecimentos</h2>
        <p className="mt-1 text-sm text-slate-300">
          Uma estrutura será destacada no modelo 3D, sem o nome. Escolha a resposta certa entre 4 opções. São {TOTAL}{' '}
          perguntas.
        </p>
        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Sistema</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Sistema do quiz">
          {[{ id: null, nome: 'Todos os sistemas', cor: '#94a3b8' }, ...opcoesSistema].map((s) => (
            <button
              key={s.id ?? 'todos'}
              type="button"
              role="radio"
              aria-checked={sistema === s.id}
              onClick={() => setSistema(s.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sistema === s.id
                  ? 'border-sky-400 bg-sky-400/15 text-white'
                  : 'border-borda text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: s.cor }} aria-hidden />
              {s.nome}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={iniciar}
          className="mt-5 min-h-11 w-full rounded-xl bg-sky-400 font-semibold text-slate-950 transition hover:bg-sky-300"
        >
          Começar
        </button>
      </section>
    )

  if (fase.tipo === 'fim') {
    const nota = Math.round((fase.acertos / TOTAL) * 100)
    return (
      <section aria-label="Resultado do quiz" className={`${cartao} max-h-full overflow-y-auto`}>
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Resultado</p>
        <p className="mt-1 text-4xl font-bold text-white">
          {fase.acertos}
          <span className="text-xl text-slate-400">/{TOTAL}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {nota >= 80
            ? 'Excelente! 🎉'
            : nota >= 50
              ? 'Bom trabalho — revise os erros abaixo.'
              : 'Continue praticando: revise os erros abaixo.'}
        </p>
        {fase.erros.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Para revisar</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              {fase.erros.map((p) => (
                <li key={p.alvo.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
                  {p.alvo.nome}
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={() => setFase({ tipo: 'config' })}
          className="mt-5 min-h-11 w-full rounded-xl bg-sky-400 font-semibold text-slate-950 transition hover:bg-sky-300"
        >
          Jogar de novo
        </button>
      </section>
    )
  }

  const p = fase.perguntas[fase.atual]
  const texto = conteudo[p.alvo.id]
  const acertou = fase.resposta === p.alvo.id

  return (
    <section aria-label="Pergunta do quiz" className={`${cartao} flex max-h-full flex-col`}>
      <header className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Pergunta {fase.atual + 1} de {fase.perguntas.length}
        </span>
        <span>
          Acertos: <strong className="text-white">{fase.acertos}</strong>
        </span>
      </header>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full bg-sky-400 transition-all"
          style={{ width: `${((fase.atual + (fase.resposta ? 1 : 0)) / fase.perguntas.length) * 100}%` }}
        />
      </div>
      <h2 className="mt-3 font-semibold text-white">Qual é a estrutura destacada em azul?</h2>

      <div className="mt-3 grid gap-2" role="group" aria-label="Opções">
        {p.opcoes.map((o) => {
          const escolhida = fase.resposta === o.id
          const correta = o.id === p.alvo.id
          let estilo = 'border-borda text-slate-100 hover:border-slate-500 hover:bg-white/5'
          if (fase.resposta && correta) estilo = 'border-emerald-400 bg-emerald-400/15 text-white'
          else if (escolhida) estilo = 'border-rose-400 bg-rose-400/15 text-white'
          else if (fase.resposta) estilo = 'border-borda text-slate-500'
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!fase.resposta}
              onClick={() => responder(o.id)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition ${estilo}`}
            >
              {o.nome}
            </button>
          )
        })}
      </div>

      {fase.resposta && (
        <div className="mt-3 min-h-0 overflow-y-auto text-sm" aria-live="polite">
          <p className={`font-semibold ${acertou ? 'text-emerald-300' : 'text-rose-300'}`}>
            {acertou ? 'Correto!' : `Era: ${p.alvo.nome}`}
          </p>
          {texto && <p className="mt-1 text-slate-300">{texto.descricao}</p>}
          {texto?.correlacaoClinica && (
            <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-slate-200">
              <span className="font-semibold text-amber-300">Clínica: </span>
              {texto.correlacaoClinica}
            </p>
          )}
          <button
            type="button"
            onClick={proxima}
            className="mt-3 min-h-11 w-full rounded-xl bg-sky-400 font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            {fase.atual + 1 >= fase.perguntas.length ? 'Ver resultado' : 'Próxima'}
          </button>
        </div>
      )}
    </section>
  )
}
