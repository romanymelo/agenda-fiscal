import { expect, test } from 'vitest'
import { diasAte, situacaoDoPrazo, textoDoPrazo } from './prazo'

test('diasAte conta dias corridos, atravessando mes e ano', () => {
  expect(diasAte('2026-10-21', '2026-10-21')).toBe(0)
  expect(diasAte('2026-10-21', '2026-10-27')).toBe(6)
  expect(diasAte('2026-10-30', '2026-11-02')).toBe(3)
  expect(diasAte('2026-12-30', '2027-01-02')).toBe(3)
  expect(diasAte('2026-10-21', '2026-10-18')).toBe(-3)
})

test('prazo de hoje ate daqui a 7 dias e urgente; depois disso fica adiante', () => {
  expect(situacaoDoPrazo('2026-10-21', '2026-10-21')).toEqual({ tipo: 'urgente', dias: 0 })
  expect(situacaoDoPrazo('2026-10-28', '2026-10-21')).toEqual({ tipo: 'urgente', dias: 7 })
  expect(situacaoDoPrazo('2026-10-29', '2026-10-21')).toEqual({ tipo: 'adiante', dias: 8 })
})

test('prazo que ja passou e vencido, nao urgente', () => {
  expect(situacaoDoPrazo('2026-10-20', '2026-10-21')).toEqual({ tipo: 'vencido', dias: -1 })
})

test('textoDoPrazo fala como a equipe fala', () => {
  expect(textoDoPrazo(0)).toBe('vence hoje')
  expect(textoDoPrazo(1)).toBe('vence amanhã')
  expect(textoDoPrazo(6)).toBe('em 6 dias')
  expect(textoDoPrazo(-1)).toBe('venceu ontem')
  expect(textoDoPrazo(-3)).toBe('venceu há 3 dias')
})
