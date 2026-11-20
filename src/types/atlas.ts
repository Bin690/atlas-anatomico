/**
 * Coordenadas no "espaço do corpo": metros, y para cima (pés em y = 0),
 * frente do corpo em +z e lado esquerdo do paciente em +x.
 */
export type Vec3 = [number, number, number]

/** Corpo exibido: o esqueleto e a maior parte dos órgãos são comuns; pele e sistema genital mudam. */
export type Sexo = 'masculino' | 'feminino'

/** Camada do explorador (sistema do corpo), com um .glb próprio em public/models/. */
export interface Sistema {
  id: string
  nome: string
  /** Cor do indicador na interface. */
  cor: string
  /** Caminho público do .glb da camada. */
  modelo: string
  /** Versão leve (carrega primeiro; a detalhada a substitui ao terminar de baixar). */
  modeloLeve?: string
  /** Visível ao abrir o app. */
  visivelPorPadrao: boolean
  /** Quantidade de estruturas nomeadas. */
  total: number
  /** "vidro": translúcida com bordas mais opacas (pele). */
  estilo?: 'vidro'
  /** false: não captura toques (não bloqueia o que está dentro). */
  interativo?: boolean
  /** Numa camada não interativa, estas peças ainda respondem ao toque (ex.: a vulva na pele feminina). */
  tocaveis?: string[]
  /** Na pele de vidro: peças mais sólidas (0 = vidro comum, 1 = quase opaca), ex.: mamas e vulva. */
  solidez?: Record<string, number>
  /** Fica translúcida no modo raio-X. */
  raioX?: boolean
}

/** Uma parte do corpo com nome (uma mesh no .glb da camada; o nome da mesh é o id). */
export interface Estrutura {
  /** Id FMA (Foundational Model of Anatomy), ex.: "FMA9611". */
  id: string
  /** Nome em português (Terminologia Anatômica). */
  nome: string
  /** Nome original em inglês (FMA). */
  en: string
  /** Id do sistema/camada. */
  sistema: string
  /** Estrutura-mãe (ex.: o músculo de uma cabeça muscular, a artéria de um ramo). */
  pai?: string
  /** Id da estrutura-mãe, se ela também existir no modelo. */
  paiId?: string
  /** Só existe neste corpo (ausente = comum aos dois). */
  sexo?: Sexo
  /** Modelo construído de forma esquemática (não vem de um corpo real). */
  esquematico?: boolean
}

/** Conteúdo didático escrito à mão, opcional, por id de estrutura. */
export interface Conteudo {
  descricao: string
  correlacaoClinica?: string
  /** Ficha técnica (ex.: Origem, Inserção, Inervação, Ação). */
  ficha?: Record<string, string>
}

/** Um passo de aula guiada: define o que aparece no 3D e o texto explicativo. */
export interface PassoAula {
  titulo: string
  texto: string
  /** Camadas visíveis neste passo. */
  camadas: string[]
  raioX?: boolean
  /** Se definido, só estas estruturas aparecem. */
  isolar?: string[]
  /** Estruturas destacadas em âmbar, com rótulo. */
  destaques?: string[]
  /** Estruturas que a câmera deve enquadrar. */
  foco?: string[]
  corte?: { plano: 'axial' | 'sagital' | 'coronal'; posicao: number; inverter: boolean; normal?: Vec3 } | null
  /** Direção de onde a câmera olha (opcional; ex.: [-1, 0.1, 0] = vista do lado direito do paciente). */
  vista?: [number, number, number]
  /** Ilustração de referência mostrada no passo (caminho em public/figuras/, listada em data/figuras.ts). */
  figura?: string
}

export interface Aula {
  id: string
  titulo: string
  resumo: string
  duracaoMin: number
  /** Exige assinatura PRO. */
  premium: boolean
  /** Corpo em que a aula acontece (ausente = o que estiver escolhido). */
  sexo?: Sexo
  ordem: number
  passos: PassoAula[]
}
