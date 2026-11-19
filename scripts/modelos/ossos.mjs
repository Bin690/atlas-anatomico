/**
 * Tradução dos ossos do BodyParts3D (nomes FMA em inglês) para a Terminologia Anatômica
 * em português, com descrição e correlação clínica por tipo de osso.
 */

const ORDINAL_EN = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
]
const num = (palavra) => ORDINAL_EN.indexOf(palavra) + 1

/** Cores por região (hotspot/destaque). */
export const REGIOES = {
  cranio: { nome: 'Crânio', cor: '#f59e0b' },
  coluna: { nome: 'Coluna vertebral', cor: '#a78bfa' },
  torax: { nome: 'Tórax', cor: '#f472b6' },
  superior: { nome: 'Membro superior', cor: '#38bdf8' },
  inferior: { nome: 'Membro inferior', cor: '#34d399' },
}

const lado = (en, masc = true) => {
  if (/\bright\b/.test(en)) return masc ? ' direito' : ' direita'
  if (/\bleft\b/.test(en)) return masc ? ' esquerdo' : ' esquerda'
  return ''
}

// ---------- Crânio e hioide ----------
const CRANIO = {
  'frontal bone': [
    'Osso frontal',
    'Forma a fronte, o teto das órbitas e parte da fossa anterior do crânio; contém os seios frontais.',
    'Fraturas da parede posterior do seio frontal podem causar fístula liquórica; traumas na região podem associar-se a contusão do lobo frontal.',
  ],
  'parietal bone': [
    'Osso parietal',
    'Osso par que forma a maior parte do teto e das paredes laterais do crânio, unido pelas suturas sagital, coronal e lambdóidea.',
    'Na região do ptério (junção de frontal, parietal, temporal e esfenoide) passa a artéria meníngea média; fraturas aí podem causar hematoma extradural.',
  ],
  'temporal bone': [
    'Osso temporal',
    'Forma parte da parede lateral e da base do crânio, aloja as orelhas média e interna e articula-se com a mandíbula (ATM).',
    'Fraturas da parte petrosa podem causar otorragia, otoliquorreia, paralisia facial e perda auditiva; equimose retroauricular (sinal de Battle) sugere fratura da base do crânio.',
  ],
  'occipital bone': [
    'Osso occipital',
    'Forma a parte posterior e a base do crânio; contém o forame magno, por onde passa a transição entre bulbo e medula espinal.',
    'Na malformação de Chiari, as tonsilas do cerebelo herniam pelo forame magno, podendo causar cefaleia occipital e siringomielia.',
  ],
  'sphenoid bone': [
    'Osso esfenoide',
    'Osso ímpar, em forma de borboleta, no centro da base do crânio; aloja a hipófise na sela turca e contém forames para vários nervos cranianos.',
    'Tumores da hipófise podem expandir a sela turca e comprimir o quiasma óptico (hemianopsia bitemporal); a via transesfenoidal é o acesso cirúrgico clássico.',
  ],
  ethmoid: [
    'Osso etmoide',
    'Osso ímpar entre as órbitas; sua lâmina cribriforme dá passagem aos filamentos do nervo olfatório e forma o teto da cavidade nasal.',
    'Fraturas da lâmina cribriforme podem causar rinoliquorreia e anosmia.',
  ],
  vomer: [
    'Vômer',
    'Lâmina óssea ímpar que forma a parte posteroinferior do septo nasal.',
    'Desvios do septo nasal podem causar obstrução nasal, ronco e sinusites de repetição.',
  ],
  'nasal bone': [
    'Osso nasal',
    'Pequeno osso par que forma o dorso do nariz.',
    'É o osso da face fraturado com mais frequência; deve-se descartar hematoma de septo após o trauma.',
  ],
  'lacrimal bone': [
    'Osso lacrimal',
    'Menor osso da face, na parede medial da órbita; contém a fossa do saco lacrimal.',
    'Na obstrução das vias lacrimais, a dacriocistorrinostomia cria uma comunicação através do osso lacrimal.',
  ],
  'inferior nasal concha': [
    'Concha nasal inferior',
    'Lâmina óssea curva na parede lateral da cavidade nasal, que aumenta a superfície da mucosa para aquecer e umidificar o ar.',
    'A hipertrofia das conchas nasais é causa comum de obstrução nasal na rinite alérgica.',
    true,
  ],
  'palatine bone': [
    'Osso palatino',
    'Osso em forma de L que forma a parte posterior do palato duro e parte da parede lateral da cavidade nasal.',
    'Falhas na fusão dos processos palatinos durante o desenvolvimento resultam em fenda palatina.',
  ],
  maxilla: [
    'Maxila',
    'Forma a arcada dentária superior, parte da órbita, da cavidade nasal e do palato duro; contém o seio maxilar.',
    'As fraturas de Le Fort classificam os traumas do terço médio da face; infecções de dentes superiores podem causar sinusite maxilar.',
    true,
  ],
  'zygomatic bone': [
    'Osso zigomático',
    'Forma a proeminência da bochecha e parte das paredes lateral e inferior da órbita.',
    'Fraturas do complexo zigomático podem causar afundamento malar, diplopia e parestesia na região do nervo infraorbital.',
  ],
  mandible: [
    'Mandíbula',
    'Único osso móvel do crânio; aloja os dentes inferiores e articula-se com o temporal na articulação temporomandibular.',
    'Por ter forma de anel, a mandíbula frequentemente fratura em dois pontos; na luxação da ATM o paciente não consegue fechar a boca.',
    true,
  ],
  'hyoid bone': [
    'Osso hioide',
    'Osso em U no pescoço que não se articula com outros ossos; ancora músculos da língua, do assoalho da boca e da laringe.',
    'Em medicina legal, a fratura do hioide sugere estrangulamento.',
  ],
}

