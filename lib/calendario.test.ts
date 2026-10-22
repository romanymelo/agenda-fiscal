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

test('item do vencimento carrega os regimes aplicaveis da obrigacao (informativo)', async () => {
  await novaObrigacao({ regimes_aplicaveis: ['simples', 'mei'] })
  const r = await itensDoPeriodo(ctx.db, '2026-10-01', '2026-10-31')
  expect(r.find((i) => i.categoria === 'federal')?.regimesAplicaveis).toEqual(['simples', 'mei'])
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

test('dois feriados municipais na mesma data: so o da praca do escritorio aparece', async () => {
  await criar(ctx, 'feriados', {
    data: '2026-11-21',
    descricao: 'Emancipação de Arapiraca',
    abrangencia: 'municipal',
    uf: 'AL',
    municipio: 'Arapiraca',
  })
  await criar(ctx, 'feriados', {
    data: '2026-11-21',
    descricao: 'Aniversário de Maceió',
    abrangencia: 'municipal',
    uf: 'AL',
    municipio: 'Maceió',
  })
  // A praça do escritório (dado inicial) é AL/Maceió: na mesma data, só o feriado de Maceió aparece.
  const r = await itensDoPeriodo(ctx.db, '2026-11-01', '2026-11-30')
  const feriadosDoDia = r.filter((i) => i.categoria === 'feriado' && i.data === '2026-11-21')
  expect(feriadosDoDia).toHaveLength(1)
  expect(feriadosDoDia[0].titulo).toBe('Aniversário de Maceió')
})

test('feriados nacionais valem em qualquer ano, inclusive os moveis e fora do cadastro', async () => {
  // 2026 só tem os fixos no cadastro; 2030 não tem nada. Os dois saem da regra (Páscoa de 2030: 21/04).
  const de2026 = await itensDoPeriodo(ctx.db, '2026-02-01', '2026-06-30')
  const nomes = (itens: { categoria: string; titulo: string }[]) => itens.filter((i) => i.categoria === 'feriado').map((i) => i.titulo)
  expect(nomes(de2026)).toEqual(['Carnaval (segunda-feira)', 'Carnaval (terça-feira)', 'Sexta-feira Santa', 'Tiradentes', 'Dia do Trabalho', 'Corpus Christi'])
  const de2030 = await itensDoPeriodo(ctx.db, '2030-04-01', '2030-04-30')
  expect(de2030.filter((i) => i.categoria === 'feriado').map((i) => [i.data, i.titulo])).toEqual([
    ['2030-04-19', 'Sexta-feira Santa'],
    ['2030-04-21', 'Tiradentes'],
  ])
})

test('vencimento que cai no Carnaval e empurrado para o proximo dia util', async () => {
  // Dia 16 de fevereiro de 2026 é a segunda-feira de Carnaval; a terça também é feriado: vence na quarta, 18.
  await novaObrigacao({ nome: 'DAS Carnaval', dia_vencimento: 16, competencia_defasagem: 1 })
  const itens = await itensDoPeriodo(ctx.db, '2026-02-01', '2026-02-28')
  expect(itens.find((i) => i.titulo === 'DAS Carnaval')?.data).toBe('2026-02-18')
})
