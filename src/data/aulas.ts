import type { Aula } from '../types/atlas'

/** Aulas guiadas: qualquer arquivo src/data/aulas/*.json vira uma aula (são pequenos, carregados junto). */
const modulos = import.meta.glob<Aula>('./aulas/*.json', { eager: true, import: 'default' })

export const AULAS: Aula[] = Object.values(modulos).sort((a, b) => a.ordem - b.ordem)
export const aulaPorId = (id: string | undefined) => AULAS.find((a) => a.id === id)

/**
 * Aulas com o mesmo título e um corpo cada (ex.: "Sistema genital" ♂ e ♀) são versões do mesmo tema:
 * aparecem num só cartão, com um botão por corpo.
 */
export const variantesDe = (aula: Aula): Aula[] =>
  aula.sexo
    ? AULAS.filter((a) => a.sexo && a.titulo === aula.titulo).sort((a) => (a.sexo === 'masculino' ? -1 : 1))
    : [aula]

/** Lista para o painel: cada tema uma vez (as versões ♂/♀ juntas). */
export const AULAS_AGRUPADAS: Aula[][] = AULAS.reduce<Aula[][]>((grupos, a) => {
  if (!grupos.some((g) => g.includes(a))) grupos.push(variantesDe(a))
  return grupos
}, [])
