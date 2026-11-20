import { useProgress } from '@react-three/drei'
import { useCallback, useEffect, useState } from 'react'
import { Toolbar } from '../components/Toolbar'
import { CartaoEstrutura } from '../components/ui/CartaoEstrutura'
import { DicaHover } from '../components/ui/DicaHover'
import { IconeAulas, IconeBusca, IconeInfo, IconeSemSom, IconeSom } from '../components/ui/Icones'
import { Sobre } from '../components/ui/Sobre'
import { pararVoz } from '../hooks/voz'
import { PainelBusca } from '../components/ui/PainelBusca'
import { PainelCamadas } from '../components/ui/PainelCamadas'
import { PainelCortes } from '../components/ui/PainelCortes'
import { PainelAulas } from '../components/ui/PainelAulas'
import { SeletorCorpo } from '../components/ui/SeletorCorpo'
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

/**
 * Dica inicial: aparece só nas primeiras visitas, some sozinha após alguns segundos ou no primeiro toque,
 * e não volta depois de vista (fica guardado no aparelho).
 */
const CHAVE_DICA = 'atlas3d:dica-vista'
const DURACAO_DICA = 8000
let dicaVista = (() => {
  try {
    return localStorage.getItem(CHAVE_DICA) === '1'
  } catch {
    return false
  }
})()
function DicaInicial() {
  const [visivel, setVisivel] = useState(!dicaVista)
  useEffect(() => {
    if (!visivel) return
    const esconder = () => {
      dicaVista = true
      try {
        localStorage.setItem(CHAVE_DICA, '1')
      } catch {
        // sem armazenamento: some só nesta sessão
      }
      setVisivel(false)
    }
    const timer = setTimeout(esconder, DURACAO_DICA)
    window.addEventListener('pointerdown', esconder, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', esconder)
    }
  }, [visivel])
  if (!visivel) return null
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
  const voz = useAtlasStore((s) => s.voz)
  const [sobreAberto, setSobreAberto] = useState(false)
  const fecharSobre = useCallback(() => setSobreAberto(false), [])
  const alternarVoz = useAtlasStore((s) => s.alternarVoz)

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
    'pointer-events-auto absolute inset-x-2 bottom-[84px] max-h-[min(60vh,520px)] sm:inset-x-auto sm:bottom-24'

  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-sky-400 uppercase">Atlas Anatômico 3D</p>
          <div className="flex items-center gap-1">
            <h1 className="text-lg leading-tight font-bold text-white sm:text-xl">Corpo humano</h1>
            <button
              type="button"
              onClick={() => setSobreAberto(true)}
              aria-label="Sobre o atlas: como usar e créditos"
              title="Sobre o atlas: como usar e créditos"
              className="pointer-events-auto grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <IconeInfo className="size-[18px]" />
            </button>
          </div>
          <SeletorCorpo />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (voz) pararVoz()
              alternarVoz()
            }}
            aria-pressed={voz}
            aria-label={voz ? 'Voz ligada: diz o nome da peça tocada' : 'Voz desligada'}
            title={voz ? 'Voz ligada: diz o nome da peça tocada' : 'Voz desligada'}
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
          >
            {voz ? <IconeSom /> : <IconeSemSom />}
          </button>
          <button
            type="button"
            onClick={() => abrirPainel('aulas')}
            aria-label="Aulas guiadas"
            title="Aulas guiadas"
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-amber-400/40 bg-superficie/80 text-amber-200 backdrop-blur transition hover:border-amber-300 hover:text-white"
          >
            <IconeAulas />
          </button>
          {/* Com o painel de busca aberto, o campo dele já é a busca: o botão ficaria duplicado */}
          {painel !== 'busca' && (
            <button
              type="button"
              onClick={() => abrirPainel('busca')}
              aria-label={`Buscar entre ${estruturas.length} estruturas`}
              title={`Buscar entre ${estruturas.length} estruturas (atalho: /)`}
              className="pointer-events-auto grid size-11 place-items-center rounded-full border border-borda bg-superficie/80 text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-white"
            >
              <IconeBusca />
            </button>
          )}
        </div>
      </header>

      <CarregandoCamada />
      {!painel && !selecionada && <DicaInicial />}

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

      <DicaHover />
    </main>
  )
}
