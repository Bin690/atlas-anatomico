import { useSyncExternalStore } from 'react'

/** Mesmo ponto de quebra do Tailwind `sm` (640px): abaixo disso é tela de celular. */
const consulta = '(max-width: 639px)'

function assinar(aviso: () => void) {
  const mq = window.matchMedia(consulta)
  mq.addEventListener('change', aviso)
  return () => mq.removeEventListener('change', aviso)
}

/** `true` quando a tela é estreita (celular). */
export function useTelaPequena() {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}
