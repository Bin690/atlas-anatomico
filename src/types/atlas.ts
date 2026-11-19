/**
 * Coordenadas no "espaço do corpo": metros, y para cima (pés em y = 0),
 * frente do corpo em +z e lado esquerdo do paciente em +x.
 */
export type Vec3 = [number, number, number]

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
  corte?: { plano: 'axial' | 'sagital' | 'coronal'; posicao: number; inverter: boolean } | null
}

export interface Aula {
  id: string
  titulo: string
  resumo: string
  duracaoMin: number
  /** Exige assinatura PRO. */
  premium: boolean
  ordem: number
  passos: PassoAula[]
}
