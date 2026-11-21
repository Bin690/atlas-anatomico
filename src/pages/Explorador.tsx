import { useProgress } from '@react-three/drei'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Toolbar } from '../components/Toolbar'
import { CartaoEstrutura } from '../components/ui/CartaoEstrutura'
import { DicaHover } from '../components/ui/DicaHover'
import {
  IconeAulas,
  IconeBusca,
  IconeConta,
  IconeDefinicoes,
  IconeInfo,
  IconePartilhar,
  IconeSemSom,
  IconeSom,
} from '../components/ui/Icones'
import { aplicarVistaDoLink, partilharVista } from '../hooks/compartilhar'
import { Conta } from '../components/ui/Conta'
import { Sobre } from '../components/ui/Sobre'
import { SugestaoRegiao } from '../components/ui/SugestaoRegiao'
import { Preferencias } from '../components/ui/Preferencias'
import { pararVoz } from '../hooks/voz'
import { PainelBusca } from '../components/ui/PainelBusca'
import { PainelCamadas } from '../components/ui/PainelCamadas'
import { PainelCortes } from '../components/ui/PainelCortes'
import { PainelAulas } from '../components/ui/PainelAulas'
import { SeletorCorpo } from '../components/ui/SeletorCorpo'
import { useCatalogo } from '../data'
import { contaConfigurada } from '../lib/supabase'
import { useConta } from '../store/conta'
import { useAtlasStore } from '../store/useAtlasStore'

/** Indicador discreto enquanto alguma camada 3D está sendo baixada. */
function CarregandoCamada() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <output className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+8rem)] left-1/2 flex sm:top-16 -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 shadow-lg ring-1 ring-white/10">
      <span className="size-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" aria-hidden />A
      carregar modelos 3D… {Math.round(progress)}%
    </output>
  )
}

/**
 * Primeiros passos: três dicas curtas na primeira visita (podem ser saltadas) e não voltam depois de
 * vistas (fica guardado no aparelho).
 */
const CHAVE_BOAS_VINDAS = 'atlas3d:primeiros-passos'
const PASSOS_INICIAIS: { titulo: string; texto: ReactNode }[] = [
  {
    titulo: 'Toque numa estrutura',
    texto: 'Toque em qualquer parte do corpo para ver o nome, ouvi-lo e abrir a descrição.',
  },
  {
    titulo: 'Rode, aproxime e desloque',
    texto: (
      <>
        Arraste para rodar e use dois dedos (ou a roda do rato) para aproximar. Para deslocar a vista, use{' '}
        <strong className="text-white">Mover</strong>.
      </>
    ),
  },
  {
    titulo: 'Explore por dentro',
    texto: (
      <>
        <strong className="text-white">Camadas</strong> mostra músculos, vasos e nervos,{' '}
        <strong className="text-white">Cortes</strong> fatia o corpo e as{' '}
        <strong className="text-amber-200">aulas</strong> guiam o estudo passo a passo.
      </>
    ),
  },
]
let boasVindasVistas = (() => {
  try {
    return localStorage.getItem(CHAVE_BOAS_VINDAS) === '1'
  } catch {
    return false
  }
})()
function PrimeirosPassos() {
  const [passo, setPasso] = useState<number | null>(boasVindasVistas ? null : 0)
  if (passo === null) return null
  const terminar = () => {
    boasVindasVistas = true
    try {
      localStorage.setItem(CHAVE_BOAS_VINDAS, '1')
    } catch {
      // sem armazenamento: some só nesta sessão
    }
    setPasso(null)
  }
  const ultimo = passo === PASSOS_INICIAIS.length - 1
  const atual = PASSOS_INICIAIS[passo]
  return (
    <section
      aria-label="Primeiros passos"
      className="pointer-events-auto absolute inset-x-3 bottom-[88px] mx-auto max-w-sm rounded-2xl border border-sky-400/30 bg-superficie/95 p-4 shadow-2xl backdrop-blur sm:bottom-28"
    >
      <p className="text-[11px] font-medium tracking-wide text-sky-400 uppercase">
        Primeiros passos · {passo + 1}/{PASSOS_INICIAIS.length}
      </p>
      <h2 className="mt-1 font-semibold text-white">{atual.titulo}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{atual.texto}</p>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={terminar} className="text-xs text-slate-400 hover:text-white">
          Saltar
        </button>
        <button
          type="button"
          onClick={() => (ultimo ? terminar() : setPasso(passo + 1))}
          className="rounded-full bg-sky-400 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
        >
          {ultimo ? 'Começar' : 'Seguinte'}
        </button>
      </div>
    </section>
  )
}

