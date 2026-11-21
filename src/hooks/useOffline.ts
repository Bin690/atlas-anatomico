import { useCallback, useEffect, useState } from 'react'

export type EstadoOffline =
  { fase: 'indisponivel' } | { fase: 'parcial' } | { fase: 'baixando'; progresso: number } | { fase: 'pronto' }

/**
 * Descarrega uma lista de ficheiros para o cache do service worker (estratégia CacheFirst), para usar
 * o atlas sem internet: os modelos 3D (cache "modelos-3d") ou os nomes falados (cache "voz").
 *
 * @param arquivos endereços com a versão (?v=…): um ficheiro regenerado conta como ainda não guardado
 * @param cache nome do cache do service worker (vite.config.ts)
 * @param emParalelo pedidos simultâneos (muitos ficheiros pequenos, como os áudios, vão mais rápido assim)
 */
export function useOffline(arquivos: string[], cache: string, emParalelo = 1) {
  const suportado = typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator
  const [estado, setEstado] = useState<EstadoOffline>({ fase: suportado ? 'parcial' : 'indisponivel' })

  // Já está tudo em cache?
  useEffect(() => {
    if (!suportado || !arquivos.length) return
    let ativo = true
    caches
      .open(cache)
      .then((c) => c.keys())
      .then((chaves) => {
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
  }, [suportado, arquivos, cache])

  const baixar = useCallback(async () => {
    if (!suportado) return
    setEstado({ fase: 'baixando', progresso: 0 })
    let feitos = 0
    let falhou = false
    const fila = [...arquivos]
    // A requisição passa pelo service worker, que guarda a resposta no cache
    const trabalhador = async () => {
      for (let url = fila.shift(); url && !falhou; url = fila.shift()) {
        try {
          const r = await fetch(url)
          if (!r.ok) throw new Error(String(r.status))
          await r.arrayBuffer()
        } catch {
          falhou = true
          return
        }
        feitos++
        setEstado({ fase: 'baixando', progresso: feitos / arquivos.length })
      }
    }
    await Promise.all(Array.from({ length: emParalelo }, trabalhador))
    setEstado(falhou ? { fase: 'parcial' } : { fase: 'pronto' })
  }, [suportado, arquivos, emParalelo])

  return { estado, baixar }
}
