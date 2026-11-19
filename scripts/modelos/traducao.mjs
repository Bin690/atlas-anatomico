/**
 * Tradução dos nomes FMA (inglês) do BodyParts3D para o português, seguindo a
 * Terminologia Anatômica: substantivo primeiro, adjetivos na ordem inversa do inglês,
 * concordância de gênero/número e complementos com "do/da/dos/das".
 *
 *   "Left posterior inferior cerebellar artery" -> "Artéria cerebelar inferior posterior esquerda"
 *   "Long head of left biceps brachii"          -> "Cabeça longa do músculo bíceps braquial esquerdo"
 */
import { traduzirOsso } from './ossos.mjs'

// ---------------------------------------------------------------------------
// Substantivos: palavra -> [português, gênero, plural?]
// ---------------------------------------------------------------------------
const S = {
  aorta: ['aorta', 'f'],
  aqueduct: ['aqueduto', 'm'],
  arch: ['arco', 'm'],
  arteria: ['artéria', 'f'],
  arteries: ['artérias', 'f', 1],
  artery: ['artéria', 'f'],
  atrium: ['átrio', 'm'],
  body: ['corpo', 'm'],
  bone: ['osso', 'm'],
  brachium: ['braço', 'm'],
  branch: ['ramo', 'm'],
  branches: ['ramos', 'm', 1],
  bronchus: ['brônquio', 'm'],
  canal: ['canal', 'm'],
  canaliculus: ['canalículo', 'm'],
  capsule: ['cápsula', 'f'],
  cartilage: ['cartilagem', 'f'],
  cavity: ['cavidade', 'f'],
  cerebellum: ['cerebelo', 'm'],
  chamber: ['câmara', 'f'],
  chiasm: ['quiasma', 'm'],
  choroid: ['corioide', 'f'],
  colliculus: ['colículo', 'm'],
  colon: ['colo', 'm'],
  commissure: ['comissura', 'f'],
  concha: ['concha', 'f'],
  conus: ['cone', 'm'],
  cord: ['cordão', 'm'],
  cornea: ['córnea', 'f'],
  corona: ['coroa', 'f'],
  corpus: ['corpo', 'm'],
  cusp: ['válvula', 'f'],
  diaphragm: ['diafragma', 'm'],
  disk: ['disco', 'm'],
  division: ['divisão', 'f'],
  duct: ['ducto', 'm'],
  duodenum: ['duodeno', 'm'],
  ear: ['orelha', 'f'],
  epididymis: ['epidídimo', 'm'],
  epiglottis: ['epiglote', 'f'],
  esophagus: ['esôfago', 'm'],
  eyeball: ['bulbo do olho', 'm'],
  eyebrow: ['supercílio', 'm'],
  eyelid: ['pálpebra', 'f'],
  finger: ['dedo', 'm'],
  foot: ['pé', 'm'],
  foramen: ['forame', 'm'],
  forearm: ['antebraço', 'm'],
  forebrain: ['prosencéfalo', 'm'],
  fornix: ['fórnice', 'm'],
  fossa: ['fossa', 'f'],
  gallbladder: ['vesícula biliar', 'f'],
  ganglion: ['gânglio', 'm'],
  gingiva: ['gengiva', 'f'],
  gland: ['glândula', 'f'],
  glans: ['glande', 'f'],
  globus: ['globo', 'm'],
  gyrus: ['giro', 'm'],
  habenula: ['habênula', 'f'],
  hair: ['pelo', 'm'],
  hand: ['mão', 'f'],
  head: ['cabeça', 'f'],
  hemisphere: ['hemisfério', 'm'],
  hippocampus: ['hipocampo', 'm'],
  hypothalamus: ['hipotálamo', 'm'],
  ileum: ['íleo', 'm'],
  insula: ['ínsula', 'f'],
  intestine: ['intestino', 'm'],
  iris: ['íris', 'f'],
  jejunum: ['jejuno', 'm'],
  junction: ['junção', 'f'],
  kidney: ['rim', 'm'],
  lake: ['lago', 'm'],
  lamina: ['lâmina', 'f'],
  leaflet: ['cúspide', 'f'],
  leg: ['perna', 'f'],
  lens: ['lente', 'f'],
  ligament: ['ligamento', 'm'],
  limb: ['ramo', 'm'],
  linea: ['linha', 'f'],
  lip: ['lábio', 'm'],
  liver: ['fígado', 'm'],
  lobe: ['lobo', 'm'],
  lobule: ['lóbulo', 'm'],
  manubrium: ['manúbrio', 'm'],
  membrane: ['membrana', 'f'],
  mesentery: ['mesentério', 'm'],
  mesoappendix: ['mesoapêndice', 'm'],
  mesocolon: ['mesocolo', 'm'],
  midbrain: ['mesencéfalo', 'm'],
  muscle: ['músculo', 'm'],
  nerve: ['nervo', 'm'],
  network: ['rede', 'f'],
  nucleus: ['núcleo', 'm'],
  pancreas: ['pâncreas', 'm'],
  parenchyma: ['parênquima', 'm'],
  part: ['parte', 'f'],
  peduncle: ['pedúnculo', 'm'],
  penis: ['pênis', 'm'],
  plate: ['placa', 'f'],
  plexus: ['plexo', 'm'],
  pons: ['ponte', 'f'],
  process: ['processo', 'm'],
  prostate: ['próstata', 'f'],
  putamen: ['putame', 'm'],
  raphe: ['rafe', 'f'],
  rectum: ['reto', 'm'],
  retina: ['retina', 'f'],
  retinaculum: ['retináculo', 'm'],
  ring: ['anel', 'm'],
  sac: ['saco', 'm'],
  sclera: ['esclera', 'f'],
  segment: ['segmento', 'm'],
  septum: ['septo', 'm'],
  set: ['conjunto', 'm'],
  sinus: ['seio', 'm'],
  skin: ['pele', 'f'],
  sphincter: ['esfíncter', 'm'],
  spleen: ['baço', 'm'],
  stomach: ['estômago', 'm'],
  stria: ['estria', 'f'],
  sulcus: ['sulco', 'm'],
  taenia: ['tênia', 'f'],
  telencephalon: ['telencéfalo', 'm'],
  tendon: ['tendão', 'm'],
  tentorium: ['tenda', 'f'],
  testis: ['testículo', 'm'],
  thalamus: ['tálamo', 'm'],
  thumb: ['polegar', 'm'],
  thymus: ['timo', 'm'],
  toe: ['dedo do pé', 'm'],
  tongue: ['língua', 'f'],
  tooth: ['dente', 'm'],
  trachea: ['traqueia', 'f'],
  tract: ['trato', 'm'],
  tree: ['árvore', 'f'],
  tributary: ['tributária', 'f'],
  trochlea: ['tróclea', 'f'],
  trunk: ['tronco', 'm'],
  tuber: ['túber', 'm'],
  ureter: ['ureter', 'm'],
  urethra: ['uretra', 'f'],
  valve: ['valva', 'f'],
  vein: ['veia', 'f'],
  veins: ['veias', 'f', 1],
  vena: ['veia', 'f'],
  ventricle: ['ventrículo', 'm'],
  vertebra: ['vértebra', 'f'],
  vesicle: ['vesícula', 'f'],
  wall: ['parede', 'f'],
  wrist: ['punho', 'm'],
  jaw: ['maxilar', 'm'],
  amygdala: ['corpo amigdaloide', 'm'],
  appendix: ['apêndice vermiforme', 'm'],
  bladder: ['bexiga', 'f'],
  ganglia: ['gânglios', 'm', 1],
  medulla: ['medula', 'f'],
  hip: ['quadril', 'm'],
  mandible: ['mandíbula', 'f'],
  maxilla: ['maxila', 'f'],
  lung: ['pulmão', 'm'],
  cervix: ['colo', 'm'],
  uterus: ['útero', 'm'],
  ovary: ['ovário', 'm'],
}

