import { useEffect, type ReactNode } from 'react'
import { IconeFechar } from './Icones'

/** Data da build, injetada pelo Vite (vite.config.ts). */
declare const __DATA_BUILD__: string

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-sky-300 uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-300 underline-offset-2 hover:underline">
      {children}
    </a>
  )
}

/**
 * Janela "Sobre o atlas": como usar, créditos e licenças dos modelos e da voz (exigidos pela CC BY 4.0),
 * aviso sobre os textos e a versão. Folha inferior no celular, janela central no computador.
 */
export function Sobre({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      fechar()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [aberto, fechar])

  if (!aberto) return null
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center"
      onClick={fechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sobre-titulo"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-borda bg-superficie shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-borda px-5 py-3">
          <h2 id="sobre-titulo" className="font-semibold text-white">
            Sobre o atlas
          </h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <IconeFechar />
          </button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 text-sm leading-relaxed text-slate-300">
          <Secao titulo="Como usar">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Toque em qualquer parte do corpo para ver o nome e ouvi-lo (o alto-falante no topo liga e desliga a
                voz).
              </li>
              <li>Arraste para girar; use pinça (ou a roda do mouse) para aproximar.</li>
              <li>
                Para deslocar a vista: botão <strong className="text-white">Mover</strong>, dois dedos, botão direito ou
                Shift + arrastar; no teclado, as setas.
              </li>
              <li>
                <strong className="text-white">Camadas</strong> mostra músculos, vasos e nervos;{' '}
                <strong className="text-white">Cortes</strong> fatia o corpo;{' '}
                <strong className="text-white">Raio-X</strong> deixa as camadas externas translúcidas.
              </li>
              <li>♂ e ♀ trocam entre o corpo masculino e o feminino. Atalho de busca: tecla /.</li>
            </ul>
          </Secao>

          <Secao titulo="Créditos e licenças">
            <ul className="space-y-2">
              <li>
                Modelos 3D: <Link href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</Link>, © The
                Database Center for Life Science, licença{' '}
                <Link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>. Adaptados: simplificados,
                convertidos e, nos pulmões, com superfícies reconstruídas.
              </li>
              <li>
                Corpo feminino (pele, órgãos genitais e mamas):{' '}
                <Link href="https://humanatlas.io/3d-reference-library">HuBMAP Human Reference Atlas</Link>, órgãos de
                referência 3D de K. Browne e H. Schlehlein (Visible Human Female), licença{' '}
                <Link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>. Adaptados: reposicionados,
                com a pele deformada para seguir o esqueleto do atlas.
              </li>
              <li>
                Voz: <Link href="https://huggingface.co/rhasspy/piper-voices">Piper</Link>, voz pt_BR “faber”, treinada
                com dados de licença CC0.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Aviso">
            <p>
              Nomes e textos foram escritos com apoio de IA a partir de obras de referência (Moore, Gray, Netter,
              Machado) e devem ser revistos por um docente de anatomia antes do uso em sala. Peças marcadas como “Modelo
              esquemático” (vagina, cavidade do útero e outras) não vêm de um corpo real.
            </p>
          </Secao>

          <p className="text-xs text-slate-500">Versão de {__DATA_BUILD__}</p>
        </div>
      </div>
    </div>
  )
}
