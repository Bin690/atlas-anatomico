import { aplicarCamera, lerCamera } from '../components/3d/RigCamera'
import { catalogoDoCorpo, equivalenteNoCorpo } from '../data'
import { useAtlasStore, type PlanoCorte } from '../store/useAtlasStore'
import type { Vec3 } from '../types/atlas'

/**
 * Link de uma vista do atlas: corpo, camadas, raio-X, corte, peças isoladas, peça selecionada e
 * câmera. Ex.: /?corpo=f&camadas=esqueleto,genital&peca=VHF_cervix&cam=0.1,0.9,0.4,0,0.9,0
 */
const num = (n: number) => String(Math.round(n * 1000) / 1000)

export function linkDaVista(): string {
  const s = useAtlasStore.getState()
  const q = new URLSearchParams()
  q.set('corpo', s.sexo === 'feminino' ? 'f' : 'm')
  q.set('camadas', [...s.camadas].join(','))
  if (s.raioX) q.set('raiox', '1')
  if (s.corte) {
    const { plano, posicao, inverter, normal } = s.corte
    q.set('corte', [plano, num(posicao), inverter ? 1 : 0, ...(normal ?? []).map(num)].join(','))
  }
  if (s.isoladas) q.set('isolar', [...s.isoladas].join(','))
  if (s.selecionada) q.set('peca', s.selecionada)
  const cam = lerCamera()
  if (cam) q.set('cam', cam.map(num).join(','))
  return `${location.origin}/?${q.toString().replace(/%2C/g, ',')}`
}

/** Aplica a vista de um link (se houver). Retorna se havia vista no endereço. */
export function aplicarVistaDoLink(params: URLSearchParams): boolean {
  if (!params.has('camadas') && !params.has('peca') && !params.has('cam')) return false
  const s = useAtlasStore.getState()
  const lista = (chave: string) => (params.get(chave) ?? '').split(',').filter(Boolean)

  // O corpo do link vale para esta visita, sem trocar a preferência guardada no aparelho
  const corpo = params.get('corpo')
  if (corpo === 'f' || corpo === 'm') s.definirSexo(corpo === 'f' ? 'feminino' : 'masculino', { lembrar: false })
  // Os ids são validados no catálogo do corpo do link (o útero não existe no corpo masculino, por exemplo)
  const sexo = useAtlasStore.getState().sexo
  const catalogo = catalogoDoCorpo(sexo)
  const idValido = (id: string) => !!catalogo?.porId.has(id)
  // Ids do outro corpo com equivalente neste (ex.: a pelve) são trocados pelo equivalente
  const noCorpo = (id: string) => equivalenteNoCorpo(id, sexo)
  if (params.has('camadas')) s.definirCamadas(lista('camadas'))
  s.definirRaioX(params.get('raiox') === '1')

  const corte = lista('corte')
  if (corte.length >= 3 && ['axial', 'sagital', 'coronal'].includes(corte[0])) {
    const normal = corte.length === 6 ? (corte.slice(3).map(Number) as Vec3) : undefined
    s.definirCorte({ plano: corte[0] as PlanoCorte, posicao: Number(corte[1]), inverter: corte[2] === '1', normal })
  } else s.definirCorte(null)

  const isolar = lista('isolar').map(noCorpo).filter(idValido)
  useAtlasStore.setState({ isoladas: isolar.length ? new Set(isolar) : null, ocultas: new Set() })
  const pedida = params.get('peca')
  const peca = pedida ? noCorpo(pedida) : null
  s.selecionar(peca && idValido(peca) ? peca : null)

  // A câmera vai por último, depois de as camadas começarem a montar
  const cam = lista('cam').map(Number)
  if (cam.length === 6) setTimeout(() => aplicarCamera(cam), 600)
  return true
}

/** Partilha a vista atual (menu do sistema no celular; senão, copia o link). Retorna o que aconteceu. */
export async function partilharVista(titulo: string): Promise<'partilhado' | 'copiado' | 'cancelado' | 'falhou'> {
  const url = linkDaVista()
  // Menu nativo de partilha só em ecrãs de toque; no computador, copiar o link é mais direto
  const toque = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  if (navigator.share && toque) {
    try {
      await navigator.share({ title: titulo, url })
      return 'partilhado'
    } catch (e) {
      // AbortError = o usuário fechou o menu; outros erros: tenta copiar
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
    }
  }
  return (await copiar(url)) ? 'copiado' : 'falhou'
}

/** Copia texto; se a API moderna for recusada, tenta o método antigo (seleção + copiar). */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const campo = document.createElement('textarea')
    campo.value = texto
    campo.style.position = 'fixed'
    campo.style.opacity = '0'
    document.body.appendChild(campo)
    campo.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(campo)
    return ok
  }
}