// ---------------------------------------------------------------------------
// Adjetivos (forma masculina singular)
// ---------------------------------------------------------------------------
const A = {
  abdominal: 'abdominal',
  accessory: 'acessório',
  acromial: 'acromial',
  alar: 'alar',
  anal: 'anal',
  angular: 'angular',
  anterior: 'anterior',
  anterolateral: 'anterolateral',
  aortic: 'aórtico',
  apical: 'apical',
  appendicular: 'apendicular',
  arcuate: 'arqueado',
  arterial: 'arterial',
  arytenoid: 'aritenóideo',
  ascending: 'ascendente',
  axillary: 'axilar',
  azygos: 'ázigo',
  basal: 'basal',
  basilar: 'basilar',
  basilic: 'basílico',
  biliary: 'biliar',
  brachial: 'braquial',
  brachiocephalic: 'braquiocefálico',
  bronchial: 'brônquico',
  calcaneal: 'calcâneo',
  callosomarginal: 'calosomarginal',
  canine: 'canino',
  cardiac: 'cardíaco',
  carotid: 'carótido',
  carpal: 'carpal',
  caudal: 'caudal',
  caudate: 'caudado',
  cecal: 'cecal',
  celiac: 'celíaco',
  central: 'central',
  cephalic: 'cefálico',
  cerebellar: 'cerebelar',
  cerebral: 'cerebral',
  cervical: 'cervical',
  choroidal: 'corióideo',
  ciliary: 'ciliar',
  circumflex: 'circunflexo',
  clavicular: 'clavicular',
  colic: 'cólico',
  collateral: 'colateral',
  common: 'comum',
  communicating: 'comunicante',
  coronary: 'coronário',
  corniculate: 'corniculado',
  costal: 'costal',
  costocervical: 'costocervical',
  cricoid: 'cricóideo',
  cubital: 'cubital',
  cystic: 'cístico',
  deep: 'profundo',
  deferent: 'deferente',
  descending: 'descendente',
  diagonal: 'diagonal',
  digital: 'digital',
  distal: 'distal',
  dorsal: 'dorsal',
  epigastric: 'epigástrico',
  esophageal: 'esofágico',
  oesophageal: 'esofágico',
  ethmoidal: 'etmoidal',
  external: 'externo',
  femoral: 'femoral',
  fibular: 'fibular',
  frontal: 'frontal',
  frontobasal: 'frontobasal',
  fusiform: 'fusiforme',
  gastric: 'gástrico',
  'gastro-epiploic': 'gastromental',
  gastroepiploic: 'gastromental',
  gastroduodenal: 'gastroduodenal',
  genicular: 'genicular',
  geniculate: 'geniculado',
  gluteal: 'glúteo',
  great: 'magno',
  hepatic: 'hepático',
  hepatovenous: 'hepatovenoso',
  humeral: 'umeral',
  'hyo-epiglottic': 'hioepiglótico',
  hyoid: 'hióideo',
  hypothalamic: 'hipotalâmico',
  ileal: 'ileal',
  ileocecal: 'ileocecal',
  ileocolic: 'ileocólico',
  iliac: 'ilíaco',
  iliolumbar: 'iliolombar',
  iliotibial: 'iliotibial',
  incisor: 'incisivo',
  inferior: 'inferior',
  infratrochlear: 'infratroclear',
  innermost: 'íntimo',
  insular: 'insular',
  intercostal: 'intercostal',
  intermediate: 'intermédio',
  intermediomedial: 'intermediomedial',
  internal: 'interno',
  interosseous: 'interósseo',
  interpeduncular: 'interpeduncular',
  interventricular: 'interventricular',
  intervertebral: 'intervertebral',
  jugular: 'jugular',
  lacrimal: 'lacrimal',
  lateral: 'lateral',
  laterobasal: 'laterobasal',
  lingular: 'lingular',
  lobar: 'lobar',
  long: 'longo',
  lower: 'inferior',
  lumbar: 'lombar',
  main: 'principal',
  major: 'maior',
  mammillary: 'mamilar',
  marginal: 'marginal',
  medial: 'medial',
  median: 'mediano',
  mediobasal: 'mediobasal',
  mesenteric: 'mesentérico',
  middle: 'médio',
  minor: 'menor',
  mitral: 'mitral',
  molar: 'molar',
  musculophrenic: 'musculofrênico',
  nasal: 'nasal',
  nasociliary: 'nasociliar',
  nasolacrimal: 'nasolacrimal',
  oblique: 'oblíquo',
  obturator: 'obturatório',
  occipital: 'occipital',
  oculomotor: 'oculomotor',
  ophthalmic: 'oftálmico',
  optic: 'óptico',
  orbital: 'orbital',
  palatine: 'palatino',
  palmar: 'palmar',
  pancreatic: 'pancreático',
  pancreaticoduodenal: 'pancreaticoduodenal',
  papillary: 'papilar',
  paracentral: 'paracentral',
  parahippocampal: 'para-hipocampal',
  parietal: 'parietal',
  pectoral: 'peitoral',
  perforating: 'perfurante',
  pericallosal: 'pericaloso',
  pharyngeal: 'faríngeo',
  phrenic: 'frênico',
  pineal: 'pineal',
  plantar: 'plantar',
  polar: 'polar',
  pontine: 'pontino',
  popliteal: 'poplíteo',
  portal: 'porta',
  postcentral: 'pós-central',
  postcommunicating: 'pós-comunicante',
  posterior: 'posterior',
  posteromedial: 'posteromedial',
  'pre-hepatic': 'pré-hepático',
  precentral: 'pré-central',
  precommunicating: 'pré-comunicante',
  precuneal: 'precuneal',
  prefrontal: 'pré-frontal',
  premolar: 'pré-molar',
  proper: 'próprio',
  proximal: 'proximal',
  pterygomandibular: 'pterigomandibular',
  pubic: 'púbico',
  pudendal: 'pudendo',
  pulmonary: 'pulmonar',
  radial: 'radial',
  rectal: 'retal',
  recurrent: 'recorrente',
  renal: 'renal',
  sacral: 'sacral',
  saphenous: 'safeno',
  scapular: 'escapular',
  secondary: 'permanente',
  segmental: 'segmentar',
  septal: 'septal',
  sesamoid: 'sesamoide',
  short: 'curto',
  sigmoid: 'sigmoide',
  small: 'pequeno',
  spinal: 'espinal',
  splenial: 'esplenial',
  splenic: 'esplênico',
  sternocostal: 'esternocostal',
  straight: 'reto',
  subclavian: 'subclávio',
  subcostal: 'subcostal',
  sublingual: 'sublingual',
  submandibular: 'submandibular',
  subscapular: 'subescapular',
  subsuperior: 'subsuperior',
  superficial: 'superficial',
  superior: 'superior',
  'supra-orbital': 'supraorbital',
  supramarginal: 'supramarginal',
  suprarenal: 'suprarrenal',
  suprascapular: 'supraescapular',
  supratrochlear: 'supratroclear',
  suspensory: 'suspensor',
  tarsal: 'tarsal',
  temporal: 'temporal',
  'temporo-occipital': 'temporo-occipital',
  tendinous: 'tendíneo',
  terminal: 'terminal',
  testicular: 'testicular',
  thalamogeniculate: 'talamogeniculado',
  thalamoperforating: 'talamoperfurante',
  thoracic: 'torácico',
  'thoraco-acromial': 'toracoacromial',
  thoracodorsal: 'toracodorsal',
  'thyro-epiglottic': 'tireoepiglótico',
  thyrocervical: 'tireocervical',
  thyroid: 'tireóideo',
  tibial: 'tibial',
  transverse: 'transverso',
  tricuspid: 'tricúspide',
  trochlear: 'troclear',
  ulnar: 'ulnar',
  upper: 'superior',
  ureteric: 'uretérico',
  urinary: 'urinário',
  uvular: 'uvular',
  venous: 'venoso',
  ventricular: 'ventricular',
  vermian: 'vermiano',
  vertebral: 'vertebral',
  vertical: 'vertical',
  vitreous: 'vítreo',
  vocal: 'vocal',
  white: 'branco',
  zygomatic: 'zigomático',
  cingulate: 'do cíngulo',
  left: 'esquerdo',
  right: 'direito',
  ethmoid: 'etmoidal',
  sphenoid: 'esfenoidal',
  cuneiform: 'cuneiforme',
  abdominalis: 'abdominal',
  metacarpal: 'metacarpal',
  metatarsal: 'metatarsal',
  antebrachial: 'antebraquial',
  thyrohyoid: 'tíreo-hióideo',
  deltoid: 'deltóideo',
  stylohyoid: 'estilo-hióideo',
  cricothyroid: 'cricotireóideo',
}

