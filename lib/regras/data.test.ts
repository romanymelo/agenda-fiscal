import { expect, test } from 'vitest'
import {
  diaDaSemana,
  formatarBR,
  montarData,
  somarDias,
  somarMeses,
  ultimoDiaDoMes,
} from './data'

test('diaDaSemana identifica domingo e sabado', () => {
  expect(diaDaSemana('2026-10-25')).toBe(0)
  expect(diaDaSemana('2026-10-24')).toBe(6)
})

test('somarDias atravessa mes e ano', () => {
  expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
  expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
})

test('ultimoDiaDoMes trata fevereiro comum e bissexto', () => {
  expect(ultimoDiaDoMes(2026, 2)).toBe(28)
  expect(ultimoDiaDoMes(2028, 2)).toBe(29)
  expect(ultimoDiaDoMes(2026, 4)).toBe(30)
})

// Review Focus 1
test('montarData limita o dia ao ultimo dia do mes', () => {
  expect(montarData(2026, 4, 31)).toBe('2026-04-30')
  expect(montarData(2026, 2, 29)).toBe('2026-02-28')
  expect(montarData(2026, 10, 20)).toBe('2026-10-20')
})

test('somarMeses vira o ano nos dois sentidos', () => {
  expect(somarMeses(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 })
  expect(somarMeses(2026, 1, -2)).toEqual({ ano: 2025, mes: 11 })
})

test('formatarBR usa dd/mm/aaaa', () => {
  expect(formatarBR('2026-10-20')).toBe('20/10/2026')
})