/** Entrada para a conta (com um ponto verde quando há sessão iniciada). */
function BotaoConta() {
  const abrir = useConta((s) => s.abrir)
  const comSessao = useConta((s) => s.fase === 'com-sessao')
  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={comSessao ? 'A minha conta (sessão iniciada)' : 'Entrar ou criar conta'}
      title={comSessao ? 'A minha conta' : 'Entrar ou criar conta'}
      className="pointer-events-auto relative grid size-10 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
    >
      <IconeConta className="size-5" />
      {comSessao && (
        <span
          className="absolute top-1 right-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-superficie"
          aria-hidden
        />
      )}
    </button>
  )
}

/** Região isolada pelo painel de regiões, com o botão para voltar a ver tudo. */
function AvisoRegiao() {
  const regiao = useAtlasStore((s) => s.regiaoAtiva)
  const mostrarTudo = useAtlasStore((s) => s.mostrarTudo)
  const focar = useAtlasStore((s) => s.focar)
  if (!regiao) return null
  return (
    <div className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+7.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-400/40 bg-superficie/95 py-1 pr-1 pl-3 text-sm text-slate-100 shadow-lg backdrop-blur sm:top-4">
      <span className="whitespace-nowrap">
        <span className="text-slate-400">Região:</span> {regiao}
      </span>
      <button
        type="button"
        onClick={() => {
          mostrarTudo()
          focar()
        }}
        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium whitespace-nowrap hover:bg-white/20"
      >
        Mostrar tudo
      </button>
    </div>
  )
}

/** Aviso discreto quando o aparelho fica sem rede (o que já foi visto continua a funcionar). */
function SemInternet() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine)
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => {
      window.removeEventListener('online', atualizar)
      window.removeEventListener('offline', atualizar)
    }
  }, [])
  if (online) return null
  return (
    <output className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 -translate-x-1/2 rounded-full bg-slate-800/95 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
      Sem internet · a usar o que está guardado
    </output>
  )
}

function PainelAtual({ painel }: { painel: string }) {
  if (painel === 'busca') return <PainelBusca />
  if (painel === 'cortes') return <PainelCortes />
  if (painel === 'aulas') return <PainelAulas />
  return <PainelCamadas />
}