const ORDINAIS = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
}
const ROMANOS = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'])

// ---------------------------------------------------------------------------
// Expressões de várias palavras (casadas antes das palavras isoladas)
// ---------------------------------------------------------------------------
/** frase -> [português, gênero, plural?] (substantivo composto) */
const FRASES = {
  'spinal cord': ['medula espinal', 'f'],
  'medulla oblongata': ['bulbo', 'm'],
  'corpus callosum': ['corpo caloso', 'm'],
  'white matter': ['substância branca', 'f'],
  'gray matter': ['substância cinzenta', 'f'],
  'vena cava': ['veia cava', 'f'],
  'adrenal gland': ['glândula suprarrenal', 'f'],
  'pituitary gland': ['hipófise', 'f'],
  'pineal body': ['glândula pineal', 'f'],
  'thyroid gland': ['glândula tireoide', 'f'],
  'urinary bladder': ['bexiga urinária', 'f'],
  'small intestine': ['intestino delgado', 'm'],
  'large intestine': ['intestino grosso', 'm'],
  'big toe': ['hálux', 'm'],
  'little toe': ['dedo mínimo do pé', 'm'],
  'second toe': ['2º dedo do pé', 'm'],
  'third toe': ['3º dedo do pé', 'm'],
  'fourth toe': ['4º dedo do pé', 'm'],
  'little finger': ['dedo mínimo', 'm'],
  'index finger': ['dedo indicador', 'm'],
  'middle finger': ['dedo médio', 'm'],
  'ring finger': ['dedo anular', 'm'],
  'lower jaw': ['mandíbula', 'f'],
  'upper jaw': ['maxila', 'f'],
  'check ligament': ['ligamento de contenção', 'm'],
  'tarsal plate': ['tarso', 'm'],
  'globus pallidus': ['globo pálido', 'm'],
  'tuber cinereum': ['túber cinéreo', 'm'],
  'conus elasticus': ['cone elástico', 'm'],
  'corona ciliaris': ['coroa ciliar', 'f'],
  'lamina terminalis': ['lâmina terminal', 'f'],
  'stria terminalis': ['estria terminal', 'f'],
  'stria medullaris': ['estria medular', 'f'],
  'taenia libera': ['tênia livre', 'f'],
  'taenia mesocolica': ['tênia mesocólica', 'f'],
  'taenia omentalis': ['tênia omental', 'f'],
  'arteria princeps pollicis': ['artéria principal do polegar', 'f'],
  'arteria radialis indicis': ['artéria radial do indicador', 'f'],
  'dorsalis pedis artery': ['artéria dorsal do pé', 'f'],
  'glans penis': ['glande do pênis', 'f'],
  'corpus cavernosum': ['corpo cavernoso', 'm'],
  'corpus spongiosum': ['corpo esponjoso', 'm'],
  'tentorium cerebelli': ['tenda do cerebelo', 'f'],
  'linea alba': ['linha alba', 'f'],
  'cingulate gyrus': ['giro do cíngulo', 'm'],
  'fourth ventricle': ['quarto ventrículo', 'm'],
  'third ventricle': ['terceiro ventrículo', 'm'],
  'vitreous body': ['corpo vítreo', 'm'],
  'common tendinous ring': ['anel tendíneo comum', 'm'],
  'deferent duct': ['ducto deferente', 'm'],
  'seminal vesicle': ['glândula seminal', 'f'],
  'xiphoid process': ['processo xifoide', 'm'],
  'hair of head': ['cabelo', 'm'],
  'pubic hair': ['pelos pubianos', 'm', 1],
  'small saphenous vein': ['veia safena parva', 'f'],
  'small cardiac vein': ['veia cardíaca parva', 'f'],
  'great saphenous vein': ['veia safena magna', 'f'],
  'azygos vein': ['veia ázigo', 'f'],
  'hemiazygos vein': ['veia hemiázigo', 'f'],
  'accessory hemiazygos vein': ['veia hemiázigo acessória', 'f'],
  'portal vein': ['veia porta', 'f'],
  'celiac trunk': ['tronco celíaco', 'm'],
  'brachiocephalic trunk': ['tronco braquiocefálico', 'm'],
  'pulmonary trunk': ['tronco pulmonar', 'm'],
  'optic chiasm': ['quiasma óptico', 'm'],
  'mammillary body': ['corpo mamilar', 'm'],
  'geniculate body': ['corpo geniculado', 'm'],
  'anterior chamber': ['câmara anterior', 'f'],
  'posterior chamber': ['câmara posterior', 'f'],
  'bronchial tree': ['árvore brônquica', 'f'],
  'biliary tree': ['árvore biliar', 'f'],
  'abdominal aorta': ['parte abdominal da aorta', 'f'],
  'descending aorta': ['parte descendente da aorta', 'f'],
  'ascending aorta': ['parte ascendente da aorta', 'f'],
  'thoracic aorta': ['parte torácica da aorta', 'f'],
  'arch of aorta': ['arco da aorta', 'm'],
  'pre-hepatic portal vein': ['parte pré-hepática da veia porta', 'f'],
  'lacrimal lake': ['lago lacrimal', 'm'],
  'lacrimal sac': ['saco lacrimal', 'm'],
  'internal capsule': ['cápsula interna', 'f'],
  'lateral ventricle': ['ventrículo lateral', 'm'],
  'caudate nucleus': ['núcleo caudado', 'm'],
  'central sulcus': ['sulco central', 'm'],
  'central canal': ['canal central', 'm'],
  'pharyngeal raphe': ['rafe da faringe', 'f'],
  'iliotibial tract': ['trato iliotibial', 'm'],
  'flexor retinaculum': ['retináculo dos músculos flexores', 'm'],
  'extensor retinaculum': ['retináculo dos músculos extensores', 'm'],
  'posterior circumflex humeral artery': ['artéria circunflexa posterior do úmero', 'f'],
  'anterior circumflex humeral artery': ['artéria circunflexa anterior do úmero', 'f'],
  'deep brachial artery': ['artéria profunda do braço', 'f'],
  'deep femoral artery': ['artéria femoral profunda', 'f'],
  'median cubital vein': ['veia intermédia do cotovelo', 'f'],
  'median antebrachial vein': ['veia intermédia do antebraço', 'f'],
  'peduncle of midbrain': ['pedúnculo cerebral', 'm'],
  'superior intercostal artery': ['artéria intercostal suprema', 'f'],
  'gingiva of lower jaw': ['gengiva inferior', 'f'],
  'gingiva of upper jaw': ['gengiva superior', 'f'],
  'spinal nerve': ['nervo espinal', 'm'],
  'oculomotor nerve': ['nervo oculomotor', 'm'],
  'tooth socket': ['alvéolo dentário', 'm'],
}

