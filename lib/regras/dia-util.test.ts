import { expect, test } from 'vitest'
import { diaUtilAnterior, diaUtilSeguinte, ehDiaUtil, nEsimoDiaUtil } from './dia-util'

// 2026-10-24 sabado, 25 domingo, 26 segunda; 12/10 feriado (segunda)
const fer = new Set(['2026-10-12'])

test('ehDiaUtil recusa fim de semana e feriado', () => {
  expect(ehDiaUtil('2026-10-24', fer)).toBe(false)
  expect(ehDiaUtil('2026-10-12', fer)).toBe(false)
  expect(ehDiaUtil('2026-10-20', fer)).toBe(true)
})

test('diaUtilAnterior e diaUtilSeguinte pulam o fim de semana', () => {
  expect(diaUtilAnterior('2026-10-25', fer)).toBe('2026-10-23')
  expect(diaUtilSeguinte('2026-10-24', fer)).toBe('2026-10-26')
})

// Review Focus 3
test('o ajuste encadeia quando a vespera tambem nao e util', () => {
  const emenda = new Set(['2026-10-23', '2026-10-22'])
  expect(diaUtilAnterior('2026-10-24', emenda)).toBe('2026-10-21')
  expect(diaUtilSeguinte('2026-10-10', new Set(['2026-10-12', '2026-10-13']))).toBe('2026-10-14')
})

test('nEsimoDiaUtil conta a partir do dia 1 e pula feriado', () => {
  expect(nEsimoDiaUtil(2026, 10, 1, fer)).toBe('2026-10-01')
  expect(nEsimoDiaUtil(2026, 10, 10, fer)).toBe('2026-10-15')
})

// Review Focus 2
test('nEsimoDiaUtil alem do mes devolve o ultimo dia util', () => {
  expect(nEsimoDiaUtil(2026, 10, 25, fer)).toBe('2026-10-30')
})
