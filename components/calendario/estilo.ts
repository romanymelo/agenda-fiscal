import type { CSSProperties } from 'react'
import { COR_CATEGORIA, type CategoriaCalendario } from '@/lib/tipos'

// Como cada categoria aparece no calendário, em todas as visões. As cores por esfera vêm de
// lib/tipos.ts (são do projeto); aqui só se decide onde cada uma entra: barra, fundo e texto.

const SOL = '#FFD23F'
const APAGADO = '#667C83'

/** Barra de cor à esquerda da etiqueta. Prazo de processo leva o marca-texto: é urgência. */
export function corBarra(c: CategoriaCalendario): string {
  if (c === 'processo') return SOL
  return COR_CATEGORIA[c].ponto ?? APAGADO
}

/** Etiqueta cheia (célula do mês): fundo e texto da categoria, barra na lateral. */
export function estiloEtiqueta(c: CategoriaCalendario): CSSProperties {
  const k = COR_CATEGORIA[c]
  return { background: k.fundo, color: k.texto, borderLeftColor: corBarra(c) }
}

/** Cor do nome da categoria sobre fundo branco (processo tem texto branco na etiqueta cheia). */
export function corRotulo(c: CategoriaCalendario): string {
  if (c === 'processo') return '#1F2937'
  return COR_CATEGORIA[c].texto
}
