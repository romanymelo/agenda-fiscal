import { expect, test } from 'vitest'
import { feriadosDaPraca, normalizar } from './feriados-aplicaveis'

const praca = { uf: 'AL', municipio: 'Maceió' }

test('nacional vale sempre; estadual so na UF; municipal so no municipio', () => {
  const r = feriadosDaPraca([
    { data: '2026-10-12', descricao: 'Aparecida', abrangencia: 'nacional', uf: null, municipio: null },
    { data: '2026-06-24', descricao: 'Sao Joao', abrangencia: 'estadual', uf: 'AL', municipio: null },
    { data: '2026-07-09', descricao: 'Revolucao', abrangencia: 'estadual', uf: 'SP', municipio: null },
    { data: '2026-12-08', descricao: 'Padroeira', abrangencia: 'municipal', uf: 'AL', municipio: 'Maceio' },
    { data: '2026-11-21', descricao: 'Outra cidade', abrangencia: 'municipal', uf: 'AL', municipio: 'Arapiraca' },
  ], praca)
  expect([...r].sort()).toEqual(['2026-06-24', '2026-10-12', '2026-12-08'])
})

test('normalizar casa acento e caixa', () => {
  expect(normalizar('Maceió')).toBe(normalizar('maceio'))
  expect(normalizar(' al ')).toBe('al')
})

test('feriado municipal de cidade homonima em outra UF nao entra na praca', () => {
  const r = feriadosDaPraca([
    { data: '2026-03-10', descricao: 'Homonima', abrangencia: 'municipal', uf: 'SP', municipio: 'Maceio' },
  ], { uf: 'AL', municipio: 'Maceió' })
  expect([...r]).toEqual([])
})
