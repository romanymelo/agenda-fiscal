import { expect, test } from 'vitest'
import type { Processo } from '../tipos'
import { agrupar, filtrar, lerFiltros, ordenar, resumoDosFiltros, type FiltrosRelatorio } from './relatorio-processos'

const HOJE = '2026-10-21'

function proc(n: string, campos: Partial<Processo> = {}): Processo {
  return {
    id: n,
    clienteId: `c-${campos.clienteNome ?? 'A'}`,
    clienteNome: 'A',
    tipo: 'Impugnação',
    orgao: 'SEFAZ-AL',
    protocolo: null,
    status: 'em_andamento',
    dataAbertura: '2026-09-01',
    prazo: null,
    prazoDescricao: null,
    atualizadoEm: null,
    concluidoEm: null,
    ...campos,
  }
}

const padrao = (extra: Partial<FiltrosRelatorio> = {}): FiltrosRelatorio => ({ ...lerFiltros({ gerar: '1' }), ...extra })

test('sem opcoes na URL: situacoes abertas e os padroes', () => {
  expect(lerFiltros({})).toEqual({
    situacoes: ['em_andamento', 'aguardando_orgao', 'em_exigencia'],
    clienteId: '',
    prazo: 'todos',
    ordem: 'prazo',
    agrupar: 'nada',
    conteudo: 'resumo',
    orientacao: 'retrato',
    busca: '',
  })
})

test('com gerar, vale o que foi marcado; nada marcado e todas; valor desconhecido volta ao padrao', () => {
  expect(lerFiltros({ gerar: '1', situacao: ['concluido', 'em_andamento', 'xyz'] }).situacoes).toEqual(['em_andamento', 'concluido'])
  expect(lerFiltros({ gerar: '1' }).situacoes).toEqual([])
  const f = lerFiltros({ gerar: '1', prazo: 'ontem', ordem: 'cor', agrupar: ['cliente', 'situacao'], orientacao: 'paisagem', busca: '  sefaz ' })
  expect([f.prazo, f.ordem, f.agrupar, f.orientacao, f.busca]).toEqual(['todos', 'prazo', 'cliente', 'paisagem', 'sefaz'])
})

test('filtra por situacao e por cliente', () => {
  const lista = [proc('1'), proc('2', { status: 'concluido' }), proc('3', { clienteNome: 'B', clienteId: 'c-B' })]
  expect(filtrar(lista, padrao({ situacoes: ['concluido'] }), HOJE).map((p) => p.id)).toEqual(['2'])
  expect(filtrar(lista, padrao({ situacoes: [] }), HOJE)).toHaveLength(3)
  expect(filtrar(lista, padrao({ clienteId: 'c-B' }), HOJE).map((p) => p.id)).toEqual(['3'])
})

test('filtra por prazo: vencidos, ate 7 e 30 dias, sem prazo, e concluido nunca tem prazo pendente', () => {
  const lista = [
    proc('vencido', { prazo: '2026-10-10' }),
    proc('hoje', { prazo: '2026-10-21' }),
    proc('sete', { prazo: '2026-10-28' }),
    proc('trinta', { prazo: '2026-11-20' }),
    proc('longe', { prazo: '2026-12-31' }),
    proc('sem'),
    proc('concluido', { status: 'concluido', prazo: '2026-10-10' }),
  ]
  const ids = (prazo: FiltrosRelatorio['prazo']) => filtrar(lista, padrao({ prazo }), HOJE).map((p) => p.id)
  expect(ids('vencidos')).toEqual(['vencido'])
  expect(ids('7dias')).toEqual(['hoje', 'sete'])
  expect(ids('30dias')).toEqual(['hoje', 'sete', 'trinta'])
  expect(ids('sem')).toEqual(['sem', 'concluido'])
  expect(ids('todos')).toHaveLength(7)
})

test('ordena por prazo (sem prazo no fim), cliente, situacao e abertura', () => {
  const lista = [
    proc('sem', { clienteNome: 'Zeca' }),
    proc('tarde', { clienteNome: 'Bia', prazo: '2026-11-01', status: 'concluido' }),
    proc('cedo', { clienteNome: 'Ana', prazo: '2026-10-25', status: 'em_exigencia', dataAbertura: '2026-10-01' }),
  ]
  const ids = (o: FiltrosRelatorio['ordem']) => ordenar(lista, o).map((p) => p.id)
  // `tarde` está concluído: o prazo dele não conta, então vai junto dos sem prazo (Bia antes de Zeca).
  expect(ids('prazo')).toEqual(['cedo', 'tarde', 'sem'])
  expect(ids('cliente')).toEqual(['cedo', 'tarde', 'sem'])
  expect(ids('situacao')).toEqual(['sem', 'cedo', 'tarde'])
  expect(ids('abertura')).toEqual(['cedo', 'tarde', 'sem'])
  expect(lista.map((p) => p.id)).toEqual(['sem', 'tarde', 'cedo'])
})

test('agrupa por situacao (na ordem das colunas) e por cliente (A a Z), sem grupo vazio', () => {
  const lista = [
    proc('1', { clienteNome: 'Zeca', clienteId: 'z', status: 'concluido' }),
    proc('2', { clienteNome: 'Ana', clienteId: 'a' }),
    proc('3', { clienteNome: 'Zeca', clienteId: 'z' }),
  ]
  expect(agrupar(lista, 'nada')).toEqual([{ chave: 'todos', titulo: null, processos: lista }])
  expect(agrupar(lista, 'situacao').map((g) => [g.titulo, g.processos.map((p) => p.id)])).toEqual([
    ['Em andamento', ['2', '3']],
    ['Concluído', ['1']],
  ])
  expect(agrupar(lista, 'cliente').map((g) => [g.titulo, g.processos.map((p) => p.id)])).toEqual([
    ['Ana', ['2']],
    ['Zeca', ['1', '3']],
  ])
})

test('resumo das opcoes para o cabecalho da folha', () => {
  expect(resumoDosFiltros(lerFiltros({}), null)).toEqual([
    'Situação: Em andamento, Aguardando órgão, Em exigência',
    'Ordem: Prazo mais próximo',
  ])
  const f = padrao({ clienteId: 'x', prazo: 'vencidos', busca: 'sefaz', agrupar: 'cliente' })
  expect(resumoDosFiltros(f, 'Padaria Trigo')).toEqual([
    'Todas as situações',
    'Cliente: Padaria Trigo',
    'Prazo: Vencidos',
    'Busca: "sefaz"',
    'Ordem: Prazo mais próximo',
    'Por cliente',
  ])
})
