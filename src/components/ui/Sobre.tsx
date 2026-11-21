import type { ReactNode } from 'react'
import { Janela, Secao } from './Janela'

/** Data da build, injetada pelo Vite (vite.config.ts). */
declare const __DATA_BUILD__: string

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
  return (
    <Janela aberta={aberto} fechar={fechar} titulo="Sobre o atlas">
      <Secao titulo="Como usar">
        <ul className="list-disc space-y-1 pl-5">
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
            <Link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>. Adaptados: reposicionados, com a
            pele deformada para seguir o esqueleto do atlas.
          </li>
          <li>
            Voz: <Link href="https://huggingface.co/rhasspy/piper-voices">Piper</Link>, voz pt_PT “tugão”, treinada com
            dados de licença CC0.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Sobre os modelos">
        <p>
          Os modelos 3D vêm de corpos reais digitalizados. Algumas estruturas que não existem nesses conjuntos, como a
          vagina, a cavidade do útero, os lábios e o clitóris, são representações esquemáticas e estão indicadas no
          cartão de cada uma. Conteúdo educativo: não substitui avaliação ou orientação médica.
        </p>
      </Secao>

      <p className="text-xs text-slate-500">Versão de {__DATA_BUILD__}</p>
    </Janela>
  )
}
