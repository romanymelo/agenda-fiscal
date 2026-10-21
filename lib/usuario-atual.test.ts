import { PGlite } from '@electric-sql/pglite'
import { expect, test } from 'vitest'
import { alterar, criar, excluir, type Contexto } from './db/escrita'
import { migrar } from './db/migrar'
import type { Usuario } from './tipos'
import { usuarioDoCookie } from './usuario-atual'

// Banco migrado em memória e contexto do admin inicial (migration 0002), que é quem
// pode escrever em `usuarios`.
async function bancoComAdmin(): Promise<Contexto> {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  return { db, usuario: admin.rows[0] }
}

test('usuario ativo no cookie e devolvido', async () => {
  const ctx = await bancoComAdmin()
  const u = await usuarioDoCookie(ctx.db, ctx.usuario.id)
  expect(u).toEqual({
    id: ctx.usuario.id,
    nome: 'Administrador',
    email: 'admin@escritorio.local',
    papel: 'admin',
    ativo: true,
  })
})

// Review Focus 4: a validação é condição da consulta, não filtro em memória.
test('usuario desativado depois de escolhido nao vale mais', async () => {
  const ctx = await bancoComAdmin()
  const ana = await criar<{ id: string }>(ctx, 'usuarios', {
    nome: 'Ana',
    email: 'ana@escritorio.local',
  })
  expect(await usuarioDoCookie(ctx.db, ana.id)).not.toBeNull()
  await alterar(ctx, 'usuarios', ana.id, { ativo: false })
  expect(await usuarioDoCookie(ctx.db, ana.id)).toBeNull()
})

test('usuario excluido logicamente nao vale mais', async () => {
  const ctx = await bancoComAdmin()
  const ana = await criar<{ id: string }>(ctx, 'usuarios', {
    nome: 'Ana',
    email: 'ana@escritorio.local',
  })
  await excluir(ctx, 'usuarios', ana.id)
  expect(await usuarioDoCookie(ctx.db, ana.id)).toBeNull()
})

test('cookie com id inexistente devolve null', async () => {
  const ctx = await bancoComAdmin()
  expect(await usuarioDoCookie(ctx.db, '2f6c1b90-7d4e-4a1c-8b35-9e0f2a7c4d11')).toBeNull()
})

test('sem cookie devolve null', async () => {
  const ctx = await bancoComAdmin()
  expect(await usuarioDoCookie(ctx.db, undefined)).toBeNull()
})
