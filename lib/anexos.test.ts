import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { criar, type Contexto } from '@/lib/db/escrita'
import { migrar } from '@/lib/db/migrar'
import type { Usuario } from '@/lib/tipos'

let ctx: Contexto
vi.mock('@/lib/usuario-atual', () => ({ contextoAtual: async () => ctx }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { enviarAnexo } from '@/app/(painel)/processos/acoes'
import { respostaDoAnexo } from './anexos'

// Grava de verdade em arquivos/ (fora do Git); cada teste apaga o que criou.
const gravados: string[] = []
afterEach(async () => {
  await Promise.all(gravados.splice(0).map((p) => rm(path.resolve('arquivos', p), { force: true })))
})

async function novoAnexo(nome: string, conteudo: string): Promise<{ id: string; caminho: string }> {
  const cliente = await criar<{ id: string }>(ctx, 'clientes', { nome: 'Padaria', regime: 'simples', uf: 'AL', municipio: 'Maceió' })
  const processo = await criar<{ id: string }>(ctx, 'processos', {
    cliente_id: cliente.id,
    tipo: 'Impugnação',
    orgao: 'SEFAZ-AL',
    data_abertura: '2026-10-05',
  })
  const form = new FormData()
  form.set('arquivo', new File([Buffer.from(conteudo)], nome))
  expect(await enviarAnexo(processo.id, form)).toEqual({ ok: true })
  const r = await ctx.db.query<{ id: string; caminho_storage: string }>('select id, caminho_storage from anexos')
  gravados.push(r.rows[0].caminho_storage)
  return { id: r.rows[0].id, caminho: r.rows[0].caminho_storage }
}

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>("select id, nome, email, papel, ativo from usuarios where papel = 'admin'")
  ctx = { db, usuario: admin.rows[0] }
})

test('baixar anexo devolve o conteudo com o nome original, inclusive com acento', async () => {
  const { id } = await novoAnexo('Notificação nº 7.pdf', 'conteudo-do-pdf')
  const r = await respostaDoAnexo(ctx.db, id)
  expect(r.status).toBe(200)
  expect(await r.text()).toBe('conteudo-do-pdf')
  const disp = r.headers.get('content-disposition') ?? ''
  expect(disp).toMatch(/^attachment;/)
  // Nome com acento: versão ASCII para clientes antigos e a versão UTF-8 codificada (RFC 5987).
  expect(disp).toContain(`filename*=UTF-8''${encodeURIComponent('Notificação nº 7.pdf')}`)
  expect(disp).not.toMatch(/[^\x20-\x7e]/)
  expect(r.headers.get('x-content-type-options')).toBe('nosniff')
})

test('id inexistente ou sem forma de uuid e recusado em portugues', async () => {
  for (const id of ['00000000-0000-4000-8000-000000000000', 'nao-e-uuid', '../../package.json']) {
    const r = await respostaDoAnexo(ctx.db, id)
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('Anexo não encontrado.')
  }
})

test('anexo excluido nao baixa, e arquivo sumido do disco da erro em portugues', async () => {
  const { id, caminho } = await novoAnexo('a.pdf', 'x')
  await rm(path.resolve('arquivos', caminho))
  const sumido = await respostaDoAnexo(ctx.db, id)
  expect(sumido.status).toBe(404)
  expect(await sumido.text()).toBe('O arquivo deste anexo não está mais no disco.')
  await ctx.db.query('update anexos set excluido_em = now() where id = $1', [id])
  expect((await respostaDoAnexo(ctx.db, id)).status).toBe(404)
})

test('caminho_storage adulterado para fora de arquivos/ e recusado mesmo que o arquivo exista', async () => {
  const { id } = await novoAnexo('a.pdf', 'x')
  const fora = path.resolve('package.json')
  expect(existsSync(fora)).toBe(true)
  for (const adulterado of ['../package.json', '..\\package.json', 'sub/../../package.json', fora]) {
    await ctx.db.query('update anexos set caminho_storage = $1 where id = $2', [adulterado, id])
    const r = await respostaDoAnexo(ctx.db, id)
    expect(r.status, adulterado).toBe(404)
    const corpo = await r.text()
    expect(corpo, adulterado).toBe('Anexo não encontrado.')
    expect(corpo).not.toContain('agenda-fiscal')
  }
})

test('ligacao dentro de arquivos/ apontando para fora e recusada (realpath)', async () => {
  const { id } = await novoAnexo('a.pdf', 'x')
  const fora = await mkdtemp(path.join(tmpdir(), 'fora-'))
  const ligacao = path.resolve('arquivos', 'ligacao-teste')
  try {
    await writeFile(path.join(fora, 'segredo.txt'), 'segredo-de-fora')
    // 'junction' vale no Windows sem privilégio; em POSIX vira ligação simbólica de pasta.
    await symlink(fora, ligacao, 'junction')
    await ctx.db.query('update anexos set caminho_storage = $1 where id = $2', ['ligacao-teste/segredo.txt', id])
    const r = await respostaDoAnexo(ctx.db, id)
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('Anexo não encontrado.')
  } finally {
    await rm(ligacao, { force: true, recursive: true })
    await rm(fora, { force: true, recursive: true })
  }
})

test('pasta irma com o mesmo prefixo (arquivos-outro/) e recusada', async () => {
  const { id } = await novoAnexo('a.pdf', 'x')
  const irma = path.resolve('arquivos-outro')
  try {
    await mkdir(irma, { recursive: true })
    await writeFile(path.join(irma, 'segredo.pdf'), 'segredo-da-irma')
    await ctx.db.query('update anexos set caminho_storage = $1 where id = $2', ['../arquivos-outro/segredo.pdf', id])
    const r = await respostaDoAnexo(ctx.db, id)
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('Anexo não encontrado.')
  } finally {
    await rm(irma, { force: true, recursive: true })
  }
})
