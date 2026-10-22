import { ROTULO_STATUS, type Data, type Processo, type StatusProcesso } from '../tipos'
import { diasAte } from './prazo'

// Regras do relatório de processos: ler as opções da URL e filtrar, ordenar e agrupar a lista.
// Tudo puro (sem banco), para testar sem montar nada: a página só junta as peças.

/** A ordem das colunas do quadro; é também a ordem de "situação" no relatório. */
export const ORDEM_STATUS: StatusProcesso[] = ['em_andamento', 'aguardando_orgao', 'em_exigencia', 'concluido']
/** O que o relatório mostra quando a pessoa ainda não escolheu: tudo que não foi concluído. */
const ABERTAS: StatusProcesso[] = ORDEM_STATUS.slice(0, 3)

type Opcao<T extends string> = { valor: T; rotulo: string }

export const OPCOES_PRAZO: Opcao<'todos' | 'vencidos' | '7dias' | '30dias' | 'sem'>[] = [
  { valor: 'todos', rotulo: 'Qualquer prazo' },
  { valor: 'vencidos', rotulo: 'Vencidos' },
  { valor: '7dias', rotulo: 'Vencem em até 7 dias' },
  { valor: '30dias', rotulo: 'Vencem em até 30 dias' },
  { valor: 'sem', rotulo: 'Sem prazo pendente' },
]
export const OPCOES_ORDEM: Opcao<'prazo' | 'cliente' | 'situacao' | 'abertura'>[] = [
  { valor: 'prazo', rotulo: 'Prazo mais próximo' },
  { valor: 'cliente', rotulo: 'Cliente (A a Z)' },
  { valor: 'situacao', rotulo: 'Situação' },
  { valor: 'abertura', rotulo: 'Abertura (mais recente)' },
]
export const OPCOES_AGRUPAR: Opcao<'nada' | 'situacao' | 'cliente'>[] = [
  { valor: 'nada', rotulo: 'Sem agrupar' },
  { valor: 'situacao', rotulo: 'Por situação' },
  { valor: 'cliente', rotulo: 'Por cliente' },
]
export const OPCOES_CONTEUDO: Opcao<'resumo' | 'ultimo' | 'todos'>[] = [
  { valor: 'resumo', rotulo: 'Só os dados do processo' },
  { valor: 'ultimo', rotulo: 'Com o último andamento' },
  { valor: 'todos', rotulo: 'Com todos os andamentos' },
]
export const OPCOES_ORIENTACAO: Opcao<'retrato' | 'paisagem'>[] = [
  { valor: 'retrato', rotulo: 'Retrato' },
  { valor: 'paisagem', rotulo: 'Paisagem' },
]

export type FiltrosRelatorio = {
  /** Vazio quer dizer todas as situações. */
  situacoes: StatusProcesso[]
  clienteId: string
  prazo: (typeof OPCOES_PRAZO)[number]['valor']
  ordem: (typeof OPCOES_ORDEM)[number]['valor']
  agrupar: (typeof OPCOES_AGRUPAR)[number]['valor']
  conteudo: (typeof OPCOES_CONTEUDO)[number]['valor']
  orientacao: (typeof OPCOES_ORIENTACAO)[number]['valor']
  busca: string
}

type Parametros = { [chave: string]: string | string[] | undefined }

const lista = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v === undefined ? [] : [v])
const primeiro = (v: string | string[] | undefined) => lista(v)[0]

function escolha<T extends string>(valor: string | undefined, opcoes: Opcao<T>[], padrao: T): T {
  return opcoes.find((o) => o.valor === valor)?.valor ?? padrao
}

/**
 * Lê as opções da URL. Valor que não existe volta ao padrão, sem erro. Sem `gerar` na URL (primeira visita)
 * valem as situações abertas; com `gerar`, vale o que foi marcado, e nada marcado significa todas.
 */
export function lerFiltros(params: Parametros): FiltrosRelatorio {
  const marcadas = lista(params.situacao).filter((s): s is StatusProcesso => ORDEM_STATUS.includes(s as StatusProcesso))
  return {
    situacoes: params.gerar === undefined ? ABERTAS : ORDEM_STATUS.filter((s) => marcadas.includes(s)),
    clienteId: primeiro(params.cliente)?.trim() ?? '',
    prazo: escolha(primeiro(params.prazo), OPCOES_PRAZO, 'todos'),
    ordem: escolha(primeiro(params.ordem), OPCOES_ORDEM, 'prazo'),
    agrupar: escolha(primeiro(params.agrupar), OPCOES_AGRUPAR, 'nada'),
    conteudo: escolha(primeiro(params.conteudo), OPCOES_CONTEUDO, 'resumo'),
    orientacao: escolha(primeiro(params.orientacao), OPCOES_ORIENTACAO, 'retrato'),
    busca: primeiro(params.busca)?.trim() ?? '',
  }
}

