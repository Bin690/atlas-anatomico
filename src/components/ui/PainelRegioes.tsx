import { useEffect, useState } from 'react'
import { useCatalogo } from '../../data'
import {
  carregarRegioes,
  GRUPOS,
  REGIOES_INFERIOR,
  REGIOES_SUPERIOR,
  REGIOES_TRONCO,
  selecionarGrupo,
  selecionarRegiao,
  type Lado,
  type Regiao,
} from '../../data/regioes'
import { useTelaPequena } from '../../hooks/useTelaPequena'
import { useAtlasStore } from '../../store/useAtlasStore'

/**
 * Seleção por regiões do corpo: isola a cabeça, o tórax, uma mão, um pé… (nas camadas ligadas) ou um
 * grupo de peças (costelas, coluna…), e enquadra a câmara.
 */
export function PainelRegioes() {
  const { estruturas } = useCatalogo()
  const camadas = useAtlasStore((s) => s.camadas)
  const regiaoAtiva = useAtlasStore((s) => s.regiaoAtiva)
  const isolarRegiao = useAtlasStore((s) => s.isolarRegiao)
  const abrirPainel = useAtlasStore((s) => s.abrirPainel)
  const telaPequena = useTelaPequena()
  const [lado, setLado] = useState<Lado>('ambos')
  const [regioes, setRegioes] = useState<Record<string, string[]> | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  useEffect(() => {
    void carregarRegioes().then(setRegioes)
  }, [])

  const aplicar = ({ ids, rotulo }: { ids: string[]; rotulo: string }) => {
    // Só conta o que está nas camadas ligadas
    const visiveis = ids.filter((id) => camadas.has(estruturas.find((e) => e.id === id)?.sistema ?? ''))
    if (!visiveis.length) {
      setAviso(`Nenhuma estrutura de “${rotulo}” nas camadas ligadas.`)
      return
    }
    setAviso(null)
    isolarRegiao(rotulo, ids)
    // No telemóvel o painel tapa o modelo: fecha para mostrar a região
    if (telaPequena) abrirPainel(null)
  }
  const regiao = (r: Regiao) => regioes && aplicar(selecionarRegiao(estruturas, regioes, r, lado))
  const grupo = (chave: string) => regioes && aplicar(selecionarGrupo(estruturas, regioes, chave))

  const botao = (chave: string, rotulo: string, onClick: () => void, compacto = false) => (
    <button
      key={chave}
      type="button"
      disabled={!regioes}
      onClick={onClick}
      className={`rounded-xl border border-borda py-2 text-slate-100 transition hover:border-sky-400/60 hover:bg-white/5 disabled:opacity-50 ${
        compacto ? 'px-1 text-[13px]' : 'px-3 text-sm'
      }`}
    >
      {rotulo}
    </button>
  )
  const titulo = (t: string) => (
    <h3 className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">{t}</h3>
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4">
      <p className="text-xs leading-relaxed text-slate-400">
        Mostra só uma parte do corpo, nas camadas ligadas.{' '}
        {regiaoAtiva && <span className="text-sky-300">A ver: {regiaoAtiva}.</span>}
      </p>
      {aviso && <p className="mt-2 text-xs text-amber-300">{aviso}</p>}

      {titulo('Cabeça e tronco')}
      <div className="grid grid-cols-3 gap-1.5">
        {REGIOES_TRONCO.map((r) => botao(r.chave, r.rotulo, () => regiao(r)))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Membros</h3>
        <div role="radiogroup" aria-label="Lado" className="flex gap-1 rounded-full bg-white/5 p-1">
          {(
            [
              ['ambos', 'Ambos'],
              ['d', 'Direito'],
              ['e', 'Esquerdo'],
            ] as [Lado, string][]
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={lado === v}
              onClick={() => setLado(v)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                lado === v ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 mb-1 text-xs text-slate-400">Membro superior</p>
      <div className="grid grid-cols-4 gap-1.5">
        {REGIOES_SUPERIOR.map((r) => botao(r.chave, r.rotulo, () => regiao(r), true))}
      </div>
      <p className="mt-2 mb-1 text-xs text-slate-400">Membro inferior</p>
      <div className="grid grid-cols-4 gap-1.5">
        {REGIOES_INFERIOR.map((r) => botao(r.chave, r.rotulo, () => regiao(r), true))}
      </div>

      {titulo('Grupos')}
      <div className="grid grid-cols-2 gap-1.5">
        {GRUPOS.map((g) => botao(g.chave, g.rotulo, () => grupo(g.chave)))}
      </div>
    </div>
  )
}
