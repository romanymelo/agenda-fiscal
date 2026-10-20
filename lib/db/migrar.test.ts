import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { expect, test } from 'vitest'
import { migrar } from './migrar'

test('migrar cria as tabelas e os dados iniciais', async () => {
  const db = new PGlite()
  await migrar(db)
  const t = await db.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public'")
  const nomes = t.rows.map(r => r.table_name)
  for (const n of ['usuarios', 'clientes', 'obrigacoes', 'feriados', 'configuracao',
                   'processos', 'andamentos', 'anexos', 'historico'])
    expect(nomes).toContain(n)

  const admin = await db.query("select papel from usuarios where papel = 'admin'")
  expect(admin.rows).toHaveLength(1)
  const cfg = await db.query<{ uf: string }>('select uf from configuracao')
  expect(cfg.rows).toEqual([{ uf: 'AL' }])
  const fer = await db.query("select 1 from feriados where data = '2026-10-12'")
  expect(fer.rows).toHaveLength(1)
})

test('migrar duas vezes nao quebra nem duplica', async () => {
  const db = new PGlite()
  await migrar(db)
  await migrar(db)
  const r = await db.query('select count(*)::int as n from usuarios')
  expect(r.rows[0]).toEqual({ n: 1 })
})

test('rls nao e aplicado localmente', async () => {
  const db = new PGlite()
  await migrar(db)
  const r = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'clientes'")
  expect(r.rows[0].relrowsecurity).toBe(false)
})

const ADMIN = '7c1a3e52-4b8d-4f0a-9e26-5d3b8a1f6c01'

test('check de feriados rejeita cadastro incoerente', async () => {
  const db = new PGlite()
  await migrar(db)
  const inserir = (abr: string, uf: string | null, mun: string | null) =>
    db.query(
      'insert into feriados (data, descricao, abrangencia, uf, municipio, criado_por) values ($1, $2, $3, $4, $5, $6)',
      ['2026-06-24', 'Teste', abr, uf, mun, ADMIN])
  await expect(inserir('nacional', 'AL', null)).rejects.toThrow()
  await expect(inserir('estadual', null, null)).rejects.toThrow()
  await expect(inserir('estadual', 'AL', 'Maceió')).rejects.toThrow()
  await expect(inserir('municipal', 'AL', null)).rejects.toThrow()
  await expect(inserir('municipal', 'AL', 'Maceió')).resolves.toBeDefined()
})

test('migration que falha no meio nao fica registrada', async () => {
  // Pasta temporária própria: a pasta real de migrations nunca é tocada.
  const dir = mkdtempSync(path.join(tmpdir(), 'migrar-'))
  try {
    writeFileSync(path.join(dir, '0001_valida.sql'), 'create table tabela_valida (a int);')
    writeFileSync(path.join(dir, '0002_invalida.sql'),
      'create table tabela_temporaria (a int); select * from tabela_que_nao_existe;')
    const db = new PGlite()
    await expect(migrar(db, dir)).rejects.toThrow()
    const reg = await db.query<{ nome: string }>('select nome from migrations_aplicadas')
    expect(reg.rows).toEqual([{ nome: '0001_valida.sql' }])
    const tab = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_name in ('tabela_valida', 'tabela_temporaria')")
    expect(tab.rows).toEqual([{ table_name: 'tabela_valida' }])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('obrigacao sem dia_vencimento e sem dia_util_n e rejeitada', async () => {
  const db = new PGlite()
  await migrar(db)
  const inserir = (regra: string, diaVenc: number | null, diaUtil: number | null) =>
    db.query(
      `insert into obrigacoes (nome, esfera, periodicidade, regra_dia_nao_util, dia_vencimento, dia_util_n, criado_por)
       values ('Teste', 'federal', 'mensal', $1, $2, $3, $4)`,
      [regra, diaVenc, diaUtil, ADMIN])
  await expect(inserir('posterga', null, null)).rejects.toThrow()
  await expect(inserir('dia_util_n', null, null)).rejects.toThrow()
  await expect(inserir('posterga', 20, null)).resolves.toBeDefined()
  await expect(inserir('dia_util_n', null, 5)).resolves.toBeDefined()
})

test('campos obrigatorios de processos e historico rejeitam nulo', async () => {
  const db = new PGlite()
  await migrar(db)
  const c = await db.query<{ id: string }>(
    "insert into clientes (nome, criado_por) values ('C', $1) returning id", [ADMIN])
  const cid = c.rows[0].id
  const proc = (orgao: string | null, abertura: string | null) =>
    db.query(
      "insert into processos (cliente_id, tipo, orgao, data_abertura, criado_por) values ($1, 'T', $2, $3, $4)",
      [cid, orgao, abertura, ADMIN])
  await expect(proc(null, '2026-01-02')).rejects.toThrow()
  await expect(proc('SEFAZ', null)).rejects.toThrow()
  await expect(proc('SEFAZ', '2026-01-02')).resolves.toBeDefined()
  await expect(db.query(
    "insert into historico (tabela, registro_id, acao, usuario_nome) values ('x', gen_random_uuid(), 'criacao', 'N')",
  )).rejects.toThrow()
})
