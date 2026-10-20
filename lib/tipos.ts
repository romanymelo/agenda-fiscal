export type Papel = 'admin' | 'membro'
export type Esfera = 'federal' | 'estadual' | 'municipal' | 'trabalhista'
export type Periodicidade = 'mensal' | 'trimestral' | 'anual'
export type RegraDiaNaoUtil = 'antecipa' | 'posterga' | 'dia_util_n'
export type Abrangencia = 'nacional' | 'estadual' | 'municipal'
export type StatusProcesso =
  | 'em_andamento'
  | 'aguardando_orgao'
  | 'em_exigencia'
  | 'concluido'
export type Acao = 'criacao' | 'alteracao' | 'exclusao'

/** Data pura no formato 'YYYY-MM-DD'. */
export type Data = string

export type Praca = { uf: string; municipio: string }

export type Usuario = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
}

export type Feriado = {
  data: Data
  descricao: string
  abrangencia: Abrangencia
  uf: string | null
  municipio: string | null
}

export type Obrigacao = {
  id: string
  nome: string
  esfera: Esfera
  periodicidade: Periodicidade
  diaVencimento: number
  meses: number[] | null
  regraDiaNaoUtil: RegraDiaNaoUtil
  diaUtilN: number | null
  competenciaDefasagem: number
}
