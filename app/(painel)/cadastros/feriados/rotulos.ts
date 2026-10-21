import type { FormatarValor, Rotulos } from '@/components/historico'
import { ROTULO_ABRANGENCIA, type Abrangencia } from '@/lib/tipos'

// O que o <Historico> precisa saber de um feriado e da configuração do escritório: como chamar
// cada campo e como escrever os valores que o banco guarda por código. Mora aqui, na tela de
// feriados, e não no componente.

export const ROTULOS_FERIADO: Rotulos = {
  data: 'Data',
  descricao: 'Descrição',
  abrangencia: 'Abrangência',
  uf: 'UF',
  municipio: 'Município',
}

export const formatarFeriado: FormatarValor = (campo, valor) => {
  if (campo === 'abrangencia' && typeof valor === 'string') return ROTULO_ABRANGENCIA[valor as Abrangencia]
  return undefined
}

export const ROTULOS_CONFIGURACAO: Rotulos = {
  uf: 'UF',
  municipio: 'Município',
}
