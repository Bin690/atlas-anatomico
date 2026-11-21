import { catalogoDoCorpo } from '../../data'
import { useAtlasStore } from '../../store/useAtlasStore'
import type { Sexo } from '../../types/atlas'

const OPCOES: { sexo: Sexo; rotulo: string; simbolo: string }[] = [
  // ︎ força o símbolo de texto (sem ele, o iOS pode desenhar um emoji colorido)
  { sexo: 'masculino', rotulo: 'Homem', simbolo: '♂︎' },
  { sexo: 'feminino', rotulo: 'Mulher', simbolo: '♀︎' },
]

/** Troca entre o corpo masculino e o feminino (pele, órgãos genitais e mamas mudam). */
export function SeletorCorpo() {
  const sexo = useAtlasStore((s) => s.sexo)
  const definirSexo = useAtlasStore((s) => s.definirSexo)

  /** Troca de corpo e liga as camadas padrão que só existem no novo corpo (ex.: Mamas no feminino). */
  const trocar = (novo: Sexo) => {
    if (novo === sexo) return
    const antes = new Set(catalogoDoCorpo(sexo)?.sistemas.map((s) => s.id))
    definirSexo(novo)
    const novas = (catalogoDoCorpo(novo)?.sistemas ?? []).filter((s) => s.visivelPorPadrao && !antes.has(s.id))
    if (novas.length) {
      const { camadas, definirCamadas } = useAtlasStore.getState()
      definirCamadas([...camadas, ...novas.map((s) => s.id)])
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Corpo exibido"
      className="pointer-events-auto inline-flex rounded-full border border-borda bg-superficie/80 p-0.5 backdrop-blur"
    >
      {OPCOES.map((o) => {
        const ativo = sexo === o.sexo
        return (
          <button
            key={o.sexo}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={o.rotulo}
            title={o.rotulo}
            onClick={() => trocar(o.sexo)}
            className={`grid size-9 place-items-center rounded-full text-lg leading-none font-semibold transition ${
              ativo ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span aria-hidden>{o.simbolo}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Símbolo ♂/♀ do corpo (ex.: à frente do título de uma aula de um corpo só). */
export function SimboloSexo({ sexo, className = '' }: { sexo: Sexo; className?: string }) {
  const o = OPCOES.find((x) => x.sexo === sexo)!
  return (
    <span
      role="img"
      aria-label={`Corpo ${sexo}`}
      title={`Corpo ${sexo}`}
      className={`${sexo === 'feminino' ? 'text-pink-300' : 'text-sky-300'} ${className}`}
    >
      {o.simbolo}
    </span>
  )
}

/** Botões ♂/♀ para escolher a versão de uma aula (o da aula aberta fica marcado). */
export function BotoesVersao({
  sexos,
  atual,
  escolher,
}: {
  sexos: Sexo[]
  atual?: Sexo
  escolher: (sexo: Sexo) => void
}) {
  return (
    <span role="group" aria-label="Escolha o corpo" className="inline-flex gap-1">
      {OPCOES.filter((o) => sexos.includes(o.sexo)).map((o) => {
        const ativo = atual === o.sexo
        return (
          <button
            key={o.sexo}
            type="button"
            onClick={() => escolher(o.sexo)}
            aria-label={`${o.rotulo === 'Homem' ? 'Masculino' : 'Feminino'}${ativo ? ' (aberta)' : ''}`}
            aria-pressed={ativo}
            title={o.rotulo === 'Homem' ? 'Masculino' : 'Feminino'}
            className={`grid size-9 place-items-center rounded-full border text-base leading-none font-semibold transition ${
              ativo
                ? 'border-sky-400 bg-sky-400 text-slate-950'
                : `border-borda bg-white/5 hover:bg-white/10 ${o.sexo === 'feminino' ? 'text-pink-300' : 'text-sky-300'}`
            }`}
          >
            <span aria-hidden>{o.simbolo}</span>
          </button>
        )
      })}
    </span>
  )
}