/** Músculos (núcleo do nome, sem lado): [nome PT sem "músculo", plural?] */
const MUSCULOS = {
  'abductor digiti minimi': ['abdutor do dedo mínimo'],
  'abductor hallucis': ['abdutor do hálux'],
  'abductor pollicis brevis': ['abdutor curto do polegar'],
  'abductor pollicis longus': ['abdutor longo do polegar'],
  'adductor brevis': ['adutor curto'],
  'adductor longus': ['adutor longo'],
  'adductor magnus': ['adutor magno'],
  'adductor minimus': ['adutor mínimo'],
  'adductor hallucis': ['adutor do hálux'],
  'adductor pollicis': ['adutor do polegar'],
  anconeus: ['ancôneo'],
  aryepiglotticus: ['ariepiglótico'],
  brachialis: ['braquial'],
  brachioradialis: ['braquiorradial'],
  'cervical rotator': ['rotador do pescoço'],
  'thoracic rotator': ['rotador do tórax'],
  'lumbar rotator': ['rotador do lombo'],
  coccygeus: ['isquiococcígeo'],
  coracobrachialis: ['coracobraquial'],
  deltoid: ['deltoide'],
  digastric: ['digástrico'],
  'extensor carpi radialis brevis': ['extensor radial curto do carpo'],
  'extensor carpi radialis longus': ['extensor radial longo do carpo'],
  'extensor carpi ulnaris': ['extensor ulnar do carpo'],
  'extensor digiti minimi': ['extensor do dedo mínimo'],
  'extensor digitorum': ['extensor dos dedos'],
  'extensor digitorum longus': ['extensor longo dos dedos'],
  'extensor digitorum brevis': ['extensor curto dos dedos'],
  'extensor hallucis brevis': ['extensor curto do hálux'],
  'extensor hallucis longus': ['extensor longo do hálux'],
  'extensor indicis': ['extensor do indicador'],
  'extensor pollicis brevis': ['extensor curto do polegar'],
  'extensor pollicis longus': ['extensor longo do polegar'],
  'external anal sphincter': ['esfíncter externo do ânus'],
  'external intercostal muscle': ['intercostal externo'],
  'internal intercostal muscle': ['intercostal interno'],
  'innermost intercostal muscle': ['intercostal íntimo'],
  'external oblique': ['oblíquo externo do abdome'],
  'internal oblique': ['oblíquo interno do abdome'],
  'fibularis brevis': ['fibular curto'],
  'fibularis longus': ['fibular longo'],
  'fibularis tertius': ['fibular terceiro'],
  lumbrical: ['lumbrical'],
  'plantar interosseous': ['interósseo plantar'],
  'dorsal interosseous': ['interósseo dorsal'],
  'palmar interosseous': ['interósseo palmar'],
  'flexor accessorius': ['quadrado plantar'],
  'flexor carpi radialis': ['flexor radial do carpo'],
  'flexor carpi ulnaris': ['flexor ulnar do carpo'],
  'flexor digiti minimi brevis': ['flexor curto do dedo mínimo'],
  'flexor digitorum brevis': ['flexor curto dos dedos'],
  'flexor digitorum longus': ['flexor longo dos dedos'],
  'flexor digitorum profundus': ['flexor profundo dos dedos'],
  'flexor digitorum superficialis': ['flexor superficial dos dedos'],
  'flexor hallucis longus': ['flexor longo do hálux'],
  'flexor hallucis brevis': ['flexor curto do hálux'],
  'flexor pollicis brevis': ['flexor curto do polegar'],
  'flexor pollicis longus': ['flexor longo do polegar'],
  'gemellus inferior': ['gêmeo inferior'],
  'gemellus superior': ['gêmeo superior'],
  genioglossus: ['genioglosso'],
  geniohyoid: ['gênio-hióideo'],
  'gluteus maximus': ['glúteo máximo'],
  'gluteus medius': ['glúteo médio'],
  'gluteus minimus': ['glúteo mínimo'],
  gracilis: ['grácil'],
  hyoglossus: ['hioglosso'],
  iliacus: ['ilíaco'],
  iliococcygeus: ['iliococcígeo'],
  'iliocostalis cervicis': ['iliocostal do pescoço'],
  'iliocostalis lumborum': ['iliocostal do lombo'],
  'iliocostalis thoracis': ['iliocostal do tórax'],
  'inferior oblique': ['oblíquo inferior'],
  'superior oblique': ['oblíquo superior'],
  'inferior rectus': ['reto inferior'],
  'superior rectus': ['reto superior'],
  'lateral rectus': ['reto lateral'],
  'medial rectus': ['reto medial'],
  'inferior pharyngeal constrictor': ['constritor inferior da faringe'],
  'middle pharyngeal constrictor': ['constritor médio da faringe'],
  'superior pharyngeal constrictor': ['constritor superior da faringe'],
  'infraspinatus muscle': ['infraespinal'],
  infraspinatus: ['infraespinal'],
  supraspinatus: ['supraespinal'],
  'interspinalis thoracis': ['interespinal do tórax'],
  'lateral crico-arytenoid': ['cricoaritenóideo lateral'],
  'posterior crico-arytenoid': ['cricoaritenóideo posterior'],
  'lateral lumbar intertransversarius': ['intertransversário lateral do lombo'],
  'medial lumbar intertransversarius': ['intertransversário medial do lombo'],
  'levator palpebrae superioris': ['levantador da pálpebra superior'],
  'levator scapulae': ['levantador da escápula'],
  'levator veli palatini': ['levantador do véu palatino'],
  'tensor veli palatini': ['tensor do véu palatino'],
  'longissimus capitis': ['longuíssimo da cabeça'],
  'longissimus cervicis': ['longuíssimo do pescoço'],
  'longissimus thoracis': ['longuíssimo do tórax'],
  'longus capitis': ['longo da cabeça'],
  'longus colli': ['longo do pescoço'],
  mylohyoid: ['milo-hióideo'],
  'oblique arytenoid': ['aritenóideo oblíquo'],
  'transverse arytenoid': ['aritenóideo transverso'],
  'obliquus capitis inferior': ['oblíquo inferior da cabeça'],
  'obliquus capitis superior': ['oblíquo superior da cabeça'],
  'obturator externus': ['obturador externo'],
  'obturator internus': ['obturador interno'],
  omohyoid: ['omo-hióideo'],
  'opponens digiti minimi': ['oponente do dedo mínimo'],
  'opponens pollicis': ['oponente do polegar'],
  palatopharyngeus: ['palatofaríngeo'],
  'palmaris longus': ['palmar longo'],
  pectineus: ['pectíneo'],
  'pectoralis minor': ['peitoral menor'],
  'pectoralis major': ['peitoral maior'],
  piriformis: ['piriforme'],
  plantaris: ['plantar'],
  platysma: ['platisma'],
  popliteus: ['poplíteo'],
  'pronator quadratus': ['pronador quadrado'],
  'pronator teres': ['pronador redondo'],
  'psoas major': ['psoas maior'],
  'psoas minor': ['psoas menor'],
  pubococcygeus: ['pubococcígeo'],
  puborectalis: ['puborretal'],
  'quadratus femoris': ['quadrado femoral'],
  'quadratus lumborum': ['quadrado do lombo'],
  'rectus capitis anterior': ['reto anterior da cabeça'],
  'rectus capitis lateralis': ['reto lateral da cabeça'],
  'rectus capitis posterior major': ['reto posterior maior da cabeça'],
  'rectus capitis posterior minor': ['reto posterior menor da cabeça'],
  'rectus femoris': ['reto femoral'],
  'rectus abdominis': ['reto do abdome'],
  'rhomboid major': ['romboide maior'],
  'rhomboid minor': ['romboide menor'],
  salpingopharyngeus: ['salpingofaríngeo'],
  sartorius: ['sartório'],
  'scalenus anterior': ['escaleno anterior'],
  'scalenus medius': ['escaleno médio'],
  'scalenus posterior': ['escaleno posterior'],
  semimembranosus: ['semimembranáceo'],
  'semispinalis capitis': ['semiespinal da cabeça'],
  'semispinalis cervicis': ['semiespinal do pescoço'],
  'semispinalis thoracis': ['semiespinal do tórax'],
  semitendinosus: ['semitendíneo'],
  'serratus anterior': ['serrátil anterior'],
  'serratus posterior inferior': ['serrátil posterior inferior'],
  'serratus posterior superior': ['serrátil posterior superior'],
  soleus: ['sóleo'],
  spinalis: ['espinal'],
  'spinalis thoracis': ['espinal do tórax'],
  'splenius capitis': ['esplênio da cabeça'],
  'splenius cervicis': ['esplênio do pescoço'],
  sternocleidomastoid: ['esternocleidomastóideo'],
  sternohyoid: ['esterno-hióideo'],
  sternothyroid: ['esternotireóideo'],
  stylohyoid: ['estilo-hióideo'],
  stylopharyngeus: ['estilofaríngeo'],
  subclavius: ['subclávio'],
  subscapularis: ['subescapular'],
  supinator: ['supinador'],
  'teres major': ['redondo maior'],
  'teres minor': ['redondo menor'],
  'thyro-arytenoid': ['tireoaritenóideo'],
  thyrohyoid: ['tíreo-hióideo'],
  'tibialis anterior': ['tibial anterior'],
  'tibialis posterior': ['tibial posterior'],
  'transversus thoracis': ['transverso do tórax'],
  'transversus abdominis': ['transverso do abdome'],
  'tensor fasciae latae': ['tensor da fáscia lata'],
  'uvular muscle': ['da úvula'],
  'vastus intermedius': ['vasto intermédio'],
  'vastus lateralis': ['vasto lateral'],
  'vastus medialis': ['vasto medial'],
  vocalis: ['vocal'],
  'biceps brachii': ['bíceps braquial'],
  'biceps femoris': ['bíceps femoral'],
  'triceps brachii': ['tríceps braquial'],
  gastrocnemius: ['gastrocnêmio'],
  trapezius: ['trapézio'],
  cricothyroid: ['cricotireóideo'],
  'levator ani': ['levantador do ânus'],
  masseter: ['masseter'],
  temporalis: ['temporal'],
  buccinator: ['bucinador'],
  'orbicularis oculi': ['orbicular do olho'],
  'orbicularis oris': ['orbicular da boca'],
  'latissimus dorsi': ['latíssimo do dorso'],
  'erector spinae': ['eretor da espinha'],
  multifidus: ['multífido'],
  'quadriceps femoris': ['quadríceps femoral'],
  // Conjuntos (plural)
  'dorsal interossei': ['interósseos dorsais', 1],
  'palmar interossei': ['interósseos palmares', 1],
  'plantar interossei': ['interósseos plantares', 1],
  lumbricals: ['lumbricais', 1],
  'interspinales cervicis': ['interespinais do pescoço', 1],
  'interspinales lumborum': ['interespinais do lombo', 1],
  'levatores costarum breves': ['levantadores curtos das costelas', 1],
  'levatores costarum longi': ['levantadores longos das costelas', 1],
  'anterior cervical intertransversarii': ['intertransversários anteriores do pescoço', 1],
  'posterior cervical intertransversarii': ['intertransversários posteriores do pescoço', 1],
}

