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

/** Plano B: síntese do navegador, preferindo português europeu e uma voz masculina. */
function falarComVozDoAparelho(nome: string) {
  if (typeof speechSynthesis === 'undefined') return
  const vozes = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt'))
  const masculina = /joaquim|duarte|antonio|felipe|daniel|ricardo|eddy|reed|rocko|male|mascul/i
  const europeia = (v: SpeechSynthesisVoice) => /pt[-_]pt/i.test(v.lang)
  const fala = new SpeechSynthesisUtterance(nome)
  fala.lang = 'pt-PT'
  fala.voice =
    vozes.find((v) => europeia(v) && masculina.test(v.name)) ??
    vozes.find(europeia) ??
    vozes.find((v) => masculina.test(v.name)) ??
    vozes[0] ??
    null
  speechSynthesis.speak(fala)
}
