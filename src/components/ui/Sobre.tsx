import type { ReactNode } from 'react'
import { Janela, Secao } from './Janela'

/** Data da build, injetada pelo Vite (vite.config.ts). */
declare const __DATA_BUILD__: string

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-slate-300">
      {children}
    </a>
  )
}

/**
 * Janela "Sobre o atlas": como usar, créditos e licenças dos modelos e da voz (exigidos pela CC BY 4.0),
 * aviso sobre os textos e a versão. Folha inferior no celular, janela central no computador.
 */
export function Sobre({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  return (
    <Janela aberta={aberto} fechar={fechar} titulo="Sobre o atlas">
      <div className="flex items-center gap-3">
        <img src="/icone.svg" alt="" className="size-16 shrink-0" />
        <div>
          <p className="text-base font-semibold text-white">Nitu</p>
          <p className="text-xs text-slate-400">Atlas anatómico</p>
        </div>
      </div>
      <Secao titulo="Como usar">
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
          <li>
            Toque em qualquer parte do corpo para ver o nome e ouvi-lo (o altifalante no topo liga e desliga a voz).
          </li>
          <li>Arraste para rodar; use pinça (ou a roda do rato) para aproximar.</li>
          <li>
            Para deslocar a vista: botão <strong className="text-white">Mover</strong>, dois dedos, botão direito ou
            Shift + arrastar; no teclado, as setas.
          </li>
          <li>
            <strong className="text-white">Camadas</strong> mostra músculos, vasos e nervos;{' '}
            <strong className="text-white">Cortes</strong> fatia o corpo; <strong className="text-white">Raio-X</strong>{' '}
            deixa as camadas externas translúcidas.
          </li>
          <li>♂ e ♀ trocam entre o corpo masculino e o feminino. Atalho da pesquisa: tecla /.</li>
        </ul>
      </Secao>

      <div className="space-y-1 text-[11px] leading-snug text-slate-500">
        <p>
          <Link href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</Link> &{' '}
          <Link href="https://humanatlas.io/3d-reference-library">HuBMAP Human Reference Atlas</Link>
        </p>
        <p>© The Database Center for Life Science, K. Browne e H. Schlehlein, CC BY 4.0 (adaptados).</p>
        <p>.</p>
        <p>Versão de {__DATA_BUILD__}</p>
      </div>
    </Janela>
  )
}
