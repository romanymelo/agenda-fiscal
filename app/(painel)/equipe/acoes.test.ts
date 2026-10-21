import { PGlite } from '@electric-sql/pglite'
import { beforeEach, expect, test, vi } from 'vitest'
import { criar, type Contexto } from '@/lib/db/escrita'
import { migrar } from '@/lib/db/migrar'
import type { Usuario } from '@/lib/tipos'

// As Server Actions pegam o contexto pelo cookie, que não existe fora de uma requisição:
// o teste entrega o contexto que quiser, e o resto (helper de escrita, banco) é de verdade.
let ctx: Contexto
vi.mock('@/lib/usuario-atual', () => ({ contextoAtual: async () => ctx }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { alterarUsuario, criarUsuario, desativarUsuario } from './acoes'

function formulario(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  ctx = { db, usuario: admin.rows[0] }
})

test('admin cadastra usuario e a acao fica no historico', async () => {
  const r = await criarUsuario(formulario({ nome: 'Ana', email: 'ana@escritorio.local', papel: 'membro' }))
  expect(r).toEqual({ ok: true })
  const u = await ctx.db.query<{ id: string; papel: string; ativo: boolean }>(
    "select id, papel, ativo from usuarios where email = 'ana@escritorio.local'",
  )
  expect(u.rows).toHaveLength(1)
  expect(u.rows[0]).toMatchObject({ papel: 'membro', ativo: true })
  const h = await ctx.db.query<{ acao: string; usuario_nome: string }>(
    "select acao, usuario_nome from historico where tabela = 'usuarios' and registro_id = $1",
    [u.rows[0].id],
  )
  expect(h.rows).toEqual([{ acao: 'criacao', usuario_nome: 'Administrador' }])
})

test('membro recebe SemPermissao ao cadastrar usuario', async () => {
  const membro = await criar<Usuario>(ctx, 'usuarios', {
    nome: 'Bia',
    email: 'bia@escritorio.local',
    papel: 'membro',
  })
  ctx = { db: ctx.db, usuario: membro }
  // A ação devolve a mensagem para a tela em vez de lançar (brief, passo 3).
  const r = await criarUsuario(formulario({ nome: 'Caio', email: 'caio@escritorio.local', papel: 'membro' }))
  expect(r.erro).toMatch(/administrador/i)
  const n = await ctx.db.query("select 1 from usuarios where email = 'caio@escritorio.local'")
  expect(n.rows).toHaveLength(0)
})

test('email repetido devolve erro tratado, nao excecao de banco', async () => {
  const campos = { nome: 'Ana', email: 'ana@escritorio.local', papel: 'membro' }
  await criarUsuario(formulario(campos))
  const r = await criarUsuario(formulario({ ...campos, nome: 'Outra Ana' }))
  expect(r.erro).toBe('Já existe um usuário com este e-mail.')
  const alvo = await ctx.db.query<{ id: string }>("select id from usuarios where email = 'ana@escritorio.local'")
  const r2 = await alterarUsuario(alvo.rows[0].id, formulario({ email: ctx.usuario.email }))
  expect(r2.erro).toBe('Já existe um usuário com este e-mail.')
})

test('desativar nao apaga a linha', async () => {
  await criarUsuario(formulario({ nome: 'Ana', email: 'ana@escritorio.local', papel: 'membro' }))
  const alvo = await ctx.db.query<{ id: string }>("select id from usuarios where email = 'ana@escritorio.local'")
  const r = await desativarUsuario(alvo.rows[0].id)
  expect(r).toEqual({ ok: true })
  const linha = await ctx.db.query<{ ativo: boolean; excluido_em: string | null }>(
    'select ativo, excluido_em from usuarios where id = $1',
    [alvo.rows[0].id],
  )
  expect(linha.rows).toEqual([{ ativo: false, excluido_em: null }])
})