/** Nomes inteiros com tradução fixa. */
const NOMES_FIXOS = {
  diaphragm: 'Diafragma',
  skin: 'Pele',
  'hair of head': 'Cabelo',
  'pubic hair': 'Pelos pubianos',
  eyebrow: 'Supercílio',
  'medulla oblongata': 'Bulbo',
  pons: 'Ponte',
  midbrain: 'Mesencéfalo',
  habenula: 'Habênula',
  'pineal body': 'Glândula pineal',
  'pituitary gland': 'Hipófise',
  'optic chiasm': 'Quiasma óptico',
  'linea alba': 'Linha alba',
  appendix: 'Apêndice vermiforme',
  'lamina terminalis': 'Lâmina terminal',
  'tuber cinereum': 'Túber cinéreo',
}

// ---------------------------------------------------------------------------
// Gramática
// ---------------------------------------------------------------------------
const INVARIAVEIS = new Set(['porta', 'do cíngulo'])

function flexionar(adj, genero, plural) {
  let a = adj
  if (INVARIAVEIS.has(a)) return a
  if (genero === 'f') {
    if (a.endsWith('o')) a = a.slice(0, -1) + 'a'
    else if (a === 'suspensor') a = 'suspensora'
  }
  if (plural) {
    if (/[aeiouáéíóú]$/.test(a)) a += 's'
    else if (a.endsWith('al')) a = a.slice(0, -2) + 'ais'
    else if (a.endsWith('il')) a = a.slice(0, -2) + 'is'
    else if (/[rz]$/.test(a)) a += 'es'
    else if (a.endsWith('m')) a = a.slice(0, -1) + 'ns'
    else a += 's'
  }
  return a
}

