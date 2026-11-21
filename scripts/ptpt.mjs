/**
 * Adapta texto anatómico do português do Brasil para a norma europeia (usada em Portugal e Angola).
 *
 * Usado pelos geradores (nomes das estruturas) e para converter os textos escritos à mão. Muda só
 * ortografia e termos com forma europeia consagrada; a Terminologia Anatómica (tuba uterina, fíbula,
 * valva…) mantém-se, e os nomes tradicionais ficam acessíveis pela pesquisa (src/data/sinonimos.ts).
 */

/** Palavras com forma própria (minúsculas; a capitalização é preservada). */
const PALAVRAS = {
  peritônio: 'peritoneu',
  retroperitônio: 'retroperitoneu',
  hormônio: 'hormona',
  hormônios: 'hormonas',
  trigêmeo: 'trigémio',
  trigêmeos: 'trigémios',
  registro: 'registo',
  registros: 'registos',
  contato: 'contacto',
  contatos: 'contactos',
  esôfago: 'esófago',
  esôfagos: 'esófagos',
  abdome: 'abdómen',
  abdomes: 'abdómenes',
  abdômen: 'abdómen',
  bebê: 'bebé',
  bebês: 'bebés',
}

/** Mantêm o acento circunflexo também em Portugal. */
const MANTER = new Set(['estômago', 'estômagos'])

const comCaixa = (original, nova) =>
  original[0] === original[0].toUpperCase() ? nova[0].toUpperCase() + nova.slice(1) : nova

export function paraPtPt(texto) {
  // "hormona" é feminino em Portugal: o artigo acompanha
  texto = texto.replace(/\b([Oo])s hormônios/g, (_, o) => `${o === 'O' ? 'A' : 'a'}s hormônios`)
  texto = texto.replace(/\b([Oo]) hormônio\b/g, (_, o) => `${o === 'O' ? 'A' : 'a'} hormônio`)
  return texto.replace(/[\p{L}]+/gu, (palavra) => {
    const min = palavra.toLowerCase()
    if (PALAVRAS[min]) return comCaixa(palavra, PALAVRAS[min])
    if (MANTER.has(min)) return palavra
    let p = palavra
      // tireoide, cricotireóideo, tireocervical -> tiroide, cricotiróideo, tirocervical
      .replace(/tire([oó])/g, 'tir$1')
      .replace(/Tire([oó])/g, 'Tir$1')
    // Proparoxítonas com vogal tónica antes de m/n + vogal: fêmur, anatômico, frênico -> fémur, anatómico, frénico
    // (brônquio, côndilo, referência ficam: aí o m/n fecha a sílaba)
    p = p.replace(/[êô](?=[mn][aeiouáéíóúâêô])/g, (v) => (v === 'ê' ? 'é' : 'ó'))
    p = p.replace(/[ÊÔ](?=[mn][aeiouáéíóúâêô])/gi, (v) => (v === 'Ê' ? 'É' : 'Ó'))
    return p
  })
}
