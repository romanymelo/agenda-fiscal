import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
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
  alterarProcesso,
  criarProcesso,
  enviarAnexo,
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

// enviarAnexo grava de verdade em arquivos/ (fora do Git): cada teste apaga o que criou.
afterEach(async () => {
  const r = await ctx.db.query<{ caminho_storage: string }>('select caminho_storage from anexos')
  await Promise.all(r.rows.map((l) => rm(path.resolve('arquivos', l.caminho_storage), { force: true })))
})

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

test('enviarAnexo grava com nome gerado e preserva o nome original so na coluna', async () => {
  const id = await novoProcesso(await novoCliente('Padaria Trigo de Ouro'))
  const form = new FormData()
  // Nome hostil, como se chegasse ao servidor com caminho (o File do Node não o tira).
  form.set('arquivo', new File([Buffer.from('conteudo-do-auto')], '../../Auto de Infração.pdf'))
  expect(await enviarAnexo(id, form)).toEqual({ ok: true })

  const [anexo] = (await buscarProcesso(ctx.db, id))!.anexos
  // O nome da tela é o que a pessoa enviou, sem o caminho; nunca o nome de disco.
  expect(anexo.nomeArquivo).toBe('Auto de Infração.pdf')
  expect(anexo.caminhoStorage).toMatch(/^[0-9a-f-]{36}\.pdf$/)
  expect(anexo.caminhoStorage).not.toContain('Auto')
  const dentro = path.resolve('arquivos', anexo.caminhoStorage)
  expect(dentro.startsWith(path.resolve('arquivos') + path.sep)).toBe(true)
  expect((await readFile(dentro)).toString()).toBe('conteudo-do-auto')
  // Anexo gera a linha de histórico de criação, com o nome de quem enviou.
  const h = await ctx.db.query<{ usuario_nome: string }>("select usuario_nome from historico where tabela = 'anexos' and acao = 'criacao'")
  expect(h.rows.map((l) => l.usuario_nome)).toEqual([ctx.usuario.nome])
})

test('enviarAnexo recusa extensao fora da lista, arquivo vazio e processo inexistente, sem gravar nada', async () => {
  const id = await novoProcesso(await novoCliente('Padaria Trigo de Ouro'))
  const com = (nome: string, conteudo: string) => {
    const f = new FormData()
    f.set('arquivo', new File([Buffer.from(conteudo)], nome))
    return f
  }
  expect(await enviarAnexo(id, com('programa.exe', 'MZ'))).toEqual({ erro: expect.stringMatching(/Tipo de arquivo não aceito/) })
  expect(await enviarAnexo(id, com('vazio.pdf', ''))).toEqual({ erro: 'Escolha um arquivo para anexar.' })
  expect(await enviarAnexo(id, new FormData())).toEqual({ erro: 'Escolha um arquivo para anexar.' })
  expect(await enviarAnexo('00000000-0000-4000-8000-000000000000', com('a.pdf', 'x'))).toEqual({
    erro: 'Processo não encontrado.',
  })
  expect((await ctx.db.query('select 1 from anexos')).rows).toHaveLength(0)
})

