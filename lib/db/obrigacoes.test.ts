import { PGlite } from '@electric-sql/pglite'
import { beforeEach, expect, test, vi } from 'vitest'
import { type Contexto } from '@/lib/db/escrita'
import { historicoDe } from '@/lib/db/historico'
import { migrar } from '@/lib/db/migrar'
import { vencimentosDaObrigacao } from '@/lib/regras/vencimentos'
import type { Usuario } from '@/lib/tipos'

// As Server Actions pegam o contexto pelo cookie, que não existe fora de uma requisição:
// o teste entrega o contexto que quiser, e o resto (helper de escrita, banco) é de verdade.
let ctx: Contexto
vi.mock('@/lib/usuario-atual', () => ({ contextoAtual: async () => ctx }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { alterarObrigacao, criarObrigacao } from '@/app/(painel)/cadastros/obrigacoes/acoes'
import { validarObrigacao } from '@/app/(painel)/cadastros/obrigacoes/validacao'
import { listarObrigacoes } from './obrigacoes'

// Campo repetido (meses, regimes) vira lista de valores, como as caixas de marcação do navegador.
function formulario(campos: Record<string, string | string[]>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) f.append(k, item)
  return f
}

const DAS = {
  nome: 'DAS',
  esfera: 'federal',
  periodicidade: 'mensal',
  regra_dia_nao_util: 'posterga',
  dia_vencimento: '20',
  competencia_defasagem: '1',
}

beforeEach(async () => {
  const db = new PGlite()
  await migrar(db)
  const admin = await db.query<Usuario>(
    "select id, nome, email, papel, ativo from usuarios where papel = 'admin'",
  )
  ctx = { db, usuario: admin.rows[0] }
})

test('obrigacao volta no formato que o calculo consome', async () => {
  expect(
    await criarObrigacao(
      formulario({
        nome: 'IRPJ trimestral',
        esfera: 'federal',
        periodicidade: 'trimestral',
        meses: ['1', '4', '7', '10'],
        regra_dia_nao_util: 'antecipa',
        dia_vencimento: '31',
        competencia_defasagem: '1',
        regimes_aplicaveis: ['presumido', 'real'],
        base_legal: 'Lei 9.430/1996',
      }),
    ),
  ).toEqual({ ok: true })
  expect(await criarObrigacao(formulario(DAS))).toEqual({ ok: true })
  expect(
    await criarObrigacao(
      formulario({
        ...DAS,
        nome: 'EFD-Contribuições',
        regra_dia_nao_util: 'dia_util_n',
        dia_util_n: '10',
        dia_vencimento: '',
        competencia_defasagem: '2',
      }),
    ),
  ).toEqual({ ok: true })

  const lista = await listarObrigacoes(ctx.db)
  const por = (nome: string) => lista.find((o) => o.nome === nome)!
  // camelCase e meses como number[] (trimestral) ou null (mensal): o que `vencimentosDaObrigacao` lê.
  expect(por('IRPJ trimestral')).toMatchObject({
    esfera: 'federal',
    periodicidade: 'trimestral',
    diaVencimento: 31,
    meses: [1, 4, 7, 10],
    regraDiaNaoUtil: 'antecipa',
    diaUtilN: null,
    competenciaDefasagem: 1,
    regimesAplicaveis: ['presumido', 'real'],
    baseLegal: 'Lei 9.430/1996',
    ativo: true,
  })
  expect(por('DAS')).toMatchObject({ meses: null, diaVencimento: 20, diaUtilN: null, regraDiaNaoUtil: 'posterga' })
  expect(por('EFD-Contribuições')).toMatchObject({ diaVencimento: null, diaUtilN: 10, competenciaDefasagem: 2 })
  // O resultado entra direto no cálculo: trimestral vence nos quatro meses cadastrados, mensal em todos.
  const ano = { de: { ano: 2027, mes: 1 }, ate: { ano: 2027, mes: 12 } }
  expect(vencimentosDaObrigacao(por('IRPJ trimestral'), ano.de, ano.ate, new Set())).toHaveLength(4)
  expect(vencimentosDaObrigacao(por('DAS'), ano.de, ano.ate, new Set())).toHaveLength(12)
  expect(vencimentosDaObrigacao(por('EFD-Contribuições'), ano.de, ano.ate, new Set())).toHaveLength(12)
})

test('trimestral sem meses e recusada com mensagem em portugues', async () => {
  const trimestral = { ...DAS, periodicidade: 'trimestral' }
  const r = await criarObrigacao(formulario(trimestral))
  expect(r).toEqual({ erro: expect.stringMatching(/meses/) })
  expect(await criarObrigacao(formulario({ ...trimestral, periodicidade: 'anual' }))).toEqual({
    erro: expect.stringMatching(/meses/),
  })
  // Mês fora de 1..12 também não passa; mensal nunca guarda meses, mesmo que cheguem.
  expect(await criarObrigacao(formulario({ ...trimestral, meses: ['0', '13'] }))).toEqual({
    erro: expect.stringMatching(/meses/),
  })
  expect(validarObrigacao({ periodicidade: 'anual', meses: [] })).toMatch(/meses/)
  expect(validarObrigacao({ periodicidade: 'anual', meses: [5] })).toBeNull()
  expect(await listarObrigacoes(ctx.db, { incluirInativos: true })).toHaveLength(0)
  expect(await criarObrigacao(formulario({ ...DAS, meses: ['3'] }))).toEqual({ ok: true })
  expect((await listarObrigacoes(ctx.db))[0].meses).toBeNull()
})

test('dia_util_n sem o N e recusada com mensagem em portugues', async () => {
  const semN = { ...DAS, regra_dia_nao_util: 'dia_util_n', dia_vencimento: '' }
  expect(await criarObrigacao(formulario(semN))).toEqual({ erro: expect.stringMatching(/dia útil/) })
  expect(validarObrigacao({ regra_dia_nao_util: 'dia_util_n', dia_util_n: null })).toMatch(/dia útil/)
  expect(await listarObrigacoes(ctx.db)).toHaveLength(0)

  // Trocar a regra de uma obrigação existente limpa um campo e preenche o outro na mesma gravação,
  // senão o check do banco recusaria: dia_util_n -> antecipa e de volta.
  expect(await criarObrigacao(formulario({ ...semN, dia_util_n: '10' }))).toEqual({ ok: true })
  const [o] = await listarObrigacoes(ctx.db)
  expect(o).toMatchObject({ regraDiaNaoUtil: 'dia_util_n', diaUtilN: 10, diaVencimento: null })
  const paraAntecipa = { ...DAS, regra_dia_nao_util: 'antecipa', dia_vencimento: '25' }
  expect(await alterarObrigacao(o.id, formulario(paraAntecipa))).toEqual({ ok: true })
  expect((await listarObrigacoes(ctx.db))[0]).toMatchObject({
    regraDiaNaoUtil: 'antecipa',
    diaVencimento: 25,
    diaUtilN: null,
  })
  expect(await alterarObrigacao(o.id, formulario({ ...semN, dia_util_n: '5' }))).toEqual({ ok: true })
  expect((await listarObrigacoes(ctx.db))[0]).toMatchObject({ diaVencimento: null, diaUtilN: 5 })
  const [ultima] = await historicoDe(ctx.db, 'obrigacoes', o.id)
  expect(ultima.camposAlterados).toMatchObject({
    regra_dia_nao_util: { antes: 'antecipa', depois: 'dia_util_n' },
    dia_vencimento: { antes: 25, depois: null },
    dia_util_n: { antes: null, depois: 5 },
  })
})

test('dia de vencimento fora de 1..31 e recusado', async () => {
  for (const dia of ['0', '32', '-3']) {
    expect(await criarObrigacao(formulario({ ...DAS, dia_vencimento: dia }))).toEqual({
      erro: expect.stringMatching(/dia do vencimento/),
    })
  }
  expect(await criarObrigacao(formulario({ ...DAS, dia_vencimento: '' }))).toEqual({
    erro: expect.stringMatching(/dia do vencimento/),
  })
  expect(validarObrigacao({ regra_dia_nao_util: 'posterga', dia_vencimento: 31 })).toBeNull()
  expect(await listarObrigacoes(ctx.db, { incluirInativos: true })).toHaveLength(0)
  // Na alteração vale o mesmo, e a obrigação existente não é tocada.
  expect(await criarObrigacao(formulario(DAS))).toEqual({ ok: true })
  const [o] = await listarObrigacoes(ctx.db)
  expect(await alterarObrigacao(o.id, formulario({ ...DAS, dia_vencimento: '45' }))).toEqual({
    erro: expect.stringMatching(/dia do vencimento/),
  })
  expect((await listarObrigacoes(ctx.db))[0].diaVencimento).toBe(20)
})
