import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalogo } from '../data'
import { desempenhoPorSistema, lerProgresso, pendentes, registrarResposta } from '../data/progresso'
import { gerarPerguntas, type Pergunta } from '../data/quiz'
import { dizerNome } from '../hooks/voz'
import { useAtlasStore } from '../store/useAtlasStore'
import type { Estrutura } from '../types/atlas'
import { IconeSom } from './ui/Icones'
import { SeloPro } from './ui/Pro'

const TOTAL = 10

/**
 * identificar: a estrutura aparece destacada e o aluno escolhe o nome.
 * localizar: o aluno lê o nome e toca na estrutura.
 * ouvir: o aluno ouve o nome (sem vê-lo escrito) e toca na estrutura.
 */
type Modo = 'identificar' | 'localizar' | 'ouvir'

type Jogo = {
  tipo: 'jogando'
  modo: Modo
  perguntas: Pergunta[]
  atual: number
  /** id escolhido/tocado pelo aluno (null = ainda respondendo) */
  resposta: string | null
  acertos: number
  erros: Pergunta[]
}
type Fase = { tipo: 'config' } | Jogo | { tipo: 'fim'; acertos: number; total: number; erros: Pergunta[] }

/** Prepara o 3D para a pergunta: só a camada da resposta, com o esqueleto em raio-X como referência. */
function prepararCena(p: Pergunta, modo: Modo) {
  const s = useAtlasStore.getState()
  const camadas = [p.alvo.sistema]
  if (p.alvo.sistema !== 'esqueleto') camadas.push('esqueleto')
  s.definirCamadas(camadas)
  s.definirRaioX(true)
  s.mostrarTudo()
  s.definirQuiz(true, false)
  if (modo === 'identificar') {
    useAtlasStore.setState({ regiaoFoco: null, quizAguardandoToque: false, quizToque: null })
    s.selecionar(p.alvo.id, { focar: true })
  } else {
    // "Encontre" e "Ouça": enquadra a região ao redor, sem destacar a resposta
    useAtlasStore.setState({ regiaoFoco: p.alvo.id, quizAguardandoToque: true, quizToque: null })
    s.selecionar(null)
    s.focar()
    // a voz toca mesmo com o alto-falante do topo desligado: aqui ela é a pergunta
    if (modo === 'ouvir') dizerNome(p.alvo.id, p.alvo.nome, { forcar: true })
  }
}

