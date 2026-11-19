import { useEffect, useRef } from 'react'
import { useCatalogo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'

/** Nome da estrutura sob o mouse, seguindo o cursor (só em dispositivos com mouse). */
export function DicaHover() {
  const { porId } = useCatalogo()
  const hover = useAtlasStore((s) => s.hover)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (caixa.current) caixa.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`
    }
    window.addEventListener('pointermove', mover)
    return () => window.removeEventListener('pointermove', mover)
  }, [])

  const nome = hover ? porId.get(hover)?.nome : null
  return (
    <div
      ref={caixa}
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-50 rounded-md bg-slate-950/90 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg ring-1 ring-white/10 transition-opacity ${nome ? 'opacity-100' : 'opacity-0'}`}
    >
      {nome}
    </div>
  )
}
