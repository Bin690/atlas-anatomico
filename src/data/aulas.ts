import type { Aula } from '../types/atlas'

/** Aulas guiadas: qualquer arquivo src/data/aulas/*.json vira uma aula (são pequenos, carregados junto). */
const modulos = import.meta.glob<Aula>('./aulas/*.json', { eager: true, import: 'default' })

export const AULAS: Aula[] = Object.values(modulos).sort((a, b) => a.ordem - b.ordem)
export const aulaPorId = (id: string | undefined) => AULAS.find((a) => a.id === id)
