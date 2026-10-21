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

/** Categoria de um item do calendário: as quatro esferas, mais processo e feriado. */
export type CategoriaCalendario = Esfera | 'processo' | 'feriado'

/** Nome de cada categoria do calendário, nas mesmas cores do resto do app. */
export const ROTULO_CATEGORIA: Record<CategoriaCalendario, string> = {
  ...ROTULO_ESFERA,
  processo: 'Processo',
  feriado: 'Feriado',
}

// Processo não tem `ponto` (spec: fundo escuro com texto branco, sem marcador de cor à parte).
export const COR_CATEGORIA: Record<CategoriaCalendario, { texto: string; fundo: string; ponto?: string }> = {
  ...COR_ESFERA,
  processo: { texto: '#FFFFFF', fundo: '#1F2937' },
  feriado: { texto: '#374151', fundo: '#E5E7EB', ponto: '#9CA3AF' },
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

/** Feriado como o cadastro o enxerga: o que o cálculo consome (`Feriado`) mais o id, para editar e excluir. */
export type FeriadoCadastro = Feriado & { id: string }

export const ROTULO_ABRANGENCIA: Record<Abrangencia, string> = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
}

/** Nome de cada situação do processo e suas cores (texto, fundo, ponto), as mesmas no quadro e no detalhe. A ordem é a das colunas. */
export const ROTULO_STATUS: Record<StatusProcesso, string> = {
  em_andamento: 'Em andamento',
  aguardando_orgao: 'Aguardando órgão',
  em_exigencia: 'Em exigência',
  concluido: 'Concluído',
}
export const COR_STATUS: Record<StatusProcesso, { texto: string; fundo: string; ponto: string }> = {
  em_andamento: { texto: '#1E40AF', fundo: '#DBEAFE', ponto: '#2563EB' },
  aguardando_orgao: { texto: '#92400E', fundo: '#FEF3C7', ponto: '#D97706' },
  em_exigencia: { texto: '#9F1239', fundo: '#FFE4E6', ponto: '#E11D48' },
  concluido: { texto: '#166534', fundo: '#DCFCE7', ponto: '#16A34A' },
}

/** Processo administrativo em um órgão, como o quadro o enxerga. */
export type Processo = {
  id: string
  clienteId: string
  clienteNome: string
  tipo: string
  orgao: string
  protocolo: string | null
  status: StatusProcesso
  dataAbertura: Data
  prazo: Data | null
  prazoDescricao: string | null
  /** Instante da última mudança: alteração do processo ou andamento novo, o que for mais recente. */
  atualizadoEm: string | null
}

export type Andamento = { id: string; data: Data; descricao: string; criadoPorNome: string }

export type Anexo = { id: string; nomeArquivo: string; caminhoStorage: string; criadoPorNome: string }

/** Padrão das Server Actions do projeto: devolver `{ ok?, erro? }` em vez de lançar para erro esperado. */
export type Resultado = { ok?: true; erro?: string }
