import { expect, test } from 'vitest'
import { formatarUsuario } from './rotulos'

test('formatarUsuario traduz papel e situacao', () => {
  expect(formatarUsuario('papel', 'admin')).toBe('Administrador')
  expect(formatarUsuario('papel', 'membro')).toBe('Membro')
  expect(formatarUsuario('ativo', true)).toBe('Ativo')
  expect(formatarUsuario('ativo', false)).toBe('Inativo')
})

test('formatarUsuario deixa o padrao decidir os demais campos', () => {
  expect(formatarUsuario('nome', 'Ana')).toBeUndefined()
  expect(formatarUsuario('email', 'ana@escritorio.local')).toBeUndefined()
})
