/**
 * Nomes populares, tradicionais (portugueses) e grafias do Brasil -> termo da Terminologia Anatómica
 * usado nos nomes do atlas. Tudo sem acentos e em minúsculas (como fica depois de `normalizar`).
 *
 * Cada termo à esquerda é trocado, como palavra ou expressão inteira, pelo termo à direita antes de
 * pesquisar. Os testes garantem que cada termo da direita encontra alguma estrutura.
 */
export const SINONIMOS: [string[], string][] = [
  // Ossos: nomes tradicionais
  [['rotula', 'rotulas'], 'patela'],
  [['omoplata', 'omoplatas'], 'escapula'],
  [['astragalo'], 'talus'],
  [['cubito'], 'ulna'],
  [['peronio', 'perone'], 'fibula'],
  [['calcanhar'], 'calcaneo'],
  [['queixo', 'maxilar inferior'], 'mandibula'],
  [['maxilar superior', 'maxilar'], 'maxila'],
  [['maca do rosto', 'malar'], 'zigomatico'],
  [['bacia', 'anca', 'ancas', 'osso iliaco', 'osso coxal'], 'osso do quadril'],
  [['osso grande', 'grande osso'], 'capitato'],
  [['unciforme', 'osso ganchoso'], 'hamato'],
  [['navicular do carpo'], 'escafoide'],
  [['vertebra cervical'], 'cervical'],
  // Músculos e tendões
  [['tendao de aquiles', 'aquiles'], 'tendao calcaneo'],
  [['gemeos', 'barriga da perna', 'panturrilha'], 'gastrocnemio'],
  [['bicipite', 'bicipite braquial'], 'biceps'],
  [['tricipite', 'tricipite braquial'], 'triceps'],
  [['quadricipite', 'quadriceps'], 'vasto'],
  [['grande peitoral'], 'peitoral maior'],
  [['pequeno peitoral'], 'peitoral menor'],
  [['grande gluteo', 'nadega'], 'gluteo maximo'],
  [['costureiro'], 'sartorio'],
  // Órgãos e vasos
  [
    ['trompa de falopio', 'trompas de falopio', 'trompa uterina', 'trompas uterinas', 'trompa', 'trompas', 'oviduto'],
    'tuba uterina',
  ],
  [['maca de adao', 'pomo de adao'], 'cartilagem tiroidea'],
  [['colon'], 'colo'],
  [['apendice cecal', 'apendice'], 'apendice vermiforme'],
  [['vesicula'], 'vesicula biliar'],
  [['safena interna'], 'safena magna'],
  [['safena externa'], 'safena parva'],
  [['valvula'], 'valva'],
  [['espinal medula', 'medula espinhal', 'medula'], 'medula espinal'],
  [['bulbo raquidiano', 'medula oblonga'], 'bulbo'],
  [['peito', 'seio', 'seios'], 'mama'],
  [['mamilo', 'bico do peito'], 'papila mamaria'],
  [['ovulo'], 'ovario'],
]

/** Grafias do Brasil que diferem só num trecho da palavra (tireoide -> tiroide, abdome -> abdómen). */
const TRECHOS: [RegExp, string][] = [
  [/tireo/g, 'tiro'],
  [/\babdome\b/g, 'abdomen'],
]

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Do mais longo ao mais curto: "trompa de falopio" antes de "trompa". */
const REGRAS: [RegExp, string][] = SINONIMOS.flatMap(([termos, alvo]) =>
  termos.map((t) => [new RegExp(`(^|\\s)${escapar(t)}(?=\\s|$)`, 'g'), alvo] as [RegExp, string]),
).sort(([a], [b]) => b.source.length - a.source.length)

/** Troca nomes populares pelo termo do atlas; recebe e devolve texto já normalizado. */
export function aplicarSinonimos(termo: string): string {
  let t = termo
  for (const [re, novo] of TRECHOS) t = t.replace(re, novo)
  for (const [re, alvo] of REGRAS) t = t.replace(re, (_, antes: string) => antes + alvo)
  return t
}
