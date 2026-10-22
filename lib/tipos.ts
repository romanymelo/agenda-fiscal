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
// As cores vivem em app/globals.css, como variáveis dos dois temas (claro e escuro).
export const COR_ESFERA: Record<Esfera, { texto: string; fundo: string; ponto: string }> = {
  federal: { texto: 'var(--c-federal-t)', fundo: 'var(--c-federal-f)', ponto: 'var(--c-federal-p)' },
  estadual: { texto: 'var(--c-estadual-t)', fundo: 'var(--c-estadual-f)', ponto: 'var(--c-estadual-p)' },
  municipal: { texto: 'var(--c-municipal-t)', fundo: 'var(--c-municipal-f)', ponto: 'var(--c-municipal-p)' },
  trabalhista: { texto: 'var(--c-trabalhista-t)', fundo: 'var(--c-trabalhista-f)', ponto: 'var(--c-trabalhista-p)' },
}

/** Categoria de um item do calendário: as quatro esferas, mais processo e feriado. */
export type CategoriaCalendario = Esfera | 'processo' | 'feriado'

/** Nome de cada categoria do calendário, nas mesmas cores do resto do app. */
export const ROTULO_CATEGORIA: Record<CategoriaCalendario, string> = {
  ...ROTULO_ESFERA,
  processo: 'Processo',
  feriado: 'Feriado',
}

// Processo não tem `ponto` na categoria: a barra amarela (o marca-texto) vem de components/calendario/estilo.ts.
export const COR_CATEGORIA: Record<CategoriaCalendario, { texto: string; fundo: string; ponto?: string }> = {
  ...COR_ESFERA,
  processo: { texto: 'var(--c-processo-t)', fundo: 'var(--c-processo-f)' },
  feriado: { texto: 'var(--c-feriado-t)', fundo: 'var(--c-feriado-f)', ponto: 'var(--c-feriado-p)' },
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
export type FeriadoCadastro = Feriado & { id: string; /** Calculado pelo sistema (não está no banco): não se edita nem se exclui. */ automatico?: boolean }

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
  em_andamento: { texto: 'var(--c-federal-t)', fundo: 'var(--c-federal-f)', ponto: 'var(--c-federal-p)' },
  aguardando_orgao: { texto: 'var(--c-aviso)', fundo: 'var(--c-aviso-claro)', ponto: 'var(--c-aguardando-p)' },
  em_exigencia: { texto: 'var(--c-exigencia-t)', fundo: 'var(--c-exigencia-f)', ponto: 'var(--c-exigencia-p)' },
  concluido: { texto: 'var(--c-trabalhista-t)', fundo: 'var(--c-trabalhista-f)', ponto: 'var(--c-trabalhista-p)' },
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
  /** Quando passou para Concluído, tirado do histórico. Nulo se não está concluído (ou se nunca houve registro). */
  concluidoEm: string | null
}

export type Andamento = { id: string; data: Data; descricao: string; criadoPorNome: string }

export type Anexo = { id: string; nomeArquivo: string; caminhoStorage: string; criadoPorNome: string }

/** Padrão das Server Actions do projeto: devolver `{ ok?, erro? }` em vez de lançar para erro esperado. */
export type Resultado = { ok?: true; erro?: string }