// ---------- Coluna ----------
function vertebra(en) {
  if (en === 'atlas')
    return [
      'Atlas (C1)',
      'Primeira vértebra cervical: não tem corpo nem processo espinhoso; sustenta o crânio e permite o movimento de flexão e extensão da cabeça ("sim").',
      'A fratura de Jefferson (explosão do anel do atlas) ocorre por compressão axial, como em mergulhos em águas rasas.',
    ]
  if (en === 'axis')
    return [
      'Áxis (C2)',
      'Segunda vértebra cervical; seu dente funciona como pivô para a rotação da cabeça ("não").',
      'Fraturas do dente do áxis e a "fratura do enforcado" (espondilolistese traumática de C2) podem lesar a medula cervical alta.',
    ]
  const m = en.match(/^(\w+) (cervical|thoracic|lumbar) vertebra$/)
  if (!m) return null
  const n = num(m[1])
  if (m[2] === 'cervical') {
    if (n === 7)
      return [
        'Vértebra proeminente (C7)',
        'Sétima vértebra cervical, com processo espinhoso longo, facilmente palpável na base do pescoço; serve de referência para contar as vértebras.',
        'Hérnias de disco cervicais baixas comprimem raízes do plexo braquial, causando dor e parestesia no membro superior.',
      ]
    return [
      `Vértebra cervical C${n}`,
      'Vértebra cervical típica: corpo pequeno, processo espinhoso bífido e forames transversários por onde passa a artéria vertebral.',
      'A espondilose cervical pode estreitar o canal vertebral e causar mielopatia; hérnias de disco comprimem raízes nervosas do membro superior.',
    ]
  }
  if (m[2] === 'thoracic')
    return [
      `Vértebra torácica T${n}`,
      'Vértebra torácica: tem fóveas costais para articulação com as costelas e processo espinhoso longo, inclinado para baixo.',
      'Fraturas por compressão osteoporótica são comuns na coluna torácica baixa e podem levar à hipercifose.',
    ]
  return [
    `Vértebra lombar L${n}`,
    'Vértebra lombar: corpo grande e robusto, adaptado para suportar o peso do tronco.',
    'Hérnias de disco lombares (sobretudo L4-L5 e L5-S1) são causa frequente de lombociatalgia; a punção lombar é feita abaixo do fim da medula, entre L3-L4 ou L4-L5.',
  ]
}

