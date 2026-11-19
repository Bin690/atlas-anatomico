import { useCallback, useEffect, useState } from 'react'
import type { Sistema } from '../types/atlas'

const CACHE = 'modelos-3d'

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
        if (ativo && sistemas.every((s) => salvos.has(s.modelo))) setEstado({ fase: 'pronto' })
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
    for (const s of sistemas) {
      try {
        // A requisição passa pelo service worker, que guarda a resposta no cache
        const r = await fetch(s.modelo)
        await r.arrayBuffer()
      } catch {
        setEstado({ fase: 'parcial' })
        return
      }
      feitos++
      setEstado({ fase: 'baixando', progresso: feitos / sistemas.length })
    }
    setEstado({ fase: 'pronto' })
  }, [suportado, sistemas])

  return { estado, baixar }
}
