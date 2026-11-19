import { useCallback, useEffect, useState } from 'react'
import type { Sistema } from '../types/atlas'

const CACHE = 'modelos-3d'

/** Todos os arquivos de modelo (versões detalhada e leve). */
const arquivos = (sistemas: Sistema[]) =>
  sistemas.flatMap((s) => (s.modeloLeve ? [s.modelo, s.modeloLeve] : [s.modelo]))

export type EstadoOffline =
  { fase: 'indisponivel' } | { fase: 'parcial' } | { fase: 'baixando'; progresso: number } | { fase: 'pronto' }

/**
 * Baixa todos os modelos 3D para o cache do service worker (estratégia CacheFirst),
 * permitindo usar o atlas inteiro sem internet.
 */
export function useOffline(sistemas: Sistema[]) {
  const suportado = typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator
  const [estado, setEstado] = useState<EstadoOffline>({ fase: suportado ? 'parcial' : 'indisponivel' })

  // Já está tudo em cache?
  useEffect(() => {
    if (!suportado) return
    let ativo = true
    caches
      .open(CACHE)
      .then((c) => c.keys())
      .then((chaves) => {
        const salvos = new Set(chaves.map((r) => new URL(r.url).pathname))
        if (ativo && arquivos(sistemas).every((a) => salvos.has(a))) setEstado({ fase: 'pronto' })
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [suportado, sistemas])

  const baixar = useCallback(async () => {
    if (!suportado) return
    setEstado({ fase: 'baixando', progresso: 0 })
    let feitos = 0
    const lista = arquivos(sistemas)
    for (const url of lista) {
      try {
        // A requisição passa pelo service worker, que guarda a resposta no cache
        const r = await fetch(url)
        await r.arrayBuffer()
      } catch {
        setEstado({ fase: 'parcial' })
        return
      }
      feitos++
      setEstado({ fase: 'baixando', progresso: feitos / lista.length })
    }
    setEstado({ fase: 'pronto' })
  }, [suportado, sistemas])

  return { estado, baixar }
}
