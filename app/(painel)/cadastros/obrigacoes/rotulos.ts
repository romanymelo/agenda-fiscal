import type { FormatarValor, Rotulos } from '@/components/historico'
import {
  ROTULO_ESFERA,
  ROTULO_PERIODICIDADE,
  ROTULO_REGIME,
  ROTULO_REGRA,
  type Esfera,
  type Obrigacao,
  type Periodicidade,
  type Regime,
  type RegraDiaNaoUtil,
} from '@/lib/tipos'

// O que as telas de obrigação precisam para falar com a equipe: nomes dos meses, a regra de vencimento
// em português corrente e o mapa de rótulos do <Historico>. Mora aqui, na tela, e não no componente.

export const MESES = [
  ['Janeiro', 'jan'],
  ['Fevereiro', 'fev'],
  ['Março', 'mar'],
  ['Abril', 'abr'],
  ['Maio', 'mai'],
  ['Junho', 'jun'],
  ['Julho', 'jul'],
  ['Agosto', 'ago'],
  ['Setembro', 'set'],
  ['Outubro', 'out'],
  ['Novembro', 'nov'],
  ['Dezembro', 'dez'],
] as const

/** "jan", "jan e abr", "jan, abr e jul". */
function enumerar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

export function nomesDosMeses(meses: number[]): string {
  return enumerar([...meses].sort((a, b) => a - b).map((m) => MESES[m - 1]?.[1] ?? String(m)))
}

type RegraDeVencimento = Pick<
  Obrigacao,
  'periodicidade' | 'meses' | 'regraDiaNaoUtil' | 'diaVencimento' | 'diaUtilN'
>

/**
 * A regra de vencimento como a equipe fala: "todo dia 20, postergando para o próximo dia útil",
 * "10º dia útil", "dia 25 de jan, abr, jul e out, antecipando para o dia útil anterior".
 */
export function descreverVencimento(o: RegraDeVencimento): string {
  const mensal = o.periodicidade === 'mensal'
  const em = !mensal && o.meses?.length ? ` de ${nomesDosMeses(o.meses)}` : ''
  if (o.regraDiaNaoUtil === 'dia_util_n') return `${o.diaUtilN}º dia útil${em}`
  const dia = mensal ? `todo dia ${o.diaVencimento}` : `dia ${o.diaVencimento}${em}`
  return o.regraDiaNaoUtil === 'antecipa'
    ? `${dia}, antecipando para o dia útil anterior`
    : `${dia}, postergando para o próximo dia útil`
}

/** Qual mês a obrigação declara, em relação ao mês em que vence. */
export function descreverCompetencia(defasagem: number): string {
  if (defasagem === 0) return 'o próprio mês do vencimento'
  if (defasagem === 1) return 'o mês anterior ao do vencimento'
  return `${defasagem} meses antes do mês do vencimento`
}

export const ROTULOS_OBRIGACAO: Rotulos = {
  nome: 'Nome',
  esfera: 'Esfera',
  periodicidade: 'Periodicidade',
  meses: 'Meses',
  regra_dia_nao_util: 'Regra de vencimento',
  dia_vencimento: 'Dia do vencimento',
  dia_util_n: 'Número do dia útil',
  competencia_defasagem: 'Defasagem da competência',
  regimes_aplicaveis: 'Regimes (informativo)',
  observacao: 'Observação',
  base_legal: 'Base legal',
  ativo: 'Situação',
}

export const formatarObrigacao: FormatarValor = (campo, valor) => {
  if (campo === 'esfera' && typeof valor === 'string') return ROTULO_ESFERA[valor as Esfera]
  if (campo === 'periodicidade' && typeof valor === 'string') return ROTULO_PERIODICIDADE[valor as Periodicidade]
  if (campo === 'regra_dia_nao_util' && typeof valor === 'string') return ROTULO_REGRA[valor as RegraDiaNaoUtil]
  if (campo === 'ativo' && typeof valor === 'boolean') return valor ? 'Ativo' : 'Inativo'
  if (Array.isArray(valor) && valor.length === 0) return null
  if (campo === 'meses' && Array.isArray(valor)) return nomesDosMeses(valor as number[])
  if (campo === 'regimes_aplicaveis' && Array.isArray(valor))
    return (valor as Regime[]).map((r) => ROTULO_REGIME[r] ?? r).join(', ')
  return undefined
}