test('alterarProcesso muda os dados e grava a alteracao no historico so com o que mudou', async () => {
  const antigo = await novoCliente('Padaria Trigo de Ouro')
  const novo = await novoCliente('Oficina Boa Viagem')
  const id = await novoProcesso(antigo, { protocolo: 'AI 1', prazo: '2026-10-30', prazo_descricao: 'Prazo de impugnação' })

  const r = await alterarProcesso(
    id,
    formulario({
      cliente_id: novo,
      tipo: 'Impugnação de auto de infração',
      orgao: 'SEFAZ-AL',
      protocolo: '',
      data_abertura: '2026-10-05',
      prazo: '2026-11-10',
      prazo_descricao: 'Prazo de impugnação',
    }),
  )
  expect(r).toEqual({ ok: true })

  const p = (await buscarProcesso(ctx.db, id))!
  expect([p.clienteId, p.clienteNome, p.protocolo, p.prazo]).toEqual([novo, 'Oficina Boa Viagem', null, '2026-11-10'])
  const [maisRecente] = await historicoDe(ctx.db, 'processos', id)
  expect(maisRecente.acao).toBe('alteracao')
  expect(maisRecente.usuarioNome).toBe(ctx.usuario.nome)
  // Só o que mudou entra no histórico; tipo, órgão e descrição do prazo ficaram como estavam.
  expect(maisRecente.camposAlterados).toEqual({
    cliente_id: { antes: antigo, depois: novo },
    protocolo: { antes: 'AI 1', depois: null },
    prazo: { antes: '2026-10-30', depois: '2026-11-10' },
  })
  // Recusas: cliente inexistente, órgão apagado, data impossível; o processo não muda.
  const recusa = async (campos: Record<string, string>) =>
    (await alterarProcesso(id, formulario(campos))).erro
  expect(await recusa({ cliente_id: '00000000-0000-4000-8000-000000000000' })).toBe('Cliente não encontrado.')
  expect(await recusa({ orgao: '' })).toBe('Informe o órgão.')
  expect(await recusa({ prazo: '2026-02-31' })).toBe('Informe o prazo como uma data válida.')
  expect((await buscarProcesso(ctx.db, id))!.orgao).toBe('SEFAZ-AL')
})

test('concluido em vem do historico: some ao reabrir e volta com a nova conclusao', async () => {
  const cliente = await novoCliente('Padaria Trigo Dourado')
  const id = await novoProcesso(cliente)
  expect((await buscarProcesso(ctx.db, id))?.concluidoEm).toBeNull()

  expect(await mudarStatus(id, 'concluido')).toEqual({ ok: true })
  const primeira = (await buscarProcesso(ctx.db, id))?.concluidoEm
  expect(primeira).toEqual(expect.any(String))
  // Um andamento novo mexe na última atualização, mas não na data de conclusão.
  await adicionarAndamento(id, formulario({ data: '2026-10-20', descricao: 'Retirada do comprovante' }))
  expect((await buscarProcesso(ctx.db, id))?.concluidoEm).toBe(primeira)

  expect(await mudarStatus(id, 'em_exigencia')).toEqual({ ok: true })
  expect((await buscarProcesso(ctx.db, id))?.concluidoEm).toBeNull()
  expect(await mudarStatus(id, 'concluido')).toEqual({ ok: true })
  expect(new Date((await buscarProcesso(ctx.db, id))!.concluidoEm!).getTime()).toBeGreaterThanOrEqual(
    new Date(primeira!).getTime(),
  )
})

test('andamentos de varios processos de uma vez, por processo, em ordem cronologica', async () => {
  const cliente = await novoCliente('Auto Peças Beira Mar')
  const a = await novoProcesso(cliente, { orgao: 'SEFAZ-AL' })
  const b = await novoProcesso(cliente, { orgao: 'Prefeitura' })
  const c = await novoProcesso(cliente, { orgao: 'Receita' })
  await adicionarAndamento(a, formulario({ data: '2026-10-10', descricao: 'Segundo' }))
  await adicionarAndamento(a, formulario({ data: '2026-10-05', descricao: 'Primeiro' }))
  await adicionarAndamento(b, formulario({ data: '2026-10-07', descricao: 'Só um' }))

  const { andamentosDosProcessos } = await import('./processos')
  const porProcesso = await andamentosDosProcessos(ctx.db, [a, b, c])
  expect(porProcesso[a].map((x) => x.descricao)).toEqual(['Primeiro', 'Segundo'])
  expect(porProcesso[b].map((x) => x.descricao)).toEqual(['Só um'])
  expect(porProcesso[c]).toBeUndefined()
  expect(await andamentosDosProcessos(ctx.db, [])).toEqual({})
})