// ---------- Tórax ----------
function costela(en) {
  const m = en.match(/^(right|left) (\w+) rib$/)
  if (!m) return null
  const n = num(m[2])
  const nome = `${n}ª costela${lado(en, false)}`
  if (n === 1)
    return [
      nome,
      'Primeira costela: a mais curta, larga e curva; a artéria e a veia subclávias e o plexo braquial passam sobre ela.',
      'Alterações da 1ª costela ou uma costela cervical podem comprimir o feixe neurovascular (síndrome do desfiladeiro torácico).',
    ]
  if (n <= 7)
    return [
      nome,
      'Costela verdadeira: articula-se diretamente com o esterno por sua própria cartilagem costal.',
      'Fraturas de costelas são as lesões torácicas mais comuns; fragmentos podem perfurar a pleura e causar pneumotórax ou hemotórax.',
    ]
  if (n <= 10)
    return [
      nome,
      'Costela falsa: sua cartilagem une-se à da costela de cima, formando o arco costal.',
      'Fraturas das costelas inferiores podem lesar o fígado (à direita) ou o baço (à esquerda).',
    ]
  return [
    nome,
    'Costela flutuante: não se articula anteriormente, terminando livre na parede abdominal.',
    'Fraturas das costelas flutuantes podem associar-se a lesão renal; investigar hematúria.',
  ]
}

// ---------- Membros ----------
const DEDOS_MAO = {
  thumb: 'polegar',
  'index finger': 'dedo indicador',
  'middle finger': 'dedo médio',
  'ring finger': 'dedo anular',
  'little finger': 'dedo mínimo',
}
const DEDOS_PE = {
  'big toe': 'hálux',
  'second toe': '2º dedo do pé',
  'third toe': '3º dedo do pé',
  'fourth toe': '4º dedo do pé',
  'little toe': 'dedo mínimo do pé',
}
const FALANGE = { proximal: 'proximal', middle: 'média', distal: 'distal' }

function falange(en) {
  const m = en.match(/^(proximal|middle|distal) phalanx of (right|left) (.+)$/)
  if (!m) return null
  const [, tipo, ladoEn, dedo] = m
  const naMao = dedo in DEDOS_MAO
  const nomeDedo = naMao ? DEDOS_MAO[dedo] : DEDOS_PE[dedo]
  const sufixo = ladoEn === 'right' ? ' direito' : ' esquerdo'
  const nome = `Falange ${FALANGE[tipo]} do ${nomeDedo}${sufixo}`
  const regiao = naMao ? 'superior' : 'inferior'
  const desc = naMao
    ? `Falange ${FALANGE[tipo]}: um dos ossos curtos e longos do esqueleto dos dedos da mão.`
    : `Falange ${FALANGE[tipo]}: um dos ossos do esqueleto dos dedos do pé.`
  let clin
  if (naMao && tipo === 'distal')
    clin =
      'O dedo em martelo (avulsão do tendão extensor na base da falange distal) impede a extensão ativa da ponta do dedo.'
  else if (naMao)
    clin =
      'Fraturas das falanges são frequentes em traumas da mão; desvios rotacionais devem ser corrigidos para evitar sobreposição dos dedos.'
  else if (dedo === 'big toe')
    clin =
      'O hálux suporta grande parte do impulso da marcha; a gota acomete classicamente a 1ª articulação metatarsofalângica (podagra).'
  else
    clin =
      'Fraturas das falanges do pé, geralmente por trauma direto ("topada"), costumam ter tratamento conservador com imobilização.'
  return { nome, desc, clin, regiao }
}

const ORD_PT = ['', '1º', '2º', '3º', '4º', '5º']