/** Concluído não tem prazo pendente (como no calendário e no quadro): o prazo só conta enquanto vale. */
export const prazoPendente = (p: Processo): Data | null => (p.status === 'concluido' ? null : p.prazo)

/** A busca por texto é feita no banco (`processosDaTela`); aqui ficam as demais opções. */
export function filtrar(processos: Processo[], f: FiltrosRelatorio, hoje: Data): Processo[] {
  return processos.filter((p) => {
    if (f.situacoes.length > 0 && !f.situacoes.includes(p.status)) return false
    if (f.clienteId && p.clienteId !== f.clienteId) return false
    const prazo = prazoPendente(p)
    if (f.prazo === 'sem') return prazo === null
    if (f.prazo === 'todos') return true
    if (prazo === null) return false
    const dias = diasAte(hoje, prazo)
    if (f.prazo === 'vencidos') return dias < 0
    return dias >= 0 && dias <= (f.prazo === '7dias' ? 7 : 30)
  })
}

const porPrazo = (a: Processo, b: Processo): number => {
  const pa = prazoPendente(a)
  const pb = prazoPendente(b)
  if (pa !== pb) return pa === null ? 1 : pb === null ? -1 : pa < pb ? -1 : 1
  return a.clienteNome.localeCompare(b.clienteNome, 'pt-BR')
}

export function ordenar(processos: Processo[], ordem: FiltrosRelatorio['ordem']): Processo[] {
  const copia = [...processos]
  if (ordem === 'cliente')
    return copia.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR') || porPrazo(a, b))
  if (ordem === 'situacao')
    return copia.sort((a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status) || porPrazo(a, b))
  if (ordem === 'abertura')
    return copia.sort((a, b) => (a.dataAbertura === b.dataAbertura ? porPrazo(a, b) : a.dataAbertura < b.dataAbertura ? 1 : -1))
  return copia.sort(porPrazo)
}

export type Grupo = { chave: string; titulo: string | null; processos: Processo[] }

/** Divide a lista (já ordenada) em grupos, mantendo a ordem dentro de cada um. Sem agrupar, é um grupo sem título. */
export function agrupar(processos: Processo[], por: FiltrosRelatorio['agrupar']): Grupo[] {
  if (por === 'nada') return [{ chave: 'todos', titulo: null, processos }]
  if (por === 'situacao')
    return ORDEM_STATUS.map((s) => ({ chave: s, titulo: ROTULO_STATUS[s], processos: processos.filter((p) => p.status === s) })).filter(
      (g) => g.processos.length > 0,
    )
  const porCliente = new Map<string, Grupo>()
  for (const p of processos) {
    const g = porCliente.get(p.clienteId) ?? { chave: p.clienteId, titulo: p.clienteNome, processos: [] }
    g.processos.push(p)
    porCliente.set(p.clienteId, g)
  }
  return [...porCliente.values()].sort((a, b) => a.titulo!.localeCompare(b.titulo!, 'pt-BR'))
}

/** As opções escolhidas, em frases curtas, para constar no cabeçalho da folha impressa. */
export function resumoDosFiltros(f: FiltrosRelatorio, nomeDoCliente: string | null): string[] {
  const nome = <T extends string>(opcoes: Opcao<T>[], v: T) => opcoes.find((o) => o.valor === v)!.rotulo
  const linhas = [
    f.situacoes.length === 0 ? 'Todas as situações' : `Situação: ${f.situacoes.map((s) => ROTULO_STATUS[s]).join(', ')}`,
  ]
  if (f.clienteId) linhas.push(`Cliente: ${nomeDoCliente ?? 'não encontrado'}`)
  if (f.prazo !== 'todos') linhas.push(`Prazo: ${nome(OPCOES_PRAZO, f.prazo)}`)
  if (f.busca) linhas.push(`Busca: "${f.busca}"`)
  linhas.push(`Ordem: ${nome(OPCOES_ORDEM, f.ordem)}`)
  if (f.agrupar !== 'nada') linhas.push(nome(OPCOES_AGRUPAR, f.agrupar))
  return linhas
}