const artigo = (g, pl) => (g === 'f' ? (pl ? 'das' : 'da') : pl ? 'dos' : 'do')
const ordinal = (n, g) => `${n}${g === 'f' ? 'ª' : 'º'}`

/** Gênero de um nome já em português (resultado do tradutor de ossos). */
function generoDe(pt) {
  const primeira = pt.split(/\s+/).find((p) => !/^\d/.test(p)) ?? ''
  return /a$/i.test(primeira) && !/^atlas$/i.test(primeira) ? 'f' : 'm'
}

const minuscula = (s) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)

/** Palavras ainda não reconhecidas (para revisão). */
export const desconhecidas = new Map()

/**
 * Traduz um sintagma nominal. Retorna { texto, genero, plural }.
 * @param {string} en em minúsculas
 */
function sintagma(en, ehMusculo) {
  if (NOMES_FIXOS[en]) return { texto: NOMES_FIXOS[en], genero: generoDe(NOMES_FIXOS[en]), plural: false }
  if (FRASES[en]) {
    const [pt, g, pl] = FRASES[en]
    return { texto: pt, genero: g, plural: !!pl }
  }
  // Ossos (nomes já tratados com cuidado, incluindo vértebras e costelas)
  const osso = traduzirOsso(en)
  if (osso) return { texto: minuscula(osso.nome), genero: generoDe(osso.nome), plural: false }

  // Complementos: " of " (primeiro), " to ", " with "
  for (const [sep, prep] of [
    [' to ', 'para'],
    [' with ', 'com'],
  ]) {
    const i = en.indexOf(sep)
    if (i > 0) {
      const a = sintagma(en.slice(0, i), ehMusculo)
      const b = sintagma(en.slice(i + sep.length), false)
      const art = b.genero === 'f' ? (b.plural ? 'as' : 'a') : b.plural ? 'os' : 'o'
      return { ...a, texto: `${a.texto} ${prep} ${art} ${b.texto}` }
    }
  }
  const iOf = en.indexOf(' of ')
  if (iOf > 0) {
    const cab = sintagma(en.slice(0, iOf), false)
    const comp = sintagma(en.slice(iOf + 4), ehMusculo)
    return { ...cab, texto: `${cab.texto} ${artigo(comp.genero, comp.plural)} ${comp.texto}` }
  }

  // Sintagma simples: [lado] [ordinal] modificadores* núcleo pós-modificadores*
  let palavras = en.split(/\s+/)
  let lado = null
  palavras = palavras.filter((p) => {
    if (p === 'left' || p === 'right') {
      lado = p
      return false
    }
    return true
  })
  let ord = null
  palavras = palavras.filter((p) => {
    if (ORDINAIS[p] && ord === null) {
      ord = ORDINAIS[p]
      return false
    }
    return true
  })
  const romano = palavras.length > 1 && ROMANOS.has(palavras.at(-1)) ? palavras.pop().toUpperCase() : null
  const resto = palavras.join(' ')

  // Músculo pelo nome latino/inglês
  const mus = MUSCULOS[resto]
  let nucleo,
    genero,
    plural,
    pre = [],
    pos = []
  if (mus) {
    plural = !!mus[1]
    nucleo = `${plural ? 'músculos' : 'músculo'} ${mus[0]}`
    genero = 'm'
  } else {
    // Frase composta mais longa dentro do sintagma
    let achou = null
    for (let tam = palavras.length; tam >= 2 && !achou; tam--)
      for (let i = 0; i + tam <= palavras.length; i++) {
        const f = palavras.slice(i, i + tam).join(' ')
        if (FRASES[f]) {
          achou = { i, tam, f }
          break
        }
      }
    let iNucleo
    if (achou) {
      const [pt, g, pl] = FRASES[achou.f]
      nucleo = pt
      genero = g
      plural = !!pl
      pre = palavras.slice(0, achou.i)
      pos = palavras.slice(achou.i + achou.tam)
    } else {
      iNucleo = palavras.findLastIndex((p) => S[p])
      if (iNucleo < 0) {
        for (const p of palavras) if (!A[p]) desconhecidas.set(p, (desconhecidas.get(p) ?? 0) + 1)
        return { texto: en, genero: 'm', plural: false }
      }
      const [pt, g, pl] = S[palavras[iNucleo]]
      nucleo = pt
      genero = g
      plural = !!pl
      pre = palavras.slice(0, iNucleo)
      pos = palavras.slice(iNucleo + 1)
    }
  }
  const adj = (p) => {
    if (A[p]) return flexionar(A[p], genero, plural)
    if (S[p]) return S[p][0] // substantivo usado como modificador (raro)
    desconhecidas.set(p, (desconhecidas.get(p) ?? 0) + 1)
    return p
  }
  const partes = [nucleo, ...pre.reverse().map(adj), ...pos.map(adj)]
  if (romano) partes.push(romano)
  if (lado) partes.push(flexionar(A[lado], genero, plural))
  let texto = partes.join(' ')
  if (ord) texto = `${ordinal(ord, genero)} ${texto}`
  return { texto, genero, plural }
}

/** Nome FMA em inglês -> nome em português (com inicial maiúscula). */
export function traduzir(en) {
  const { texto } = sintagma(en.trim().toLowerCase(), false)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
