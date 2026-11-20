import { useAtlasStore } from '../../store/useAtlasStore'
import type { Sexo } from '../../types/atlas'

const OPCOES: { sexo: Sexo; rotulo: string }[] = [
  { sexo: 'masculino', rotulo: 'Homem' },
  { sexo: 'feminino', rotulo: 'Mulher' },
]

/** Troca entre o corpo masculino e o feminino (pele, órgãos genitais e mamas mudam). */
export function SeletorCorpo() {
  const sexo = useAtlasStore((s) => s.sexo)
  const definirSexo = useAtlasStore((s) => s.definirSexo)

  return (
    <div
      role="radiogroup"
      aria-label="Corpo exibido"
      className="pointer-events-auto mt-2 inline-flex rounded-full border border-borda bg-superficie/80 p-0.5 backdrop-blur"
    >
      {OPCOES.map((o) => {
        const ativo = sexo === o.sexo
        return (
          <button
            key={o.sexo}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => definirSexo(o.sexo)}
            className={`min-h-9 rounded-full px-3.5 text-xs font-medium transition ${
              ativo ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
