import { useProgress } from '@react-three/drei'
import { useEffect } from 'react'
import { Toolbar } from '../components/Toolbar'
import { CartaoEstrutura } from '../components/ui/CartaoEstrutura'
import { DicaHover } from '../components/ui/DicaHover'
import { IconeBusca } from '../components/ui/Icones'
import { PainelBusca } from '../components/ui/PainelBusca'
import { PainelCamadas } from '../components/ui/PainelCamadas'
import { PainelCortes } from '../components/ui/PainelCortes'
import { PainelAulas } from '../components/ui/PainelAulas'
import { useCatalogo } from '../data'
import { useAtlasStore } from '../store/useAtlasStore'

/** Indicador discreto enquanto alguma camada 3D está sendo baixada. */
function CarregandoCamada() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <output className="pointer-events-none absolute top-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 shadow-lg ring-1 ring-white/10">
      <span className="size-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" aria-hidden />
      Carregando modelos 3D… {Math.round(progress)}%
    </output>
  )
}

/** Dica inicial: some de vez após a primeira seleção. */
let dicaVista = false
function DicaInicial() {
  const selecionada = useAtlasStore((s) => s.selecionada)
  if (selecionada) dicaVista = true
  if (dicaVista) return null
  return (
    <p className="pointer-events-none absolute bottom-24 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-center text-xs text-slate-300 ring-1 ring-white/10 backdrop-blur sm:bottom-28 sm:text-sm">
      Toque em qualquer parte do corpo para ver o nome · use <strong className="text-white">Camadas</strong> para ver
      músculos, vasos e nervos
    </p>
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
  const painel = useAtlasStore((s) => s.painel)
  const selecionada = useAtlasStore((s) => s.selecionada)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const selecionar = useAtlasStore((s) => s.selecionar)

  // Atalhos: "/" ou Ctrl/⌘+K abre a busca; Esc fecha painel ou seleção
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const digitando = (e.target as HTMLElement)?.tagName === 'INPUT'
      if ((e.key === '/' && !digitando) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        abrirPainel('busca')
      } else if (e.key === 'Escape') {
        const { painel: p } = useAtlasStore.getState()
        if (p) abrirPainel(null)
        else selecionar(null)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abrirPainel, selecionar])

  const folha =
    'pointer-events-auto absolute inset-x-2 bottom-[84px] max-h-[min(60vh,520px)] sm:inset-x-auto sm:bottom-24 sm:max-h-none'

  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-sky-400 uppercase">Atlas Anatômico 3D</p>
          <h1 className="text-lg leading-tight font-bold text-white sm:text-xl">Corpo humano</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => abrirPainel('aulas')}
            className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-amber-400/40 bg-superficie/80 px-4 text-sm font-medium text-amber-200 backdrop-blur transition hover:border-amber-300 hover:text-white"
          >
            Aulas
          </button>
          <button
            type="button"
            onClick={() => abrirPainel('busca')}
            className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-borda bg-superficie/80 px-4 text-sm text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
          >
            <IconeBusca className="size-4" />
            <span className="hidden sm:inline">Buscar entre {estruturas.length} estruturas</span>
            <span className="sm:hidden">Buscar</span>
            <kbd className="ml-2 hidden rounded border border-slate-600 px-1.5 text-[10px] text-slate-400 lg:inline">
              /
            </kbd>
          </button>
        </div>
      </header>

      <CarregandoCamada />
      {!painel && !selecionada && <DicaInicial />}

      {/* Painel de camadas ou busca: folha inferior no celular, coluna à esquerda no desktop */}
      {painel && (
        <aside
          className={`${folha} flex flex-col overflow-hidden rounded-2xl border border-borda bg-superficie/95 shadow-2xl backdrop-blur sm:top-20 sm:left-4 sm:w-[340px]`}
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

      <p className="absolute bottom-3 left-4 hidden max-w-[220px] text-[10px] leading-snug text-slate-500 xl:block">
        Modelos 3D:{' '}
        <a
          href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-slate-300"
        >
          BodyParts3D
        </a>
        , © The Database Center for Life Science, CC BY 4.0 (adaptados).
      </p>

      <DicaHover />
    </main>
  )
}