function metacarpoMetatarso(en) {
  const m = en.match(/^(right|left) (\w+) (metacarpal|metatarsal) bone$/)
  if (!m) return null
  const n = num(m[2])
  const mao = m[3] === 'metacarpal'
  const nome = `${ORD_PT[n]} osso ${mao ? 'metacarpal' : 'metatarsal'}${lado(en)}`
  if (mao) {
    const clin =
      n === 5
        ? 'A fratura do colo do 5º metacarpal ("fratura do boxeador") ocorre ao socar uma superfície rígida.'
        : n === 1
          ? 'A fratura de Bennett (base do 1º metacarpal, intra-articular) é instável e costuma exigir fixação cirúrgica.'
          : 'Fraturas dos metacarpais podem causar desvio rotacional dos dedos, que deve ser avaliado com a mão fechada.'
    return {
      nome,
      desc: 'Osso longo da palma da mão, entre o carpo e a falange proximal do dedo correspondente.',
      clin,
      regiao: 'superior',
    }
  }
  const clin =
    n === 5
      ? 'A fratura de Jones (junção metáfise-diáfise da base do 5º metatarsal) tem alto risco de não consolidação.'
      : n === 1
        ? 'No hálux valgo, o 1º metatarsal desvia-se medialmente e forma o "joanete".'
        : 'Fraturas por estresse ("fratura de marcha") são comuns nos metatarsais centrais, sobretudo no 2º, em militares e corredores.'
  return {
    nome,
    desc: 'Osso longo do pé, entre o tarso e a falange proximal do dedo correspondente.',
    clin,
    regiao: 'inferior',
  }
}

