import { expect, test } from 'vitest'
import { booleano, ErroDeFormulario, inteiro, inteiroOuNulo, inteiros, lista, texto, textoOuNulo } from './formulario'

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

test('inteiroOuNulo converte, devolve null quando vazio, undefined quando ausente e recusa o resto', () => {
  expect(inteiroOuNulo(form({ a: ' 15 ' }), 'a')).toBe(15)
  expect(inteiroOuNulo(form({ a: '0' }), 'a')).toBe(0)
  expect(inteiroOuNulo(form({ a: '' }), 'a')).toBeNull()
  expect(inteiroOuNulo(form({ a: '   ' }), 'a')).toBeNull()
  expect(inteiroOuNulo(form({}), 'a')).toBeUndefined()
  for (const ruim of ['1.5', 'abc', '12a'])
    expect(() => inteiroOuNulo(form({ a: ruim }), 'a')).toThrow(ErroDeFormulario)
  expect(() => inteiroOuNulo(form({ a: 'abc' }), 'a')).toThrow(/número inteiro/)
})

test('lista devolve todos os valores marcados, sem espacos e sem vazios, e [] quando ausente', () => {
  const f = new FormData()
  f.append('r', ' simples ')
  f.append('r', 'mei')
  f.append('r', '  ')
  f.append('outro', 'x')
  expect(lista(f, 'r')).toEqual(['simples', 'mei'])
  expect(lista(f, 'nada')).toEqual([])
})

test('inteiros converte todos os valores do campo, devolve [] quando ausente e recusa o resto', () => {
  const f = new FormData()
  for (const m of ['1', ' 4 ', '', '10']) f.append('meses', m)
  expect(inteiros(f, 'meses')).toEqual([1, 4, 10])
  expect(inteiros(f, 'nada')).toEqual([])
  const ruim = new FormData()
  ruim.append('meses', '3')
  ruim.append('meses', '1.5')
  expect(() => inteiros(ruim, 'meses')).toThrow(ErroDeFormulario)
  expect(() => inteiros(ruim, 'meses')).toThrow(/números inteiros/)
})
