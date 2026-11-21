/** "há instantes", "há 5 min", "há 2 h", "há 3 dias". */
export function haQuanto(quando: number, agora = Date.now()): string {
  const s = Math.max(0, Math.round((agora - quando) / 1000))
  if (s < 45) return 'há instantes'
  const min = Math.round(s / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}
