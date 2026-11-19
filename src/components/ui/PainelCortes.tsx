import { direcaoDaVista, LIMITES } from '../3d/corte'
import { useAtlasStore, type Corte, type PlanoCorte } from '../../store/useAtlasStore'
import { IconeFechar } from './Icones'

const PLANOS: { id: PlanoCorte; nome: string; dica: string }[] = [
  { id: 'axial', nome: 'Axial', dica: 'Transversal, como na TC' },
  { id: 'sagital', nome: 'Sagital', dica: 'Divide em direita e esquerda' },
  { id: 'coronal', nome: 'Coronal', dica: 'Divide em anterior e posterior' },
]

/** Texto da posição do plano, em linguagem anatômica. */
function descreverPosicao(c: Corte) {
  const cm = Math.round(c.posicao * 100)
  if (c.plano === 'axial') return `${cm} cm acima da planta dos pés`
  if (c.plano === 'sagital') {
    if (Math.abs(cm) <= 1) return 'Plano mediano'
    return `${Math.abs(cm)} cm à ${cm < 0 ? 'direita' : 'esquerda'} do plano mediano`
  }
  if (Math.abs(cm) <= 1) return 'No meio do corpo'
  return `${Math.abs(cm)} cm ${cm > 0 ? 'anterior' : 'posterior'} ao meio do corpo`
}

const lados: Record<PlanoCorte, [string, string]> = {
  axial: ['Mostrar parte inferior', 'Mostrar parte superior'],
  sagital: ['Mostrar lado direito', 'Mostrar lado esquerdo'],
  coronal: ['Mostrar metade posterior', 'Mostrar metade anterior'],
}

export function PainelCortes() {
  const corte = useAtlasStore((s) => s.corte)
  const definirCorte = useAtlasStore((s) => s.definirCorte)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)

  const escolher = (plano: PlanoCorte) => {
    const novo: Corte = { plano, posicao: LIMITES[plano].inicial, inverter: false }
    definirCorte(novo, { vista: direcaoDaVista(novo).toArray() })
  }
  const desligar = () => {
    useAtlasStore.setState({ vista: null })
    definirCorte(null)
    useAtlasStore.getState().focar()
  }

  return (
    <section aria-label="Cortes anatômicos" className="flex max-h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-borda px-4 py-3">
        <h2 className="font-semibold text-white">Cortes anatômicos</h2>
        <button
          type="button"
          onClick={() => abrirPainel(null)}
          aria-label="Fechar cortes"
          className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Plano de corte">
          {PLANOS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={corte?.plano === p.id}
              onClick={() => escolher(p.id)}
              className={`rounded-xl border px-2 py-2.5 text-center transition ${
                corte?.plano === p.id
                  ? 'border-sky-400 bg-sky-400/15 text-white'
                  : 'border-borda text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="block text-sm font-semibold">{p.nome}</span>
              <span className="mt-0.5 block text-[10px] leading-tight text-slate-400">{p.dica}</span>
            </button>
          ))}
        </div>

        {corte ? (
          <>
            <label className="mt-5 block">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Posição do plano</span>
              <input
                type="range"
                min={LIMITES[corte.plano].min}
                max={LIMITES[corte.plano].max}
                step={0.002}
                value={corte.posicao}
                onChange={(e) => definirCorte({ ...corte, posicao: Number(e.target.value) })}
                aria-valuetext={descreverPosicao(corte)}
                className="mt-3 w-full accent-sky-400"
              />
              <span className="mt-1 block text-sm text-slate-200">{descreverPosicao(corte)}</span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const novo = { ...corte, inverter: !corte.inverter }
                  definirCorte(novo, { vista: direcaoDaVista(novo).toArray() })
                }}
                className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                {lados[corte.plano][corte.inverter ? 0 : 1]}
              </button>
              <button
                type="button"
                onClick={desligar}
                className="rounded-full bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-400/20"
              >
                Remover corte
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Dica: ligue <strong className="text-slate-200">Músculos</strong>,{' '}
              <strong className="text-slate-200">Artérias</strong> e <strong className="text-slate-200">Veias</strong>{' '}
              em Camadas para ver o corte completo, como numa imagem de TC ou RM.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Escolha um plano para “fatiar” o corpo e ver as estruturas em secção.
          </p>
        )}
      </div>
    </section>
  )
}
