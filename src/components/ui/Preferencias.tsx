import { useMemo, useState } from 'react'
import { catalogoDoCorpo, useCatalogo } from '../../data'
import { limparProgresso } from '../../data/progresso'
import versaoVoz from '../../data/voz.json'
import { useOffline, type EstadoOffline } from '../../hooks/useOffline'
import { useCaderno } from '../../store/caderno'
import { contaConfigurada } from '../../lib/supabase'
import { useConta } from '../../store/conta'
import { aparelhoModesto, usePreferencias, type Desempenho, type TamanhoTexto } from '../../store/preferencias'
import { Janela, Secao } from './Janela'

/** Grupo de botões em que só um fica escolhido. */
function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  mudar,
}: {
  rotulo: string
  opcoes: [T, string][]
  valor: T
  mudar: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex gap-1 rounded-full bg-white/5 p-1">
      {opcoes.map(([v, texto]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valor === v}
          onClick={() => mudar(v)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            valor === v ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  )
}

function BotaoDescarregar({ estado, baixar, texto }: { estado: EstadoOffline; baixar: () => void; texto: string }) {
  if (estado.fase === 'indisponivel') return null
  return (
    <button
      type="button"
      onClick={baixar}
      disabled={estado.fase !== 'parcial'}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-borda px-3 py-2.5 text-left transition enabled:hover:border-emerald-400/60"
    >
      <span className="text-slate-200">{texto}</span>
      <span className="shrink-0 text-xs font-medium text-emerald-300">
        {estado.fase === 'pronto'
          ? '✓ Guardado'
          : estado.fase === 'baixando'
            ? `${Math.round(estado.progresso * 100)}%`
            : 'Descarregar'}
      </span>
    </button>
  )
}

/** Preferências: leitura, desempenho, uso sem internet e o progresso guardado no aparelho. */
export function Preferencias({
  aberta,
  fechar,
  abrirSobre,
}: {
  aberta: boolean
  fechar: () => void
  abrirSobre: () => void
}) {
  const { tamanhoTexto, altoContraste, desempenho, batimento, definir } = usePreferencias()
  const { modelos, estruturas, sexo } = useCatalogo()
  const apagarCaderno = useCaderno((s) => s.apagarCaderno)
  const faseConta = useConta((s) => s.fase)
  const abrirConta = useConta((s) => s.abrir)
  const [confirmar, setConfirmar] = useState(false)
  const [apagado, setApagado] = useState(false)

  // Áudios dos nomes dos dois corpos
  const audios = useMemo(() => {
    const outro = catalogoDoCorpo(sexo === 'masculino' ? 'feminino' : 'masculino')
    const ids = new Set([...estruturas, ...(outro?.estruturas ?? [])].map((e) => e.id))
    return [...ids].map((id) => `/audio/nomes/${encodeURIComponent(id)}.m4a?v=${versaoVoz.versao}`)
  }, [estruturas, sexo])
  const offModelos = useOffline(modelos, 'modelos-3d')
  const offVoz = useOffline(audios, 'voz', 8)

  const apagar = () => {
    limparProgresso()
    apagarCaderno()
    setConfirmar(false)
    setApagado(true)
  }

  return (
    <Janela aberta={aberta} fechar={fechar} titulo="Preferências">
      <Secao titulo="Leitura">
        <p className="text-xs text-slate-400">Tamanho do texto</p>
        <Escolha<TamanhoTexto>
          rotulo="Tamanho do texto"
          valor={tamanhoTexto}
          mudar={(v) => definir({ tamanhoTexto: v })}
          opcoes={[
            ['normal', 'Normal'],
            ['grande', 'Grande'],
            ['muito-grande', 'Muito grande'],
          ]}
        />
        <label className="flex cursor-pointer items-center justify-between gap-3 pt-1">
          <span>
            <span className="block text-slate-200">Alto contraste</span>
            <span className="block text-xs text-slate-400">Textos mais claros e contornos mais visíveis</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={altoContraste}
            onChange={(e) => definir({ altoContraste: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-6 w-10 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-sky-500 peer-focus-visible:outline-2 peer-focus-visible:outline-sky-400 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
          />
        </label>
      </Secao>

      <Secao titulo="Animações">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-slate-200">Batimento do coração</span>
            <span className="block text-xs text-slate-400">O coração pulsa a 72 batimentos por minuto</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={batimento}
            onChange={(e) => definir({ batimento: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-6 w-10 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-sky-500 peer-focus-visible:outline-2 peer-focus-visible:outline-sky-400 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
          />
        </label>
      </Secao>

      <Secao titulo="Desempenho">
        <Escolha<Desempenho>
          rotulo="Qualidade dos modelos 3D"
          valor={desempenho}
          mudar={(v) => definir({ desempenho: v })}
          opcoes={[
            ['auto', 'Automático'],
            ['leve', 'Leve'],
            ['detalhado', 'Detalhado'],
          ]}
        />
        <p className="text-xs text-slate-400">
          {desempenho === 'auto' ? `Neste aparelho: ${aparelhoModesto() ? 'leve' : 'detalhado'}. ` : ''}O modo leve usa
          modelos simplificados e menos resolução: gasta menos dados e bateria e fica mais fluido em telemóveis
          modestos.
        </p>
      </Secao>

      <Secao titulo="Usar sem internet">
        <p className="text-xs text-slate-400">
          Guarde tudo neste aparelho para estudar sem rede. O que já viu fica guardado automaticamente.
        </p>
        <BotaoDescarregar estado={offModelos.estado} baixar={offModelos.baixar} texto="Modelos 3D dos dois corpos" />
        <BotaoDescarregar estado={offVoz.estado} baixar={offVoz.baixar} texto="Nomes falados" />
        {offModelos.estado.fase === 'indisponivel' && (
          <p className="text-xs text-slate-400">Este navegador não permite guardar o atlas para uso sem internet.</p>
        )}
      </Secao>

      <Secao titulo="O meu progresso">
        <p className="text-xs text-slate-400">
          {faseConta === 'com-sessao'
            ? 'Respostas do quiz, aulas concluídas, favoritos e notas estão guardados na sua conta e neste aparelho.'
            : 'Respostas do quiz, aulas concluídas, favoritos e notas ficam guardados só neste aparelho.'}
        </p>
        {contaConfigurada && (
          <button
            type="button"
            onClick={() => {
              fechar()
              abrirConta()
            }}
            className="rounded-full bg-sky-400/15 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-400/25"
          >
            {faseConta === 'com-sessao' ? 'Gerir a minha conta' : 'Entrar ou criar conta para guardar tudo'}
          </button>
        )}
        {apagado ? (
          <p className="text-xs font-medium text-emerald-300">✓ Progresso apagado.</p>
        ) : confirmar ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-slate-200">Apagar tudo? Não é possível desfazer.</span>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={apagar}
              className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400"
            >
              Apagar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className="rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
          >
            Apagar o meu progresso
          </button>
        )}
      </Secao>
      <button
        type="button"
        onClick={() => {
          fechar()
          abrirSobre()
        }}
        className="block w-full text-center text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200"
      >
        Sobre o Nitu: como usar e créditos
      </button>
    </Janela>
  )
}
