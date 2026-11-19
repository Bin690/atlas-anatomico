/**
 * Camadas do atlas (sistemas do corpo), regras de classificação das estruturas
 * do BodyParts3D e cores realistas por tipo de tecido.
 */

/**
 * Ordem = ordem no painel de camadas.
 * reducao/erro: fração de triângulos mantida e erro máximo (relativo) da simplificação.
 * estilo "vidro": pele translúcida; interativo false: não captura toques (não bloqueia o que está dentro).
 * raioX: fica translúcida no modo raio-X.
 * leve: gera também uma versão leve (carrega primeiro; a detalhada substitui ao terminar de baixar).
 */
export const SISTEMAS = [
  {
    id: 'pele',
    nome: 'Pele e anexos',
    cor: '#e2b49b',
    visivelPorPadrao: true,
    reducao: 0.2,
    erro: 0.001,
    estilo: 'vidro',
    interativo: false,
  },
  {
    id: 'esqueleto',
    nome: 'Esqueleto',
    cor: '#e6dcc6',
    visivelPorPadrao: true,
    reducao: 0.4,
    erro: 0.0008,
    raioX: true,
    leve: { reducao: 0.08, erro: 0.01 },
  },
  {
    id: 'articulacoes',
    nome: 'Articulações, cartilagens e ligamentos',
    cor: '#b9cfd8',
    visivelPorPadrao: true,
    reducao: 0.3,
    erro: 0.0015,
  },
  {
    id: 'musculos',
    nome: 'Músculos',
    cor: '#b5443d',
    visivelPorPadrao: false,
    reducao: 0.15,
    erro: 0.006,
    raioX: true,
    leve: { reducao: 0.05, erro: 0.02 },
  },
  {
    id: 'nervoso',
    nome: 'Sistema nervoso',
    cor: '#f2c94c',
    visivelPorPadrao: false,
    reducao: 0.25,
    erro: 0.0015,
    leve: { reducao: 0.05, erro: 0.02 },
  },
  { id: 'olhos', nome: 'Olhos e orelhas', cor: '#8fb8d8', visivelPorPadrao: false, reducao: 0.25, erro: 0.0015 },
  { id: 'coracao', nome: 'Coração', cor: '#a32f37', visivelPorPadrao: true, reducao: 0.5 },
  {
    id: 'arterias',
    nome: 'Artérias',
    cor: '#d23c3c',
    visivelPorPadrao: false,
    reducao: 0.3,
    erro: 0.0015,
    leve: { reducao: 0.05, erro: 0.02 },
  },
  {
    id: 'veias',
    nome: 'Veias',
    cor: '#3d63c4',
    visivelPorPadrao: false,
    reducao: 0.3,
    erro: 0.0015,
    leve: { reducao: 0.05, erro: 0.02 },
  },
  { id: 'pulmoes', nome: 'Pulmões', cor: '#e3a1a4', visivelPorPadrao: true, reducao: 0.45, raioX: true },
  { id: 'respiratorio', nome: 'Vias respiratórias', cor: '#d9cfc0', visivelPorPadrao: true, reducao: 0.45 },
  { id: 'digestorio', nome: 'Sistema digestório', cor: '#c98a6b', visivelPorPadrao: true, reducao: 0.3, erro: 0.0012 },
  { id: 'urinario', nome: 'Sistema urinário', cor: '#9b4a3c', visivelPorPadrao: true, reducao: 0.5 },
  { id: 'genital', nome: 'Sistema genital', cor: '#c78c86', visivelPorPadrao: true, reducao: 0.5 },
  { id: 'endocrino', nome: 'Glândulas endócrinas', cor: '#d8a24a', visivelPorPadrao: true, reducao: 0.6 },
  { id: 'linfatico', nome: 'Sistema linfático (baço e timo)', cor: '#8e4a6a', visivelPorPadrao: true, reducao: 0.5 },
]