// [nome PT, feminino?, região, descrição, correlação]
const MEMBROS = {
  clavicle: [
    'Clavícula',
    true,
    'superior',
    'Osso em forma de S que une o membro superior ao tronco, articulando-se com o esterno e com o acrômio da escápula.',
    'É um dos ossos mais fraturados, geralmente no terço médio, por queda sobre o ombro ou sobre a mão estendida.',
  ],
  scapula: [
    'Escápula',
    true,
    'superior',
    'Osso plano e triangular na parte posterior do tórax; sua cavidade glenoidal articula-se com o úmero.',
    'A escápula alada ocorre por lesão do nervo torácico longo, que paralisa o músculo serrátil anterior.',
  ],
  humerus: [
    'Úmero',
    false,
    'superior',
    'Osso do braço; articula-se com a escápula no ombro e com o rádio e a ulna no cotovelo.',
    'Fraturas da diáfise podem lesar o nervo radial (mão caída); fraturas do colo cirúrgico podem lesar o nervo axilar.',
  ],
  radius: [
    'Rádio',
    false,
    'superior',
    'Osso lateral do antebraço (lado do polegar); gira em torno da ulna nos movimentos de pronação e supinação.',
    'A fratura de Colles (extremidade distal do rádio, desvio dorsal) ocorre por queda com a mão estendida, comum em idosos com osteoporose.',
  ],
  ulna: [
    'Ulna',
    true,
    'superior',
    'Osso medial do antebraço; seu olécrano forma a ponta do cotovelo.',
    'A fratura de Monteggia associa fratura da ulna proximal à luxação da cabeça do rádio.',
  ],
  scaphoid: [
    'Escafoide',
    false,
    'superior',
    'Maior osso da fileira proximal do carpo, no assoalho da tabaqueira anatômica.',
    'Fratura mais comum do carpo; pela irrigação retrógrada, pode evoluir para necrose avascular. Dor na tabaqueira anatômica é sinal clássico.',
  ],
  lunate: [
    'Semilunar',
    false,
    'superior',
    'Osso central da fileira proximal do carpo, articulado com o rádio.',
    'É o osso do carpo mais frequentemente luxado; a doença de Kienböck é a sua necrose avascular.',
  ],
  triquetral: [
    'Piramidal',
    false,
    'superior',
    'Osso da fileira proximal do carpo, medial ao semilunar.',
    'Fraturas da face dorsal do piramidal são a segunda fratura mais comum do carpo.',
  ],
  pisiform: [
    'Pisiforme',
    false,
    'superior',
    'Pequeno osso sesamoide no tendão do músculo flexor ulnar do carpo, palpável na base da eminência hipotenar.',
    'Forma um limite do canal de Guyon, onde o nervo ulnar pode ser comprimido.',
  ],
  trapezium: [
    'Trapézio',
    false,
    'superior',
    'Osso lateral da fileira distal do carpo; articula-se com o 1º metacarpal na articulação em sela do polegar.',
    'A rizartrose (artrose trapeziometacarpal) é causa comum de dor na base do polegar em mulheres após os 50 anos.',
  ],
  trapezoid: [
    'Trapezoide',
    false,
    'superior',
    'Menor osso da fileira distal do carpo, articulado com o 2º metacarpal.',
    'Fraturas isoladas são raras e decorrem de trauma axial sobre o dedo indicador.',
  ],
  capitate: [
    'Capitato',
    false,
    'superior',
    'Maior osso do carpo, no centro da fileira distal.',
    'Participa das luxações perissemilunares, lesões graves e frequentemente não diagnosticadas na radiografia inicial.',
  ],
  hamate: [
    'Hamato',
    false,
    'superior',
    'Osso medial da fileira distal do carpo, com um processo em gancho (hâmulo).',
    'A fratura do hâmulo do hamato ocorre em esportes com taco ou raquete e pode irritar o nervo ulnar.',
  ],
  'hip bone': [
    'Osso do quadril',
    false,
    'inferior',
    'Formado pela fusão de ílio, ísquio e púbis; seu acetábulo articula-se com a cabeça do fêmur.',
    'Fraturas da pelve podem causar hemorragia grave; a crista ilíaca é local de biópsia e aspirado de medula óssea.',
  ],
  femur: [
    'Fêmur',
    false,
    'inferior',
    'Maior e mais resistente osso do corpo; articula-se com o osso do quadril e, no joelho, com a tíbia e a patela.',
    'Fraturas do colo do fêmur em idosos podem comprometer a irrigação da cabeça femoral e levar à necrose avascular.',
  ],
  patella: [
    'Patela',
    true,
    'inferior',
    'Maior osso sesamoide do corpo, no tendão do quadríceps femoral; protege o joelho e aumenta a alavanca do quadríceps.',
    'A luxação lateral da patela é comum em adolescentes; o reflexo patelar avalia os segmentos L3-L4.',
  ],
  tibia: [
    'Tíbia',
    true,
    'inferior',
    'Osso medial e principal da perna, que suporta o peso do corpo; sua face medial é subcutânea.',
    'Por ser subcutânea, tem alta taxa de fraturas expostas; a síndrome compartimental é complicação temida.',
  ],
  fibula: [
    'Fíbula',
    true,
    'inferior',
    'Osso lateral e fino da perna; suporta pouco peso, mas forma o maléolo lateral do tornozelo.',
    'O nervo fibular comum contorna o colo da fíbula e pode ser lesado em fraturas ou por compressão (pé caído).',
  ],
  talus: [
    'Tálus',
    false,
    'inferior',
    'Transmite o peso da tíbia para o pé; não tem inserções musculares.',
    'Fraturas do colo do tálus têm alto risco de necrose avascular.',
  ],
  calcaneus: [
    'Calcâneo',
    false,
    'inferior',
    'Maior osso do pé; forma o calcanhar e recebe o tendão do calcâneo (de Aquiles).',
    'Fraturas por queda de altura costumam ser bilaterais e associar-se a fraturas da coluna lombar.',
  ],
  'cuboid bone': [
    'Cuboide',
    false,
    'inferior',
    'Osso lateral do tarso, articulado com o calcâneo e com o 4º e o 5º metatarsais.',
    'Pode fraturar por compressão ("fratura em quebra-nozes") em traumas de abdução do antepé.',
  ],
  'medial cuneiform bone': [
    'Cuneiforme medial',
    false,
    'inferior',
    'Maior dos três cuneiformes; articula-se com o navicular e com o 1º metatarsal.',
    'Faz parte da articulação tarsometatarsal (de Lisfranc), cujas lesões são frequentemente subdiagnosticadas.',
  ],
  'intermediate cuneiform bone': [
    'Cuneiforme intermédio',
    false,
    'inferior',
    'Menor dos três cuneiformes; articula-se com o 2º metatarsal, formando a "pedra angular" do arco transverso.',
    'O encaixe do 2º metatarsal entre os cuneiformes estabiliza a articulação de Lisfranc; sua lesão causa instabilidade do mediopé.',
  ],
  'lateral cuneiform bone': [
    'Cuneiforme lateral',
    false,
    'inferior',
    'Cuneiforme articulado com o cuboide, o navicular e o 3º metatarsal.',
    'Lesões do mediopé por trauma de alta energia podem envolvê-lo e exigem tomografia para diagnóstico.',
  ],
}

