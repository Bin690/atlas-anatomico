import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BotaoVoltar } from '../components/BotaoVoltar'
import { SeloPro } from '../components/ui/Pro'
import { useCatalogo } from '../data'
import { aulaPorId, variantesDe } from '../data/aulas'
import { figuraPorSrc } from '../data/figuras'
import { MiniaturaFigura } from '../components/ui/FiguraReferencia'
import { useAtlasStore } from '../store/useAtlasStore'
import type { PassoAula, Sexo } from '../types/atlas'
import NaoEncontrado from './NaoEncontrado'
import { BotoesVersao, SimboloSexo } from '../components/ui/SeletorCorpo'

/** Aplica um passo da aula ao 3D: camadas, raio-X, corte, isolamento, destaques e câmera. */
function aplicarPasso(p: PassoAula) {
  const s = useAtlasStore.getState()
  s.definirCamadas(p.camadas)
  s.definirRaioX(!!p.raioX)
  s.definirCorte(p.corte ?? null)
  useAtlasStore.setState({
    destaques: p.destaques ?? [],
    focoIds: p.foco ?? null,
    vista: p.vista ?? null,
    selecionada: null,
    pontoSelecao: null,
    ocultas: new Set(),
    isoladas: p.isolar?.length ? new Set(p.isolar) : null,
  })
  s.focar()
}

/** Remonta a aula ao trocar de id (ex.: versão ♂ ↔ ♀), recomeçando do primeiro passo. */
export default function AulaView() {
  const { id } = useParams()
  return <ConteudoAula key={id} id={id} />
}

function ConteudoAula({ id }: { id: string | undefined }) {
  const aula = aulaPorId(id)
  const navigate = useNavigate()
  const premium = useAtlasStore((s) => s.premium)
  const exigirPro = useAtlasStore((s) => s.exigirPro)
  const [indice, setIndice] = useState(0)
  const { porId } = useCatalogo()

  // Entra no modo aula guardando o estado do atlas, e restaura ao sair
  const anterior = useRef<{ camadas: string[]; raioX: boolean; sexo: Sexo } | null>(null)
  const sexoAula = aula?.sexo
  useEffect(() => {
    const s = useAtlasStore.getState()
    anterior.current = { camadas: [...s.camadas], raioX: s.raioX, sexo: s.sexo }
    // Aula de um corpo específico (ex.: sistema genital feminino): troca o corpo e volta ao sair
    if (sexoAula) s.definirSexo(sexoAula, { lembrar: false })
    s.abrirPainel(null)
    useAtlasStore.setState({ emAula: true })
    return () => {
      const st = useAtlasStore.getState()
      useAtlasStore.setState({
        emAula: false,
        destaques: [],
        focoIds: null,
        isoladas: null,
        ocultas: new Set(),
        vista: null,
      })
      st.definirCorte(null)
      if (anterior.current) {
        st.definirCamadas(anterior.current.camadas)
        st.definirRaioX(anterior.current.raioX)
        st.definirSexo(anterior.current.sexo, { lembrar: false })
      }
      st.selecionar(null, { focar: true })
    }
  }, [sexoAula])

  const bloqueada = !!aula?.premium && !premium
  useEffect(() => {
    if (aula && !bloqueada) aplicarPasso(aula.passos[indice])
  }, [aula, indice, bloqueada])

  // Setas do teclado avançam/voltam
  useEffect(() => {
    if (!aula) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndice((i) => Math.min(aula.passos.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndice((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aula])

  if (!aula) return <NaoEncontrado />

  const passo = aula.passos[indice]
  const variantes = variantesDe(aula)
  const ultimo = indice === aula.passos.length - 1
  const cartao = 'pointer-events-auto rounded-2xl border border-borda bg-superficie/95 p-4 shadow-2xl backdrop-blur'

  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <BotaoVoltar texto="Voltar ao atlas" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-amber-300 uppercase">Aula guiada</p>
          <h1 className="flex items-center gap-1.5 truncate text-lg leading-tight font-bold text-white">
            {aula.sexo && variantes.length < 2 && <SimboloSexo sexo={aula.sexo} />}
            {aula.titulo}
          </h1>
        </div>
        {variantes.length > 1 && (
          <BotoesVersao
            sexos={variantes.map((v) => v.sexo!)}
            atual={aula.sexo}
            escolher={(sexo) => navigate(`/aula/${variantes.find((v) => v.sexo === sexo)!.id}`, { replace: true })}
          />
        )}
      </header>

      <div className="absolute inset-x-2 bottom-2 max-h-[45vh] pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-6rem)] sm:w-[380px]">
        {bloqueada ? (
          <section className={cartao}>
            <SeloPro />
            <h2 className="mt-2 font-semibold text-white">Esta aula faz parte do plano PRO</h2>
            <p className="mt-1 text-sm text-slate-300">{aula.resumo}</p>
            <button
              type="button"
              onClick={() => exigirPro(`A aula “${aula.titulo}”`)}
              className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 font-semibold text-slate-950"
            >
              Conhecer o PRO
            </button>
          </section>
        ) : (
          <section aria-label={`Passo ${indice + 1}: ${passo.titulo}`} className={`${cartao} flex max-h-full flex-col`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Passo {indice + 1} de {aula.passos.length}
              </span>
              <span>~{aula.duracaoMin} min</span>
            </div>
            <ol className="mt-2 flex gap-1" aria-label="Progresso da aula">
              {aula.passos.map((p, i) => (
                <li key={p.titulo} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-label={`Ir para o passo ${i + 1}: ${p.titulo}`}
                    aria-current={i === indice ? 'step' : undefined}
                    className={`block h-1.5 w-full rounded-full transition ${i <= indice ? 'bg-amber-400' : 'bg-white/10 hover:bg-white/20'}`}
                  />
                </li>
              ))}
            </ol>
            <h2 className="mt-3 text-lg leading-snug font-semibold text-white">{passo.titulo}</h2>
            <div className="mt-2 min-h-0 overflow-y-auto" aria-live="polite">
              <p className="text-sm leading-relaxed text-slate-200">{passo.texto}</p>
              {figuraPorSrc(passo.figura) && <MiniaturaFigura figura={figuraPorSrc(passo.figura)!} />}
              {/* No celular, os nomes ficam nesta legenda e o modelo mostra só os números */}
              {!!passo.destaques?.length && (
                <ol className="mt-3 space-y-1 sm:hidden" aria-label="Estruturas destacadas">
                  {passo.destaques.slice(0, 10).map((id, i) => (
                    <li key={id} className="flex items-start gap-2 text-[13px] text-slate-200">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">
                        {i + 1}
                      </span>
                      {porId.get(id)?.nome}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIndice((i) => i - 1)}
                disabled={indice === 0}
                className="min-h-11 flex-1 rounded-xl border border-borda font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-40"
              >
                Anterior
              </button>
              {ultimo ? (
                <button
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="min-h-11 flex-[2] rounded-xl bg-amber-400 font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Concluir e fazer o quiz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndice((i) => i + 1)}
                  className="min-h-11 flex-[2] rounded-xl bg-amber-400 font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Próximo
                </button>
              )}
            </div>
            <Link to="/" className="mt-2 text-center text-xs text-slate-400 hover:text-white">
              Sair da aula
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
