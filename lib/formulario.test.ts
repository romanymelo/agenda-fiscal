import { expect, test } from 'vitest'
import { booleano, ErroDeFormulario, inteiro, texto, textoOuNulo } from './formulario'

function form(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

test('texto tira espacos, devolve vazio como vazio e campo ausente como undefined', () => {
  expect(texto(form({ a: '  oi  ' }), 'a')).toBe('oi')
  expect(texto(form({ a: '   ' }), 'a')).toBe('')
  expect(texto(form({}), 'a')).toBeUndefined()
})

test('textoOuNulo devolve null quando vazio, para limpar a coluna', () => {
  expect(textoOuNulo(form({ a: '  oi ' }), 'a')).toBe('oi')
  expect(textoOuNulo(form({ a: '   ' }), 'a')).toBeNull()
  expect(textoOuNulo(form({}), 'a')).toBeUndefined()
})

test('booleano aceita so true e false e recusa o resto em portugues', () => {
  expect(booleano(form({ a: 'true' }), 'a')).toBe(true)
  expect(booleano(form({ a: 'false' }), 'a')).toBe(false)
  expect(booleano(form({}), 'a')).toBeUndefined()
  for (const ruim of ['', 'banana', 'TRUE', 'on'])
    expect(() => booleano(form({ a: ruim }), 'a')).toThrow(ErroDeFormulario)
  expect(() => booleano(form({ a: 'banana' }), 'a')).toThrow(/true ou false/)
})

test('inteiro converte, deixa vazio e ausente como undefined e recusa o resto', () => {
  expect(inteiro(form({ a: ' 15 ' }), 'a')).toBe(15)
  expect(inteiro(form({ a: '-2' }), 'a')).toBe(-2)
  expect(inteiro(form({ a: '' }), 'a')).toBeUndefined()
  expect(inteiro(form({}), 'a')).toBeUndefined()
  for (const ruim of ['1.5', 'abc', '1e3', '12a'])
    expect(() => inteiro(form({ a: ruim }), 'a')).toThrow(/número inteiro/)
})