const NAVICULAR = [
  'Navicular',
  'Osso medial do tarso, entre o tálus e os cuneiformes; sustenta o arco longitudinal medial.',
  'Fraturas por estresse do navicular ocorrem em atletas de salto e corrida e têm consolidação difícil.',
]

const ESTERNO = [
  'Esterno',
  'Osso plano na linha média anterior do tórax, formado por manúbrio, corpo e processo xifoide; articula-se com as clavículas e as cartilagens costais.',
  'As compressões da RCP são feitas sobre a metade inferior do esterno; a esternotomia mediana é o acesso padrão da cirurgia cardíaca.',
]

const SACRO = [
  'Sacro',
  'Osso formado pela fusão de cinco vértebras sacrais; articula-se com os ossos do quadril nas articulações sacroilíacas.',
  'A sacroileíte é achado característico das espondiloartrites, como a espondilite anquilosante.',
]

/** Converte um nome FMA em inglês na entrada do atlas (ou null se não for reconhecido). */
export function traduzirOsso(en) {
  const semLado = en.replace(/^(right|left) /, '')

  if (en === 'sternum')
    return { nome: ESTERNO[0], descricao: ESTERNO[1], correlacaoClinica: ESTERNO[2], regiao: 'torax' }
  if (en === 'sacrum') return { nome: SACRO[0], descricao: SACRO[1], correlacaoClinica: SACRO[2], regiao: 'coluna' }

  const cr = CRANIO[semLado]
  if (cr) {
    const [nome, desc, clin, fem] = cr
    return { nome: nome + lado(en, !fem), descricao: desc, correlacaoClinica: clin, regiao: 'cranio' }
  }

  const v = vertebra(en)
  if (v) return { nome: v[0], descricao: v[1], correlacaoClinica: v[2], regiao: 'coluna' }

  const c = costela(en)
  if (c) return { nome: c[0], descricao: c[1], correlacaoClinica: c[2], regiao: 'torax' }

  const f = falange(en)
  if (f) return { nome: f.nome, descricao: f.desc, correlacaoClinica: f.clin, regiao: f.regiao }

  const mm = metacarpoMetatarso(en)
  if (mm) return { nome: mm.nome, descricao: mm.desc, correlacaoClinica: mm.clin, regiao: mm.regiao }

  const nav = en.match(/^navicular bone of (right|left) foot$/)
  if (nav)
    return {
      nome: NAVICULAR[0] + (nav[1] === 'right' ? ' direito' : ' esquerdo'),
      descricao: NAVICULAR[1],
      correlacaoClinica: NAVICULAR[2],
      regiao: 'inferior',
    }

  const mb = MEMBROS[semLado]
  if (mb) {
    const [nome, fem, regiao, desc, clin] = mb
    return { nome: nome + lado(en, !fem), descricao: desc, correlacaoClinica: clin, regiao }
  }
  return null
}
