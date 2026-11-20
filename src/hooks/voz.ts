import versaoVoz from '../data/voz.json'
import { useAtlasStore } from '../store/useAtlasStore'

/**
 * Diz o nome de uma estrutura em voz alta.
 *
 * Os áudios são gerados uma vez por scripts/voz/gerar_audios.py (voz masculina neural) e ficam em
 * public/audio/nomes/<id>.m4a; a versão vai no endereço para o cache do aparelho buscar o áudio novo
 * quando a voz muda. Se o arquivo faltar (ou falhar), usa a voz do próprio aparelho.
 */
let tocando: HTMLAudioElement | null = null

export function dizerNome(id: string, nome: string, { forcar = false } = {}) {
  if (!forcar && !useAtlasStore.getState().voz) return
  pararVoz()
  const audio = new Audio(`/audio/nomes/${encodeURIComponent(id)}.m4a?v=${versaoVoz.versao}`)
  tocando = audio
  let recorreu = false
  const recorrer = () => {
    if (recorreu || tocando !== audio) return
    recorreu = true
    falarComVozDoAparelho(nome)
  }
  audio.addEventListener('error', recorrer)
  audio.play().catch(recorrer)
}

export function pararVoz() {
  tocando?.pause()
  tocando = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

/** Plano B: síntese do navegador, preferindo uma voz masculina em português. */
function falarComVozDoAparelho(nome: string) {
  if (typeof speechSynthesis === 'undefined') return
  const vozes = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt'))
  const masculina = /antonio|felipe|daniel|ricardo|eddy|reed|rocko|male|mascul/i
  const fala = new SpeechSynthesisUtterance(nome)
  fala.lang = 'pt-BR'
  fala.voice = vozes.find((v) => masculina.test(v.name)) ?? vozes.find((v) => v.lang === 'pt-BR') ?? vozes[0] ?? null
  speechSynthesis.speak(fala)
}
