import { expect, test } from 'vitest'
import type { FeriadoCadastro } from '../tipos'
import { comNacionaisCalculados, feriadosNacionais, pascoa } from './feriados-nacionais'

test('pascoa de anos conhecidos', () => {
  expect(pascoa(2024)).toBe('2024-03-31')
  expect(pascoa(2026)).toBe('2026-04-05')
  expect(pascoa(2027)).toBe('2027-03-28')
  expect(pascoa(2030)).toBe('2030-04-21')
})

test('feriados moveis de 2026 e 2027 saem da pascoa', () => {
  const datas = (ano: number) => Object.fromEntries(feriadosNacionais(ano).map((f) => [f.descricao, f.data]))
  expect(datas(2026)).toMatchObject({
    'Carnaval (segunda-feira)': '2026-02-16',
    'Carnaval (terça-feira)': '2026-02-17',
    'Sexta-feira Santa': '2026-04-03',
    'Corpus Christi': '2026-06-04',
  })
  expect(datas(2027)).toMatchObject({
    'Carnaval (segunda-feira)': '2027-02-08',
    'Carnaval (terça-feira)': '2027-02-09',
    'Sexta-feira Santa': '2027-03-26',
    'Corpus Christi': '2027-05-27',
  })
})

test('um ano tem os 9 fixos e os 4 moveis, todos nacionais e em ordem de data', () => {
  const f = feriadosNacionais(2031)
  expect(f).toHaveLength(13)
  expect(f.every((x) => x.abrangencia === 'nacional' && x.uf === null && x.municipio === null)).toBe(true)
  expect(f.map((x) => x.data)).toEqual([...f.map((x) => x.data)].sort())
  expect(f[0]).toMatchObject({ data: '2031-01-01', descricao: 'Confraternização Universal' })
})

test('o cadastro manda: nacional ja cadastrado na data nao duplica, e os calculados levam a marca automatico', () => {
  const cadastrado: FeriadoCadastro = {
    id: 'abc',
    data: '2026-04-21',
    descricao: 'Tiradentes',
    abrangencia: 'nacional',
    uf: null,
    municipio: null,
  }
  const lista = comNacionaisCalculados([cadastrado], '2026-04-01', '2026-04-30')
  expect(lista.map((f) => [f.data, f.descricao, f.automatico ?? false])).toEqual([
    ['2026-04-03', 'Sexta-feira Santa', true],
    ['2026-04-21', 'Tiradentes', false],
  ])
  expect(lista[0].id).toBe('automatico-2026-04-03')
})

test('feriado estadual na mesma data de um nacional calculado nao o esconde', () => {
  const estadual: FeriadoCadastro = {
    id: 'x',
    data: '2026-06-04',
    descricao: 'Dia local',
    abrangencia: 'estadual',
    uf: 'AL',
    municipio: null,
  }
  const lista = comNacionaisCalculados([estadual], '2026-06-01', '2026-06-30')
  expect(lista.map((f) => f.descricao).sort()).toEqual(['Corpus Christi', 'Dia local'])
})

test('o periodo pode cruzar o ano', () => {
  const lista = comNacionaisCalculados([], '2030-12-20', '2031-01-05')
  expect(lista.map((f) => f.data)).toEqual(['2030-12-25', '2031-01-01'])
})
