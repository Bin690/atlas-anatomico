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
            onClick={() => definirSexo(o.sexo)}
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