export function QuizPanel() {
  const { estruturas, conteudo, sistemas, porId } = useCatalogo()
  const premium = useAtlasStore((s) => s.premium)
  const exigirPro = useAtlasStore((s) => s.exigirPro)
  const quizToque = useAtlasStore((s) => s.quizToque)
  const [fase, setFase] = useState<Fase>({ tipo: 'config' })
  const [sistema, setSistema] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>('identificar')
  const [revisao, setRevisao] = useState(false)
  const [progresso, setProgresso] = useState(lerProgresso)

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
      useAtlasStore.setState({ regiaoFoco: null, quizAguardandoToque: false, quizToque: null })
      if (anterior.current) {
        st.definirCamadas(anterior.current.camadas)
        st.definirRaioX(anterior.current.raioX)
      }
      st.mostrarTudo()
      st.selecionar(null, { focar: true })
    }
  }, [])

  const opcoesSistema = useMemo(() => sistemas.filter((s) => s.id !== 'pele' && s.total >= 8), [sistemas])
  const aRevisar = useMemo(
    () => pendentes(progresso).filter((id) => !sistema || porId.get(id)?.sistema === sistema),
    [progresso, sistema, porId],
  )
  const desempenho = useMemo(() => desempenhoPorSistema(progresso, (id) => porId.get(id)?.sistema), [progresso, porId])

  const iniciar = () => {
    const perguntas = gerarPerguntas(estruturas, conteudo, sistema, TOTAL, revisao ? aRevisar : [])
    if (!perguntas.length) return
    prepararCena(perguntas[0], modo)
    setFase({ tipo: 'jogando', modo, perguntas, atual: 0, resposta: null, acertos: 0, erros: [] })
  }

  const responder = (id: string) => {
    if (fase.tipo !== 'jogando' || fase.resposta) return
    const p = fase.perguntas[fase.atual]
    const certo = id === p.alvo.id
    registrarResposta(p.alvo.id, certo)
    useAtlasStore.setState({ quizAguardandoToque: false })
    const st = useAtlasStore.getState()
    st.definirQuiz(true, true)
    // Nos modos de tocar, revela a resposta certa no modelo
    if (fase.modo !== 'identificar') st.selecionar(p.alvo.id, { focar: !certo })
    setFase({
      ...fase,
      resposta: id,
      acertos: fase.acertos + (certo ? 1 : 0),
      erros: certo ? fase.erros : [...fase.erros, p],
    })
  }

  // Toque no modelo durante o modo "Encontre a estrutura"
  useEffect(() => {
    if (quizToque && fase.tipo === 'jogando' && fase.modo !== 'identificar' && !fase.resposta) responder(quizToque.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizToque])

  const proxima = () => {
    if (fase.tipo !== 'jogando') return
    const atual = fase.atual + 1
    if (atual >= fase.perguntas.length) {
      const s = useAtlasStore.getState()
      s.definirQuiz(false)
      useAtlasStore.setState({ regiaoFoco: null, quizAguardandoToque: false })
      s.selecionar(null, { focar: true })
      setProgresso(lerProgresso())
      setFase({ tipo: 'fim', acertos: fase.acertos, total: fase.perguntas.length, erros: fase.erros })
      return
    }
    prepararCena(fase.perguntas[atual], fase.modo)
    setFase({ ...fase, atual, resposta: null })
  }

  const cartao = 'pointer-events-auto rounded-2xl border border-borda bg-superficie/95 p-4 shadow-2xl backdrop-blur'
  const chip = (ativo: boolean) =>
    `flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      ativo ? 'border-sky-400 bg-sky-400/15 text-white' : 'border-borda text-slate-300 hover:border-slate-500'
    }`

  if (fase.tipo === 'config')
    return (
      <section aria-label="Configurar quiz" className={`${cartao} max-h-full overflow-y-auto`}>
        <h2 className="text-lg font-semibold text-white">Teste seus conhecimentos</h2>

        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Modo</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Modo do quiz">
          {(
            [
              ['identificar', 'Qual é esta estrutura?', 'Escolha o nome entre 4 opções', null],
              [
                'localizar',
                'Encontre a estrutura',
                'Leia o nome e toque nela no modelo 3D',
                'O quiz "Encontre a estrutura"',
              ],
              ['ouvir', 'Ouça e encontre', 'Ouça o nome e toque nela no modelo 3D', 'O quiz "Ouça e encontre"'],
            ] as const
          ).map(([id, titulo, dica, recursoPro]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={modo === id}
              onClick={() => (recursoPro ? exigirPro(recursoPro, () => setModo(id)) : setModo(id))}
              className={`rounded-xl border p-3 text-left transition ${modo === id ? 'border-sky-400 bg-sky-400/15' : 'border-borda hover:border-slate-500'}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {titulo} {recursoPro && !premium && <SeloPro />}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-400">{dica}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Sistema</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Sistema do quiz">
          {[{ id: null, nome: 'Todos os sistemas', cor: '#94a3b8' }, ...opcoesSistema].map((s) => (
            <button
              key={s.id ?? 'todos'}
              type="button"
              role="radio"
              aria-checked={sistema === s.id}
              onClick={() => setSistema(s.id)}
              className={chip(sistema === s.id)}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: s.cor }} aria-hidden />
              {s.nome}
              {desempenho.get(s.id ?? '') && (
                <span className="text-[10px] text-slate-400">
                  {Math.round((desempenho.get(s.id!)!.acertos / desempenho.get(s.id!)!.total) * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-borda p-3">
          <input
            type="checkbox"
            checked={revisao}
            onChange={(e) => {
              const marcar = e.target.checked
              if (!marcar) setRevisao(false)
              else exigirPro('A revisão espaçada dos seus erros', () => setRevisao(true))
            }}
            className="size-4 accent-sky-400"
          />
          <span className="flex-1 text-sm text-slate-200">
            Revisar meus erros primeiro
            <span className="block text-[11px] text-slate-400">
              {aRevisar.length
                ? `${aRevisar.length} estrutura${aRevisar.length > 1 ? 's' : ''} para revisar agora`
                : 'Nenhuma revisão pendente'}
            </span>
          </span>
          {!premium && <SeloPro />}
        </label>

        <button
          type="button"
          onClick={iniciar}
          className="mt-5 min-h-11 w-full rounded-xl bg-sky-400 font-semibold text-slate-950 transition hover:bg-sky-300"
        >
          Começar ({TOTAL} perguntas)
        </button>
      </section>
    )

  if (fase.tipo === 'fim') {
    const nota = Math.round((fase.acertos / fase.total) * 100)
    let mensagem = 'Continue a praticar: reveja os erros abaixo.'
    if (nota >= 80) mensagem = 'Excelente! 🎉'
    else if (nota >= 50) mensagem = 'Bom trabalho — reveja os erros abaixo.'
    return (
      <section aria-label="Resultado do quiz" className={`${cartao} max-h-full overflow-y-auto`}>
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Resultado</p>
        <p className="mt-1 text-4xl font-bold text-white">
          {fase.acertos}
          <span className="text-xl text-slate-400">/{fase.total}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">{mensagem}</p>
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
            <p className="mt-2 text-[11px] text-slate-400">
              Elas voltarão nas próximas rodadas com “Revisar meus erros primeiro”.
            </p>
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
  const tocada: Estrutura | undefined = fase.resposta ? porId.get(fase.resposta) : undefined

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

      {fase.modo === 'identificar' ? (
        <>
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
        </>
      ) : fase.modo === 'ouvir' && !fase.resposta ? (
        <>
          <h2 className="mt-3 font-semibold text-white">Ouça o nome e toque na estrutura no modelo 3D</h2>
          <button
            type="button"
            onClick={() => dizerNome(p.alvo.id, p.alvo.nome, { forcar: true })}
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-400/50 bg-sky-400/10 font-medium text-sky-200 transition hover:bg-sky-400/20"
          >
            <IconeSom /> Ouvir de novo
          </button>
          <p className="mt-2 text-[11px] text-slate-400">Gire e aproxime o modelo à vontade antes de tocar.</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs text-slate-400">{fase.modo === 'ouvir' ? 'Era:' : 'Toque no modelo 3D:'}</p>
          <h2 className="text-lg leading-snug font-semibold text-white">{p.alvo.nome}</h2>
          {!fase.resposta && (
            <p className="mt-1 text-[11px] text-slate-400">Gire e aproxime o modelo à vontade antes de tocar.</p>
          )}
        </>
      )}

      {fase.resposta && (
        <div className="mt-3 min-h-0 overflow-y-auto text-sm" aria-live="polite">
          <p className={`font-semibold ${acertou ? 'text-emerald-300' : 'text-rose-300'}`}>
            {acertou ? 'Correto!' : fase.modo !== 'identificar' ? `Tocou em: ${tocada?.nome}` : `Era: ${p.alvo.nome}`}
          </p>
          {!acertou && fase.modo !== 'identificar' && (
            <p className="text-slate-300">A estrutura certa está destacada em azul no modelo.</p>
          )}
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
