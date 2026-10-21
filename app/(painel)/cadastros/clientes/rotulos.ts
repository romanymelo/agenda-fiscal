import type { FormatarValor, Rotulos } from '@/components/historico'
import { ROTULO_REGIME, type Regime } from '@/lib/tipos'

// O que o <Historico> precisa saber de um cliente: como chamar cada campo e como escrever os
// valores que o banco guarda por código. Mora aqui, na tela de clientes, e não no componente.

export const ROTULOS_CLIENTE: Rotulos = {
  nome: 'Nome',
  codigo_dominio: 'Código do Domínio',
  cnpj: 'CNPJ',
  regime: 'Regime',
  uf: 'UF',
  municipio: 'Município',
  particularidades: 'Particularidades',
  ativo: 'Situação',
}

export const formatarCliente: FormatarValor = (campo, valor) => {
  if (campo === 'regime' && typeof valor === 'string') return ROTULO_REGIME[valor as Regime]
  if (campo === 'ativo' && typeof valor === 'boolean') return valor ? 'Ativo' : 'Inativo'
  return undefined
}
