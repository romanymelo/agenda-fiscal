import { PGlite } from '@electric-sql/pglite'
import { beforeEach, expect, test, vi } from 'vitest'
import { criar, type Contexto } from '@/lib/db/escrita'
import { migrar } from '@/lib/db/migrar'
import { feriadosDaPraca } from '@/lib/regras/feriados-aplicaveis'
import type { Usuario } from '@/lib/tipos'

// As Server Actions pegam o contexto pelo cookie, que não existe fora de uma requisição:
// o teste entrega o contexto que quiser, e o resto (helper de escrita, banco) é de verdade.
let ctx: Contexto
vi.mock('@/lib/usuario-atual', () => ({ contextoAtual: async () => ctx }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { alterarConfiguracao, alterarFeriado, criarFeriado } from '@/app/(painel)/cadastros/feriados/acoes'
import { obterConfiguracao } from './configuracao'
import { feriadosEntre, listarFeriados } from './feriados'

function formulario(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.append(k, v)
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

const total = async () => (await ctx.db.query<{ n: number }>('select count(*)::int as n from feriados')).rows[0].n

test('feriados nacionais de 2026 vem dos dados iniciais, e o intervalo cruza o ano', async () => {
  const de2026 = await listarFeriados(ctx.db, 2026)
  expect(de2026).toContainEqual(
    expect.objectContaining({ data: '2026-10-12', descricao: 'Nossa Senhora Aparecida', abrangencia: 'nacional', uf: null, municipio: null }),
  )
  expect(de2026.every((f) => f.data.startsWith('2026-'))).toBe(true)
  // "Próximos 7 dias" no fim de dezembro: o 1º de janeiro tem de entrar, e vem no formato que o cálculo consome.
  const virada = await feriadosEntre(ctx.db, '2026-12-28', '2027-01-03')
  expect(virada.map((f) => f.data)).toEqual(['2027-01-01'])
  expect(feriadosDaPraca(virada, { uf: 'AL', municipio: 'Maceió' }).has('2027-01-01')).toBe(true)
})

test('estadual sem uf e recusado com mensagem em portugues', async () => {
  const antes = await total()
  const r = await criarFeriado(
    formulario({ data: '2026-06-24', descricao: 'São João', abrangencia: 'estadual', uf: '' }),
  )
  expect(r.ok).toBeUndefined()
  expect(r.erro).toBe('Informe a UF do feriado estadual.')
  expect(await total()).toBe(antes)
})

test('municipal sem municipio e recusado com mensagem em portugues', async () => {
  const antes = await total()
  const r = await criarFeriado(
    formulario({ data: '2026-12-08', descricao: 'Nossa Senhora da Conceição', abrangencia: 'municipal', uf: 'AL', municipio: '  ' }),
  )
  expect(r.ok).toBeUndefined()
  expect(r.erro).toBe('Informe o município do feriado municipal.')
  expect(await total()).toBe(antes)
})

test('feriado de outra praca nao entra no conjunto do calculo, e trocar a abrangencia o faz entrar', async () => {
  const praca = await obterConfiguracao(ctx.db)
  expect(praca).toMatchObject({ uf: 'AL', municipio: 'Maceió' })
  const arapiraca = { data: '2026-09-17', descricao: 'Emancipação de Arapiraca', abrangencia: 'municipal', uf: 'AL', municipio: 'Arapiraca' }
  expect(await criarFeriado(formulario(arapiraca))).toEqual({ ok: true })
  // "Maceio" sem acento casa com "Maceió" (spec 7.1).
  expect(await criarFeriado(formulario({ ...arapiraca, data: '2026-12-08', descricao: 'Conceição', municipio: 'Maceio' }))).toEqual({ ok: true })

  const cadastrados = await listarFeriados(ctx.db, 2026)
  const datas = feriadosDaPraca(cadastrados, praca)
  expect(datas.has('2026-09-17')).toBe(false)
  expect(datas.has('2026-12-08')).toBe(true)

  // Municipal para nacional: uf e município têm de ser limpos na mesma gravação, ou o check do banco recusa.
  const id = cadastrados.find((f) => f.data === '2026-09-17')!.id
  expect(await alterarFeriado(id, formulario({ ...arapiraca, abrangencia: 'nacional', uf: '', municipio: '' }))).toEqual({ ok: true })
  const depois = (await listarFeriados(ctx.db, 2026)).find((f) => f.id === id)!
  expect(depois).toMatchObject({ abrangencia: 'nacional', uf: null, municipio: null })
  expect(feriadosDaPraca(await listarFeriados(ctx.db, 2026), praca).has('2026-09-17')).toBe(true)
})

test('membro nao altera a configuracao', async () => {
  const membro = await criar<Usuario>(ctx, 'usuarios', { nome: 'Bia', email: 'bia@escritorio.local', papel: 'membro' })
  ctx = { db: ctx.db, usuario: membro }
  const r = await alterarConfiguracao(formulario({ uf: 'SP', municipio: 'São Paulo' }))
  expect(r.ok).toBeUndefined()
  expect(r.erro).toMatch(/administrador/i)
  expect(await obterConfiguracao(ctx.db)).toMatchObject({ uf: 'AL', municipio: 'Maceió' })
})

test('uf que nao existe e recusada no feriado e na praca, em vez de nunca casar com praca nenhuma', async () => {
  const antes = await total()
  const feriado = await criarFeriado(
    formulario({ data: '2026-06-24', descricao: 'São João', abrangencia: 'estadual', uf: 'xy' }),
  )
  expect(feriado.erro).toBe('Informe uma UF válida, como AL.')
  expect(await total()).toBe(antes)
  expect((await alterarConfiguracao(formulario({ uf: 'XY', municipio: 'Maceió' }))).erro).toBe('Informe uma UF válida, como AL.')
  expect(await obterConfiguracao(ctx.db)).toMatchObject({ uf: 'AL', municipio: 'Maceió' })
  // As 27 existem: minúscula é aceita e gravada em maiúscula.
  expect(await criarFeriado(formulario({ data: '2026-06-24', descricao: 'São João', abrangencia: 'estadual', uf: 'pe' }))).toEqual({ ok: true })
  expect((await listarFeriados(ctx.db, 2026)).find((f) => f.descricao === 'São João')).toMatchObject({ uf: 'PE' })
})
