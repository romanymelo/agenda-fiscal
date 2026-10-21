import { PGlite } from '@electric-sql/pglite'
import { expect, test } from 'vitest'
import type { Papel, Usuario } from '../tipos'
import { alterar, criar, excluir, SemPermissao, type Contexto } from './escrita'
import { historicoDe } from './historico'
import { migrar } from './migrar'

// Banco migrado em memória + contexto com o papel pedido.
// O usuário do teste é criado pelo admin inicial da migration 0002.
async function ctxCom(papel: Papel, nome: string): Promise<Contexto> {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<{ id: string }>("select id from usuarios where papel = 'admin'")
  const novo = await db.query<Usuario>(
    `insert into usuarios (nome, email, papel, criado_por) values ($1, $2, $3, $4)
     returning id, nome, email, papel, ativo`,
    [nome, `${nome.toLowerCase()}@escritorio.local`, papel, admin.rows[0].id],
  )
  return { db, usuario: novo.rows[0] }
}

test('criar grava auditoria e historico com o nome do usuario', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string; criado_por: string }>(ctx, 'clientes', {
    nome: 'Padaria',
    codigo_dominio: '0042',
  })
  expect(c.criado_por).toBe(ctx.usuario.id)
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h).toHaveLength(1)
  expect(h[0].acao).toBe('criacao')
  expect(h[0].usuarioNome).toBe('Ana')
})

test('alterar registra apenas os campos que mudaram, com antes e depois', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', {
    nome: 'Padaria',
    particularidades: 'NF pelo portal',
  })
  await alterar(ctx, 'clientes', c.id, { particularidades: 'NF pelo emissor proprio' })
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h[0].acao).toBe('alteracao')
  expect(h[0].camposAlterados).toEqual({
    particularidades: { antes: 'NF pelo portal', depois: 'NF pelo emissor proprio' },
  })
})

test('alterar sem mudanca efetiva nao gera linha de historico', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  await alterar(ctx, 'clientes', c.id, { nome: 'Padaria' })
  expect(await historicoDe(ctx.db, 'clientes', c.id)).toHaveLength(1)
})

test('valor igual em tipo diferente nao conta como mudanca', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const cliente = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  const p = await criar<{ id: string }>(ctx, 'processos', {
    cliente_id: cliente.id,
    tipo: 'Parcelamento',
    orgao: 'Receita Federal',
    status: 'em_andamento',
    data_abertura: '2026-10-05',
  })
  await alterar(ctx, 'processos', p.id, { data_abertura: '2026-10-05' })
  expect(await historicoDe(ctx.db, 'processos', p.id)).toHaveLength(1)
})

test('membro nao exclui', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  await expect(excluir(ctx, 'clientes', c.id)).rejects.toThrow(SemPermissao)
})

test('admin exclui logicamente e o registro sobrevive', async () => {
  const ctx = await ctxCom('admin', 'Chefe')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  await excluir(ctx, 'clientes', c.id)
  const r = await ctx.db.query<{ excluido_por: string; excluido_em: Date }>(
    'select excluido_por, excluido_em from clientes where id = $1',
    [c.id],
  )
  expect(r.rows).toHaveLength(1)
  expect(r.rows[0].excluido_por).toBe(ctx.usuario.id)
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h[0].acao).toBe('exclusao')
  expect(h[0].camposAlterados).toBeNull()
})

test('membro nao mexe na equipe', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  await expect(criar(ctx, 'usuarios', { nome: 'Novo', email: 'n@e.com' })).rejects.toThrow(
    SemPermissao,
  )
})

test('membro nao altera a configuracao do escritorio', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const cfg = await ctx.db.query<{ id: string }>('select id from configuracao')
  await expect(alterar(ctx, 'configuracao', cfg.rows[0].id, { uf: 'SP' })).rejects.toThrow(
    SemPermissao,
  )
})

test('falha na gravacao do historico desfaz a escrita', async () => {
  // historico com coluna renomeada em runtime: a transacao inteira volta
  const ctx = await ctxCom('membro', 'Ana')
  await ctx.db.exec('alter table historico rename column acao to acao_x')
  await expect(criar(ctx, 'clientes', { nome: 'Padaria' })).rejects.toThrow()
  const r = await ctx.db.query('select count(*)::int as n from clientes')
  expect(r.rows[0]).toEqual({ n: 0 })
})
