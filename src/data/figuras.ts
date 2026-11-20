/** Ilustrações de referência (public/figuras/), mostradas nas aulas e no cartão das estruturas. */
export interface Figura {
  src: string
  legenda: string
  /** Estruturas em cujo cartão aparece o atalho "Ver figura". */
  ids: string[]
}

export const FIGURAS: Figura[] = [
  {
    src: '/figuras/sistema-reprodutor-feminino.svg',
    legenda:
      'Sistema genital feminino em vista frontal: à esquerda, em corte (cavidade do útero, canal do colo, rugas da vagina e ovário com folículos); à direita, a vista externa.',
    ids: [
      'VHF_body_of_uterus',
      'VHF_fundus_of_uterus',
      'VHF_cervix',
      'VHF_uterine_cavity',
      'VHF_cervical_canal',
      'VHF_vagina',
      'VHF_vaginal_rugae',
      'VHF_right_ovary',
      'VHF_left_ovary',
      'VHF_ampulla_of_uterine_tube_R',
      'VHF_ampulla_of_uterine_tube_L',
    ],
  },
]

export const figuraPorSrc = (src: string | undefined) => FIGURAS.find((f) => f.src === src)
export const figuraDaEstrutura = (id: string) => FIGURAS.find((f) => f.ids.includes(id))
