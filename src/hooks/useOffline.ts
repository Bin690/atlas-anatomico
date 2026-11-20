import { useCallback, useEffect, useState } from 'react'
const CACHE = 'modelos-3d'

export type EstadoOffline =
  { fase: 'indisponivel' } | { fase: 'parcial' } | { fase: 'baixando'; progresso: number } | { fase: 'pronto' }

/**
 * Baixa todos os modelos 3D para o cache do service worker (estratégia CacheFirst),
 * permitindo usar o atlas inteiro sem internet.
 */
/** @param arquivos todos os modelos .glb (versões detalhada e leve, dos dois corpos) */
export function useOffline(arquivos: string[]) {
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
        // Compara caminho + versão (?v=…): um modelo regenerado conta como ainda não baixado
        const salvos = new Set(
          chaves.map((r) => {
            const u = new URL(r.url)
            return u.pathname + u.search
          }),
        )
        if (ativo && arquivos.every((a) => salvos.has(a))) setEstado({ fase: 'pronto' })
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [suportado, arquivos])

  const baixar = useCallback(async () => {
    if (!suportado) return
    setEstado({ fase: 'baixando', progresso: 0 })
    let feitos = 0
    const lista = arquivos
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
  }, [suportado, arquivos])

  return { estado, baixar }
}
