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
  /** `null` na regra `dia_util_n`: o dia vem de `diaUtilN`. */
  diaVencimento: number | null
  meses: number[] | null
  regraDiaNaoUtil: RegraDiaNaoUtil
  diaUtilN: number | null
  competenciaDefasagem: number
}

/** Nome de cada esfera e suas cores (texto, fundo, ponto), as mesmas em lista, detalhe e calendário. */
export const ROTULO_ESFERA: Record<Esfera, string> = {
  federal: 'Federal',
  estadual: 'Estadual',
  municipal: 'Municipal',
  trabalhista: 'Trabalhista',
}
export const COR_ESFERA: Record<Esfera, { texto: string; fundo: string; ponto: string }> = {
  federal: { texto: '#1E40AF', fundo: '#DBEAFE', ponto: '#2563EB' },
  estadual: { texto: '#9A3412', fundo: '#FFEDD5', ponto: '#EA580C' },
  municipal: { texto: '#5B21B6', fundo: '#EDE9FE', ponto: '#7C3AED' },
  trabalhista: { texto: '#166534', fundo: '#DCFCE7', ponto: '#16A34A' },
}
export const ROTULO_PERIODICIDADE: Record<Periodicidade, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
}
export const ROTULO_REGRA: Record<RegraDiaNaoUtil, string> = {
  antecipa: 'Dia fixo; se cair em dia não útil, antecipa para o dia útil anterior',
  posterga: 'Dia fixo; se cair em dia não útil, posterga para o próximo dia útil',
  dia_util_n: 'N-ésimo dia útil do mês (por exemplo, o 10º dia útil)',
}

export type Regime = 'simples' | 'presumido' | 'real' | 'mei'

/** Como a equipe chama cada regime. A ordem é a das listas de escolha. */
export const ROTULO_REGIME: Record<Regime, string> = {
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  mei: 'MEI',
}

/** Obrigação como o cadastro a enxerga: o que o cálculo consome (`Obrigacao`) mais os campos informativos. */
export type ObrigacaoCadastro = Obrigacao & {
  /** Informativo: nada é filtrado por ele. */
  regimesAplicaveis: Regime[] | null
  observacao: string | null
  baseLegal: string | null
  ativo: boolean
  atualizadoEm: string | null
  atualizadoPorNome: string | null
}

export type Cliente = {
  id: string
  nome: string
  codigoDominio: string | null
  cnpj: string | null
  regime: Regime
  uf: string
  municipio: string
  particularidades: string | null
  ativo: boolean
  atualizadoEm: string | null
  atualizadoPorNome: string | null
}
