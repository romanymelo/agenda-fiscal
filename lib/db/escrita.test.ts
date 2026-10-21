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

test('coluna de auditoria enviada pelo chamador e rejeitada', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  await expect(
    criar(ctx, 'clientes', { nome: 'Padaria', criado_por: ctx.usuario.id }),
  ).rejects.toThrow(
    /As colunas geridas pelo helper de escrita \(id, criado_por, criado_em, atualizado_por, atualizado_em, excluido_por, excluido_em\) não podem vir do chamador: clientes\.criado_por\./,
  )
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  await expect(
    alterar(ctx, 'clientes', c.id, { nome: 'Mercearia', atualizado_em: new Date() }),
  ).rejects.toThrow(/geridas pelo helper de escrita.*clientes\.atualizado_em\./)
  // a alteração rejeitada não gravou nada
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h.map((l) => l.acao)).toEqual(['criacao'])
})

test('historico da criacao nao inclui colunas de auditoria', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria', uf: 'AL' })
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  const chaves = Object.keys(h[0].camposAlterados ?? {})
  expect(h[0].camposAlterados).toMatchObject({
    nome: { antes: null, depois: 'Padaria' },
    uf: { antes: null, depois: 'AL' },
  })
  for (const auditoria of [
    'id',
    'criado_por',
    'criado_em',
    'atualizado_por',
    'atualizado_em',
    'excluido_por',
    'excluido_em',
  ])
    expect(chaves).not.toContain(auditoria)
})

test('alterar sem nenhum campo nao escreve nem gera historico', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  const igual = await alterar<{ id: string; nome: string; atualizado_em: Date | null }>(
    ctx,
    'clientes',
    c.id,
    {},
  )
  expect(igual.nome).toBe('Padaria')
  expect(igual.atualizado_em).toBeNull()
  expect(await historicoDe(ctx.db, 'clientes', c.id)).toHaveLength(1)
})

test('chamador nao troca o id do registro', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  const outroId = '00000000-0000-4000-8000-000000000001'
  await expect(alterar(ctx, 'clientes', c.id, { id: outroId })).rejects.toThrow(
    /não podem vir do chamador: clientes\.id\./,
  )
  await expect(criar(ctx, 'clientes', { nome: 'Mercearia', id: outroId })).rejects.toThrow(
    /não podem vir do chamador: clientes\.id\./,
  )
  // o registro continua no id original, com o histórico ainda pendurado nele
  const r = await ctx.db.query('select id from clientes where id = $1', [c.id])
  expect(r.rows).toHaveLength(1)
  expect(await historicoDe(ctx.db, 'clientes', c.id)).toHaveLength(1)
})

test('o helper nunca escreve na tabela de historico', async () => {
  const ctx = await ctxCom('admin', 'Chefe')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  const esperado = /O helper de escrita nunca escreve em historico/
  await expect(
    criar(ctx, 'historico', { tabela: 'clientes', registro_id: c.id, acao: 'criacao' }),
  ).rejects.toThrow(esperado)
  const h = await ctx.db.query<{ id: string }>('select id from historico limit 1')
  await expect(alterar(ctx, 'historico', h.rows[0].id, { acao: 'exclusao' })).rejects.toThrow(
    esperado,
  )
  await expect(excluir(ctx, 'historico', h.rows[0].id)).rejects.toThrow(esperado)
})

test('tabela sem colunas de auditoria e recusada', async () => {
  const ctx = await ctxCom('admin', 'Chefe')
  await ctx.db.exec('create table avulsa (id uuid primary key default gen_random_uuid(), nome text)')
  await expect(criar(ctx, 'avulsa', { nome: 'Padaria' })).rejects.toThrow(
    /A tabela avulsa não tem a coluna de auditoria criado_por/,
  )
})

test('tabela e coluna inexistentes sao rejeitadas com erro claro', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  await expect(criar(ctx, 'fornecedores', { nome: 'Padaria' })).rejects.toThrow(
    /Tabela desconhecida: fornecedores/,
  )
  await expect(criar(ctx, 'clientes', { nome: 'Padaria', telefone: '99999' })).rejects.toThrow(
    /Coluna desconhecida em clientes: telefone/,
  )
})

test('excluir duas vezes nao sobrescreve quem excluiu', async () => {
  const ctx = await ctxCom('admin', 'Chefe')
  const c = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria' })
  await excluir(ctx, 'clientes', c.id)
  const admin = await ctx.db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin' and nome <> 'Chefe'",
  )
  const outro: Contexto = { db: ctx.db, usuario: admin.rows[0] }
  await expect(excluir(outro, 'clientes', c.id)).rejects.toThrow(/Registro inexistente/)
  const r = await ctx.db.query<{ excluido_por: string }>(
    'select excluido_por from clientes where id = $1',
    [c.id],
  )
  expect(r.rows[0].excluido_por).toBe(ctx.usuario.id)
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h.filter((l) => l.acao === 'exclusao')).toHaveLength(1)
})

test('chave com valor undefined e ignorada, null explicito limpa', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar<{ id: string; cnpj: string | null }>(ctx, 'clientes', {
    nome: 'Padaria',
    uf: 'AL',
    cnpj: undefined,
  })
  expect(c.cnpj).toBeNull()
  const igual = await alterar<{ uf: string | null; atualizado_em: Date | null }>(
    ctx,
    'clientes',
    c.id,
    { uf: undefined },
  )
  expect(igual.uf).toBe('AL')
  expect(igual.atualizado_em).toBeNull()
  expect(await historicoDe(ctx.db, 'clientes', c.id)).toHaveLength(1)
  const limpo = await alterar<{ uf: string | null }>(ctx, 'clientes', c.id, { uf: null })
  expect(limpo.uf).toBeNull()
})

test('usuario inativo nao escreve', async () => {
  const base = await ctxCom('admin', 'Chefe')
  const ctx: Contexto = { db: base.db, usuario: { ...base.usuario, ativo: false } }
  await expect(criar(ctx, 'clientes', { nome: 'Padaria' })).rejects.toThrow(SemPermissao)
  await expect(criar(ctx, 'clientes', { nome: 'Padaria' })).rejects.toThrow(/está inativo/)
  const r = await base.db.query('select count(*)::int as n from clientes')
  expect(r.rows[0]).toEqual({ n: 0 })
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
