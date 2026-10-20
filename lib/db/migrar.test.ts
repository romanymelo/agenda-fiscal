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
