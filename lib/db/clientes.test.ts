import { PGlite } from '@electric-sql/pglite'
import { beforeEach, expect, test, vi } from 'vitest'
import { criar, type Contexto } from '@/lib/db/escrita'
import { historicoDe } from '@/lib/db/historico'
import { migrar } from '@/lib/db/migrar'
import type { Usuario } from '@/lib/tipos'

// As Server Actions pegam o contexto pelo cookie, que não existe fora de uma requisição:
// o teste entrega o contexto que quiser, e o resto (helper de escrita, banco) é de verdade.
let ctx: Contexto
vi.mock('@/lib/usuario-atual', () => ({ contextoAtual: async () => ctx }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { alterarCliente, criarCliente, excluirCliente } from '@/app/(painel)/cadastros/clientes/acoes'
import { buscarCliente, listarClientes } from './clientes'

function formulario(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

const PADARIA = {
  nome: 'Padaria Trigo de Ouro',
  codigo_dominio: '0042',
  cnpj: '12345678000199',
  regime: 'simples',
  uf: 'AL',
  municipio: 'Maceió',
}

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  ctx = { db, usuario: admin.rows[0] }
})

test('busca acha por nome, codigo do dominio e cnpj', async () => {
  await criar(ctx, 'clientes', PADARIA)
  await criar(ctx, 'clientes', { ...PADARIA, nome: 'Oficina Rio Branco', codigo_dominio: '0100', cnpj: '98.765.432/0001-10' })
  expect(await listarClientes(ctx.db, 'trigo')).toHaveLength(1)
  expect(await listarClientes(ctx.db, '0042')).toHaveLength(1)
  expect(await listarClientes(ctx.db, '123456')).toHaveLength(1)
  // O CNPJ é comparado por dígitos: com ou sem máscara, de um lado e do outro.
  expect(await listarClientes(ctx.db, '12.345.678/0001-99')).toHaveLength(1)
  expect((await listarClientes(ctx.db, '98765432000110')).map((c) => c.nome)).toEqual(['Oficina Rio Branco'])
  expect(await listarClientes(ctx.db, 'nao existe')).toHaveLength(0)
  // Dígitos misturados a letras não viram busca por CNPJ.
  expect(await listarClientes(ctx.db, 'trigo 9')).toHaveLength(0)
  expect(await listarClientes(ctx.db)).toHaveLength(2)
})

test('busca ignora acento e caixa', async () => {
  await criar(ctx, 'clientes', { ...PADARIA, nome: 'Açougue São João' })
  await criar(ctx, 'clientes', { ...PADARIA, nome: 'MACEIÓ Pescados', codigo_dominio: '0200', cnpj: null })
  expect((await listarClientes(ctx.db, 'MACEIO')).map((c) => c.nome)).toEqual(['MACEIÓ Pescados'])
  expect((await listarClientes(ctx.db, 'maceió')).map((c) => c.nome)).toEqual(['MACEIÓ Pescados'])
  expect((await listarClientes(ctx.db, 'ACOUGUE SAO JOAO')).map((c) => c.nome)).toEqual(['Açougue São João'])
  expect((await listarClientes(ctx.db, 'açougue são joão')).map((c) => c.nome)).toEqual(['Açougue São João'])
})

test('codigo do dominio preserva zero a esquerda', async () => {
  const r = await criarCliente(formulario({ ...PADARIA, codigo_dominio: '0042' }))
  expect(r).toEqual({ ok: true })
  const [cliente] = await listarClientes(ctx.db)
  expect(cliente.codigoDominio).toBe('0042')
  expect((await buscarCliente(ctx.db, cliente.id))?.codigoDominio).toBe('0042')
})

test('cliente excluido sai da lista mas o historico continua legivel', async () => {
  await criarCliente(formulario(PADARIA))
  const [cliente] = await listarClientes(ctx.db)
  expect(await excluirCliente(cliente.id)).toEqual({ ok: true })
  expect(await listarClientes(ctx.db)).toHaveLength(0)
  expect(await listarClientes(ctx.db, 'trigo')).toHaveLength(0)
  expect(await buscarCliente(ctx.db, cliente.id)).toBeNull()
  const h = await historicoDe(ctx.db, 'clientes', cliente.id)
  expect(h.map((l) => [l.acao, l.usuarioNome])).toEqual([
    ['exclusao', 'Administrador'],
    ['criacao', 'Administrador'],
  ])
})

test('particularidades aceita varias linhas', async () => {
  // O navegador envia quebra de linha como \r\n; o que volta é sempre \n.
  const enviado = 'NFS-e pelo portal da prefeitura\r\nSenha no cofre da equipe\nEmitir até o dia 5'
  await criarCliente(formulario({ ...PADARIA, particularidades: enviado }))
  const [cliente] = await listarClientes(ctx.db)
  expect(cliente.particularidades).toBe(
    'NFS-e pelo portal da prefeitura\nSenha no cofre da equipe\nEmitir até o dia 5',
  )
  expect((await buscarCliente(ctx.db, cliente.id))?.particularidades).toBe(cliente.particularidades)
  expect(cliente.particularidades?.split('\n')).toHaveLength(3)
})

test('cliente inativo sai da lista do dia a dia, aparece quando pedido e a troca fica no historico', async () => {
  await criarCliente(formulario(PADARIA))
  await criarCliente(formulario({ ...PADARIA, nome: 'Oficina Rio Branco', codigo_dominio: '0100', ativo: 'false' }))
  // Por padrão, só os ativos; com o pedido, todos (o inativo vem marcado como tal).
  expect((await listarClientes(ctx.db)).map((c) => c.nome)).toEqual(['Padaria Trigo de Ouro'])
  expect((await listarClientes(ctx.db, undefined, { incluirInativos: true })).map((c) => [c.nome, c.ativo])).toEqual([
    ['Oficina Rio Branco', false],
    ['Padaria Trigo de Ouro', true],
  ])
  // A busca também respeita o filtro.
  expect(await listarClientes(ctx.db, 'oficina')).toHaveLength(0)
  expect(await listarClientes(ctx.db, 'oficina', { incluirInativos: true })).toHaveLength(1)

  // O inativo continua abrindo no detalhe e pode voltar: a troca é uma alteração com antes e depois.
  const [inativo] = await listarClientes(ctx.db, 'oficina', { incluirInativos: true })
  expect((await buscarCliente(ctx.db, inativo.id))?.ativo).toBe(false)
  expect(await alterarCliente(inativo.id, formulario({ ativo: 'true' }))).toEqual({ ok: true })
  expect(await listarClientes(ctx.db, 'oficina')).toHaveLength(1)
  const [ultima] = await historicoDe(ctx.db, 'clientes', inativo.id)
  expect(ultima.camposAlterados).toEqual({ ativo: { antes: false, depois: true } })
  expect(await alterarCliente(inativo.id, formulario({ ativo: 'talvez' }))).toEqual({
    erro: expect.stringMatching(/ativo/),
  })
})
