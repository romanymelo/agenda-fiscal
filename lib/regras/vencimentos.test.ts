import { expect, test } from 'vitest'
import { vencimentosDaObrigacao } from './vencimentos'

const base = { id: 'o1', nome: 'DAS', esfera: 'federal' as const, periodicidade: 'mensal' as const,
  diaVencimento: 20, meses: null, regraDiaNaoUtil: 'posterga' as const, diaUtilN: null, competenciaDefasagem: 1 }
const mes = { ano: 2026, mes: 10 }

test('mensal gera um vencimento no mes, com competencia defasada', () => {
  const r = vencimentosDaObrigacao(base, mes, mes, new Set())
  expect(r).toEqual([{ obrigacaoId: 'o1', nome: 'DAS', esfera: 'federal', data: '2026-10-20', competencia: '09/2026' }])
})

test('defasagem de dois meses recua a competencia', () => {
  const r = vencimentosDaObrigacao({ ...base, competenciaDefasagem: 2 }, mes, mes, new Set())
  expect(r[0].competencia).toBe('08/2026')
})

test('trimestral gera apenas nos meses listados', () => {
  const o = { ...base, periodicidade: 'trimestral' as const, meses: [1, 4, 7, 10] }
  const r = vencimentosDaObrigacao(o, { ano: 2026, mes: 8 }, { ano: 2027, mes: 1 }, new Set())
  expect(r.map(v => v.data)).toEqual(['2026-10-20', '2027-01-20'])
})

test('anual sem meses nao gera nada', () => {
  expect(vencimentosDaObrigacao({ ...base, periodicidade: 'anual', meses: null }, mes, mes, new Set())).toEqual([])
})

test('posterga empurra o sabado para a segunda', () => {
  const o = { ...base, diaVencimento: 24 }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set())[0].data).toBe('2026-10-26')
})

test('antecipa puxa o domingo para a sexta', () => {
  const o = { ...base, diaVencimento: 25, regraDiaNaoUtil: 'antecipa' as const }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set())[0].data).toBe('2026-10-23')
})

test('dia_util_n ignora diaVencimento', () => {
  const o = { ...base, diaVencimento: 1, regraDiaNaoUtil: 'dia_util_n' as const, diaUtilN: 10 }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set(['2026-10-12']))[0].data).toBe('2026-10-15')
})

// Review Focus 1
test('dia 31 em mes de 30 dias cai no ultimo dia do mes', () => {
  const o = { ...base, diaVencimento: 31 }
  const r = vencimentosDaObrigacao(o, { ano: 2026, mes: 4 }, { ano: 2026, mes: 4 }, new Set())
  expect(r[0].data).toBe('2026-04-30')
})

test('intervalo de varios meses vem ordenado por data', () => {
  const r = vencimentosDaObrigacao(base, { ano: 2026, mes: 10 }, { ano: 2026, mes: 12 }, new Set())
  expect(r.map(v => v.data)).toEqual(['2026-10-20', '2026-11-20', '2026-12-21'])
})
