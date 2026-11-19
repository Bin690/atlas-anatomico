import { useAtlasStore } from '../../store/useAtlasStore'
import { IconeFechar } from './Icones'

/** Selo "PRO" ao lado de recursos pagos. */
export function SeloPro({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-gradient-to-r from-amber-300 to-orange-400 px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wider text-slate-950 ${className}`}
    >
      PRO
    </span>
  )
}

const BENEFICIOS = [
  'Aulas 3D guiadas, passo a passo',
  'Quiz "Encontre a estrutura" no modelo 3D',
  'Revisão espaçada dos seus erros e painel de desempenho',
  'Cortes anatômicos e raio-X sem limites',
  'Uso offline completo',
]

/**
 * Tela de assinatura. PROTÓTIPO: o botão libera o PRO só neste aparelho, para demonstração.
 * Em produção, a liberação viria do servidor após login e pagamento, e o conteúdo pago seria
 * entregue pelo servidor (não basta esconder na interface).
 */
export function TelaPro() {
  const recurso = useAtlasStore((s) => s.paywall)
  const fechar = useAtlasStore((s) => s.fecharPaywall)
  const definirPremium = useAtlasStore((s) => s.definirPremium)
  if (!recurso) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-pro"
      className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={fechar}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-amber-300/30 bg-superficie p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <IconeFechar />
        </button>
        <SeloPro />
        <h2 id="titulo-pro" className="mt-3 text-xl font-bold text-white">
          Atlas 3D PRO
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          <strong className="text-white">{recurso}</strong> faz parte do plano PRO.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-amber-300" aria-hidden>
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => definirPremium(true)}
          className="mt-6 min-h-11 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 font-semibold text-slate-950 transition hover:brightness-110"
        >
          Liberar demonstração
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Protótipo: libera o PRO só neste aparelho. A assinatura real exigirá login e pagamento.
        </p>
      </div>
    </div>
  )
}