export default function Explorador() {
  const { estruturas } = useCatalogo()
  const [aviso, setAviso] = useState<string | null>(null)

  // Link partilhado: aplica a vista uma vez e limpa o endereço
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (aplicarVistaDoLink(params)) history.replaceState(null, '', location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])
  const partilhar = async () => {
    const r = await partilharVista('Nitu · Atlas Anatómico')
    if (r === 'copiado') setAviso('Link da vista copiado')
    else if (r === 'falhou') setAviso('Não foi possível copiar o link')
  }
  const painel = useAtlasStore((s) => s.painel)
  const selecionada = useAtlasStore((s) => s.selecionada)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const selecionar = useAtlasStore((s) => s.selecionar)
  const voz = useAtlasStore((s) => s.voz)
  const [sobreAberto, setSobreAberto] = useState(false)
  const fecharSobre = useCallback(() => setSobreAberto(false), [])
  const [prefAbertas, setPrefAbertas] = useState(false)
  const fecharPref = useCallback(() => setPrefAbertas(false), [])
  const alternarVoz = useAtlasStore((s) => s.alternarVoz)

  // Atalhos: "/" ou Ctrl/⌘+K abre a pesquisa; Esc fecha o painel, tira a seleção ou mostra tudo
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const digitando = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      if ((e.key === '/' && !digitando) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        abrirPainel('busca')
      } else if (e.key === 'Escape' && !digitando) {
        // Esc desfaz por ordem: fecha o painel, tira a seleção, mostra tudo (desfaz o isolamento)
        const { painel: p, selecionada, isoladas, mostrarTudo, focar } = useAtlasStore.getState()
        if (p) abrirPainel(null)
        else if (selecionada) selecionar(null)
        else if (isoladas) {
          mostrarTudo()
          focar()
        }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abrirPainel, selecionar])

  const folha =
    'pointer-events-auto absolute inset-x-2 bottom-[84px] max-h-[min(60vh,520px)] sm:inset-x-auto sm:bottom-24'

  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] max-[379px]:gap-1 max-[379px]:[&_button]:size-9 sm:p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-400">
            <img src="/icone.svg" alt="" className="-ml-1 size-7" />
            <span>Nitu</span>
            <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Atlas Anatómico</span>
          </p>
          {/* ⓘ na linha do seletor: ao lado do título não cabia em celulares estreitos */}
          <div className="mt-2 flex items-center gap-1.5">
            <SeletorCorpo />
            <button
              type="button"
              onClick={() => setSobreAberto(true)}
              aria-label="Sobre o atlas: como usar e créditos"
              title="Sobre o atlas: como usar e créditos"
              // Em ecrãs estreitos (< 460 px) não cabe ao lado dos outros: "Sobre" fica nas Preferências
              className="pointer-events-auto grid size-10 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white max-[459px]:hidden"
            >
              <IconeInfo className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPrefAbertas(true)}
              aria-label="Preferências: texto, desempenho e uso sem internet"
              title="Preferências: texto, desempenho e uso sem internet"
              className="pointer-events-auto grid size-10 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
            >
              <IconeDefinicoes className="size-5" />
            </button>
            {contaConfigurada && <BotaoConta />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              if (voz) pararVoz()
              alternarVoz()
            }}
            aria-pressed={voz}
            aria-label={voz ? 'Voz ligada: diz o nome da peça tocada' : 'Voz desligada'}
            title={voz ? 'Voz ligada: diz o nome da peça tocada' : 'Voz desligada'}
            className="pointer-events-auto grid size-10 place-items-center sm:size-11 rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
          >
            {voz ? <IconeSom /> : <IconeSemSom />}
          </button>
          <button
            type="button"
            onClick={() => void partilhar()}
            aria-label="Partilhar esta vista"
            title="Partilhar esta vista (link com câmara, camadas e corte)"
            className="pointer-events-auto grid size-10 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white sm:size-11"
          >
            <IconePartilhar />
          </button>
          <button
            type="button"
            onClick={() => abrirPainel('aulas')}
            aria-label="Aulas guiadas"
            title="Aulas guiadas"
            className="pointer-events-auto grid size-10 place-items-center sm:size-11 rounded-full border border-amber-400/40 bg-superficie/80 text-amber-200 backdrop-blur transition hover:border-amber-300 hover:text-white"
          >
            <IconeAulas />
          </button>
          {/* Com o painel de busca aberto, o campo dele já é a busca: o botão ficaria duplicado */}
          {painel !== 'busca' && (
            <button
              type="button"
              onClick={() => abrirPainel('busca')}
              aria-label={`Pesquisar entre ${estruturas.length} estruturas`}
              title={`Pesquisar entre ${estruturas.length} estruturas (atalho: /)`}
              className="pointer-events-auto grid size-10 place-items-center sm:size-11 rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
            >
              <IconeBusca />
            </button>
          )}
        </div>
      </header>

      <CarregandoCamada />
      {aviso && (
        <output className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg">
          {aviso}
        </output>
      )}
      <SemInternet />
      <AvisoRegiao />
      <SugestaoRegiao />
      {!painel && !selecionada && <PrimeirosPassos />}

      {/* Painel de camadas ou busca: folha inferior no celular, coluna à esquerda no desktop */}
      {painel && (
        <aside
          className={`${folha} flex flex-col overflow-hidden rounded-2xl border border-borda bg-superficie/95 shadow-2xl backdrop-blur sm:top-32 sm:bottom-auto sm:left-4 sm:max-h-[calc(100%-14rem)] sm:w-[340px]`}
        >
          <PainelAtual painel={painel} />
        </aside>
      )}

      {/* Cartão da estrutura: folha inferior no celular (some se houver painel), coluna à direita no desktop */}
      {selecionada && (
        <aside
          className={`${folha} flex flex-col sm:top-20 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-11rem)] sm:w-[360px] ${painel ? 'max-sm:hidden' : ''}`}
        >
          <CartaoEstrutura />
        </aside>
      )}

      <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Toolbar />
      </div>

      <Sobre aberto={sobreAberto} fechar={fecharSobre} />
      <Preferencias aberta={prefAbertas} fechar={fecharPref} abrirSobre={() => setSobreAberto(true)} />
      <Conta />

      <DicaHover />
    </main>
  )
}
