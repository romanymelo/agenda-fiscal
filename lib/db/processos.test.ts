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

import {
  adicionarAndamento,
  criarProcesso,
  excluirProcesso,
  mudarStatus,
} from '@/app/(painel)/processos/acoes'
import { buscarProcesso, listarProcessos } from './processos'

function formulario(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

async function novoCliente(nome: string): Promise<string> {
  const c = await criar<{ id: string }>(ctx, 'clientes', {
    nome,
    regime: 'simples',
    uf: 'AL',
    municipio: 'Maceió',
  })
  return c.id
}

async function novoProcesso(clienteId: string, campos: Record<string, string> = {}): Promise<string> {
  const r = await criarProcesso(
    formulario({
      cliente_id: clienteId,
      tipo: 'Impugnação de auto de infração',
      orgao: 'SEFAZ-AL',
      data_abertura: '2026-10-05',
      ...campos,
    }),
  )
  expect(r).toEqual({ ok: true })
  const todos = await listarProcessos(ctx.db)
  return todos.find((p) => p.clienteId === clienteId && p.orgao === (campos.orgao ?? 'SEFAZ-AL'))!.id
}

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  ctx = { db, usuario: admin.rows[0] }
})

test('busca acha por cliente, orgao e protocolo', async () => {
  const padaria = await novoCliente('Padaria Trigo de Ouro')
  const clinica = await novoCliente('Clínica Vida Plena')
  const oficina = await novoCliente('Oficina Boa Viagem')
  await novoProcesso(padaria, { orgao: 'SEFAZ-AL', protocolo: 'AI 0000123-4/2026' })
  await novoProcesso(clinica, { orgao: 'Receita Federal', protocolo: 'PER 12345' })
  await novoProcesso(oficina, { orgao: 'Prefeitura de Maceió', protocolo: 'PM 2026/33901' })
  // Um resultado cada, sem diferenciar caixa nem acento.
  expect((await listarProcessos(ctx.db, 'TRIGO')).map((p) => p.clienteNome)).toEqual(['Padaria Trigo de Ouro'])
  expect((await listarProcessos(ctx.db, 'receita')).map((p) => p.clienteNome)).toEqual(['Clínica Vida Plena'])
  expect((await listarProcessos(ctx.db, '33901')).map((p) => p.clienteNome)).toEqual(['Oficina Boa Viagem'])
  expect((await listarProcessos(ctx.db, 'clinica')).map((p) => p.clienteNome)).toEqual(['Clínica Vida Plena'])
  expect(await listarProcessos(ctx.db, 'nao existe')).toHaveLength(0)
  expect(await listarProcessos(ctx.db)).toHaveLength(3)
})

test('mudar status registra alteracao no historico com o nome do usuario', async () => {
  const cliente = await novoCliente('Mercadinho Sol Nascente')
  const id = await novoProcesso(cliente)
  await criar(ctx, 'usuarios', { nome: 'Bia', email: 'bia@escritorio.local', papel: 'membro', ativo: true })
  const bia = (
    await ctx.db.query<Usuario>("select id, nome, email, papel, ativo from usuarios where nome = 'Bia'")
  ).rows[0]
  ctx = { db: ctx.db, usuario: bia }

  expect(await mudarStatus(id, 'em_exigencia')).toEqual({ ok: true })

  expect((await buscarProcesso(ctx.db, id))?.status).toBe('em_exigencia')
  const [maisRecente] = await historicoDe(ctx.db, 'processos', id)
  expect(maisRecente.acao).toBe('alteracao')
  expect(maisRecente.usuarioNome).toBe('Bia')
  expect(maisRecente.camposAlterados).toEqual({ status: { antes: 'em_andamento', depois: 'em_exigencia' } })
  // Situação que não existe é recusada, e o processo fica como estava.
  expect(await mudarStatus(id, 'arquivado')).toEqual({ erro: expect.any(String) })
  expect((await buscarProcesso(ctx.db, id))?.status).toBe('em_exigencia')
})

test('andamento aparece em ordem cronologica no detalhe', async () => {
  const cliente = await novoCliente('Distribuidora Litoral')
  const id = await novoProcesso(cliente)
  // Registrados fora de ordem: a linha do tempo ordena pela data do andamento, não pela do registro.
  expect(await adicionarAndamento(id, formulario({ data: '2026-10-15', descricao: 'Levantamento iniciado' }))).toEqual({
    ok: true,
  })
  expect(await adicionarAndamento(id, formulario({ data: '2026-10-13', descricao: 'Intimação recebida' }))).toEqual({
    ok: true,
  })
  const detalhe = await buscarProcesso(ctx.db, id)
  expect(detalhe?.andamentos.map((a) => [a.data, a.descricao])).toEqual([
    ['2026-10-13', 'Intimação recebida'],
    ['2026-10-15', 'Levantamento iniciado'],
  ])
  expect(detalhe?.andamentos[0].criadoPorNome).toBe(ctx.usuario.nome)
})

test('membro nao exclui processo', async () => {
  const cliente = await novoCliente('Construtora Mar Azul')
  const id = await novoProcesso(cliente)
  await criar(ctx, 'usuarios', { nome: 'Bia', email: 'bia@escritorio.local', papel: 'membro', ativo: true })
  const bia = (
    await ctx.db.query<Usuario>("select id, nome, email, papel, ativo from usuarios where nome = 'Bia'")
  ).rows[0]
  ctx = { db: ctx.db, usuario: bia }

  // A ação devolve a mensagem em português (SemPermissao traduzida), como as outras telas.
  expect(await excluirProcesso(id)).toEqual({ erro: 'Só o administrador pode excluir registros.' })
  expect(await buscarProcesso(ctx.db, id)).not.toBeNull()
})
