import { PGlite } from '@electric-sql/pglite'
import { beforeEach, expect, test } from 'vitest'
import { criar, excluir, type Contexto } from '@/lib/db/escrita'
import { migrar } from '@/lib/db/migrar'
import type { Usuario } from '@/lib/tipos'
import { itensDoPeriodo } from './calendario'

// Testes de leitura: inserimos direto com o helper de escrita (`criar`/`excluir`), sem passar
// pelas Server Actions — não há validação de formulário envolvida no que `itensDoPeriodo` consome.
let ctx: Contexto

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  ctx = { db, usuario: admin.rows[0] }
})

// DAS, dia 20 (terça-feira em outubro/2026: nenhuma regra de dia não útil desloca a data).
async function novaObrigacao(campos: Record<string, unknown> = {}): Promise<{ id: string }> {
  return criar(ctx, 'obrigacoes', {
    nome: 'DAS – Simples Nacional',
    esfera: 'federal',
    periodicidade: 'mensal',
    dia_vencimento: 20,
    regra_dia_nao_util: 'posterga',
    competencia_defasagem: 1,
    ...campos,
  })
}

async function novoProcesso(campos: Record<string, unknown> = {}): Promise<{ id: string }> {
  const cliente = await criar<{ id: string }>(ctx, 'clientes', {
    nome: 'Mercadinho Sol Nascente',
    regime: 'simples',
    uf: 'AL',
    municipio: 'Maceió',
  })
  return criar(ctx, 'processos', {
    cliente_id: cliente.id,
    tipo: 'Alteração contratual',
    orgao: 'Junta Comercial de AL',
    data_abertura: '2026-10-01',
    prazo: '2026-10-22',
    prazo_descricao: 'Exigência na Junta Comercial',
    ...campos,
  })
}

test('junta vencimento de obrigacao, prazo de processo e feriado', async () => {
  await novaObrigacao()
  await novoProcesso()
  // Feriado nacional de 12/10/2026 já vem dos dados iniciais (migration), na praça padrão AL/Maceió.
  const r = await itensDoPeriodo(ctx.db, '2026-10-01', '2026-10-31')
  expect(r.map((i) => [i.data, i.categoria])).toEqual([
    ['2026-10-12', 'feriado'],
    ['2026-10-20', 'federal'],
    ['2026-10-22', 'processo'],
  ])
})

test('subtitulo do vencimento traz a competencia', async () => {
  await novaObrigacao()
  const r = await itensDoPeriodo(ctx.db, '2026-10-01', '2026-10-31')
  expect(r.find((i) => i.categoria === 'federal')?.subtitulo).toBe('Competência 09/2026')
})

test('obrigacao excluida logicamente nao gera item', async () => {
  const o = await novaObrigacao()
  await excluir(ctx, 'obrigacoes', o.id)
  const r = await itensDoPeriodo(ctx.db, '2026-10-01', '2026-10-31')
  expect(r.some((i) => i.categoria === 'federal')).toBe(false)
})

test('processo concluido com prazo passado nao aparece como prazo pendente', async () => {
  await novoProcesso({ status: 'concluido' })
  const r = await itensDoPeriodo(ctx.db, '2026-10-01', '2026-10-31')
  expect(r.some((i) => i.categoria === 'processo')).toBe(false)
})

test('feriado da praca aparece; de outra praca nao', async () => {
  await criar(ctx, 'feriados', {
    data: '2026-09-17',
    descricao: 'Emancipação de Arapiraca',
    abrangencia: 'municipal',
    uf: 'AL',
    municipio: 'Arapiraca',
  })
  await criar(ctx, 'feriados', {
    data: '2026-09-08',
    descricao: 'Nossa Senhora da Conceição',
    abrangencia: 'municipal',
    uf: 'AL',
    municipio: 'Maceió',
  })
  // A praça do escritório (dado inicial) é AL/Maceió: Arapiraca fica de fora, Maceió entra.
  const r = await itensDoPeriodo(ctx.db, '2026-09-01', '2026-09-30')
  expect(r.find((i) => i.titulo.includes('Arapiraca'))).toBeUndefined()
  expect(r.find((i) => i.titulo === 'Nossa Senhora da Conceição')).toMatchObject({
    categoria: 'feriado',
    data: '2026-09-08',
  })
})