/** Regras na ordem em que são testadas: [sistema, regex no nome, regex nos ancestrais is-a]. */
const REGRAS = [
  ['pele', /^(skin|hair of head|pubic hair|eyebrow)$/],
  [
    'coracao',
    /(atrium|ventricle of heart|^(wall|cavity) of (left|right) (atrium|ventricle)|valve|leaflet|cusp|papillary muscle|interventricular septum|interatrial septum)/,
  ],
  [
    'arterias',
    /(arter|aorta|pulmonary trunk|celiac trunk|brachiocephalic trunk|costocervical trunk|thyrocervical trunk|plantar arch|palmar arch)/,
  ],
  ['digestorio', /(hepatovenous|biliary tree|bile|hepatic duct|cystic duct)/],
  ['veias', /(vein|vena |venous|sinus|portal)/],
  ['musculos', null, /(muscle|sphincter)/],
  [
    'musculos',
    /(diaphragm|platysma|levator ani|tendon|trochlea of|levatores|interossei|lumbrical|trapezius|intertransversarii|interspinales)/,
  ],
  ['nervoso', /(interventricular foramen|interpeduncular fossa|occipital lobe)/],
  ['esqueleto', null, /bone organ/],
  ['esqueleto', /(manubrium|body of sternum|xiphoid process|sternum)/],
  [
    'respiratorio',
    /(trachea|bronch|lingular|epiglottis|arytenoid|cricoid|thyroid cartilage|corniculate|conus elasticus|vocal|larynx|hyo-epiglottic|thyro-epiglottic|segmental tree)/,
  ],
  [
    'articulacoes',
    /(intervertebral disk|cartilage|ligament|retinaculum|iliotibial tract|linea alba|tendinous ring|meniscus|aponeurosis|raphe|membrane)/,
  ],
  [
    'olhos',
    /(external ear|eyeball|lens|retina|cornea|sclera|iris|choroid|ciliary body|corona ciliaris|vitreous|chamber of|eyelid|tarsal plate|lacrimal|nasolacrimal)/,
  ],
  [
    'nervoso',
    /(nerve|ganglion|chiasm|optic tract|gyrus|lobule|brain|cerebell|thalam|hippocamp|amygdala|putamen|globus|caudate nucleus|insula|fornix|colliculus|habenula|mammillary|geniculate|commissure|corpus callosum|internal capsule|stria|tuber cinereum|lamina terminalis|medulla oblongata|pons|midbrain|peduncle|spinal cord|central canal|ventricle|aqueduct|tentorium|white matter|hypothalam|telencephalon|cingulate|precuneus|cuneus|uncus|nucleus|tract|cortex)/,
  ],
  [
    'digestorio',
    /(esophag|stomach|duoden|jejun|ileum|ileocecal|cecum|colon|appendix|mesoappendix|rectum|anal canal|liver|caudate lobe|gallbladder|pancrea|mesentery|mesocolon|omentum|tongue|tooth|gingiva|submandibular gland|sublingual gland|parotid|taenia|lip|pharyn|intestine)/,
  ],
  ['urinario', /(kidney|ureter|bladder|urethra)/],
  [
    'genital',
    /(prostate|testis|epididym|deferent|seminal|penis|corpus cavernosum|corpus spongiosum|glans|uterus|ovary|vagina)/,
  ],
  ['endocrino', /(pituitary|pineal|adrenal|suprarenal gland|thyroid gland|parathyroid)/],
  ['linfatico', /(spleen|thymus|lymph)/],
]

/** Sistema de uma estrutura (ou null). */
export function classificar(nome, ancestrais) {
  for (const [sistema, reNome, reAnc] of REGRAS) {
    if (reNome && reNome.test(nome)) return sistema
    if (reAnc && reAnc.test(ancestrais)) return sistema
  }
  return null
}

/** Cor realista por estrutura (variações dentro da camada). */
export function COR_ESTRUTURA(sistema, nome) {
  switch (sistema.id) {
    case 'nervoso':
      if (/nerve|ganglion|chiasm|optic tract/.test(nome)) return '#f2d16b'
      if (/white matter|corpus callosum|capsule|fornix|commissure|tract|stria/.test(nome)) return '#efe4d6'
      if (/putamen|globus|thalam|caudate|amygdala|hippocamp|nucleus|geniculate|colliculus/.test(nome)) return '#c9968c'
      if (/cerebell/.test(nome)) return '#c98f8b'
      if (/medulla|pons|midbrain|peduncle|spinal cord/.test(nome)) return '#dcbcad'
      return '#dba9a2'
    case 'coracao':
      if (/cavity/.test(nome)) return '#6d1a22'
      if (/valve|leaflet|cusp/.test(nome)) return '#e8d8c8'
      if (/atrium/.test(nome)) return '#94404a'
      return '#a32f37'
    case 'digestorio':
      if (/liver|hepatovenous|caudate lobe/.test(nome)) return '#8a3b2e'
      if (/gallbladder|biliary|bile|hepatic duct|cystic/.test(nome)) return '#5f8a4a'
      if (/tooth/.test(nome)) return '#f4f0e4'
      if (/tongue/.test(nome)) return '#d07272'
      if (/gingiva|lip/.test(nome)) return '#e39a9a'
      if (/pancrea/.test(nome)) return '#e0b080'
      if (/mesentery|mesocolon|mesoappendix|omentum/.test(nome)) return '#e8c99a'
      return '#d39a86'
    case 'olhos':
      if (/sclera|eyeball/.test(nome)) return '#f3efe8'
      if (/cornea|lens|vitreous|chamber/.test(nome)) return '#cfe6ef'
      if (/iris/.test(nome)) return '#5b7fa3'
      if (/retina|choroid/.test(nome)) return '#c97a6a'
      if (/lacrimal/.test(nome)) return '#e0b0a0'
      return '#d8c0b0'
    case 'articulacoes':
      if (/ligament|retinaculum|tract|linea|ring|raphe|membrane|aponeurosis/.test(nome)) return '#e2dccd'
      return '#b9cfd8'
    case 'respiratorio':
      return '#e2d8c8'
    case 'pele':
      return /hair|eyebrow/.test(nome) ? '#3b2a20' : '#e2b49b'
    case 'linfatico':
      return /spleen/.test(nome) ? '#7d2f3f' : '#d8b0a0'
    default:
      return sistema.cor
  }
}
