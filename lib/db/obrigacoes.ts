import type { PGlite } from '@electric-sql/pglite'
import type { Esfera, ObrigacaoCadastro, Periodicidade, Regime, RegraDiaNaoUtil } from '../tipos'
import { obterBanco } from './conexao'
import { UUID } from './usuarios'

type Linha = {
  id: string
  nome: string
  esfera: Esfera
  periodicidade: Periodicidade
  dia_vencimento: number | null
  meses: number[] | null
  regra_dia_nao_util: RegraDiaNaoUtil
  dia_util_n: number | null
  competencia_defasagem: number
  regimes_aplicaveis: Regime[] | null
  observacao: string | null
  base_legal: string | null
  ativo: boolean
  atualizado_em: Date | null
  atualizado_por_nome: string | null
}

// snake_case do banco para camelCase da aplicação: a conversão mora aqui. As cinco primeiras linhas do
// objeto são exatamente o `Obrigacao` que `vencimentosDaObrigacao` consome.
function paraObrigacao(l: Linha): ObrigacaoCadastro {
  return {
    id: l.id,
    nome: l.nome,
    esfera: l.esfera,
    periodicidade: l.periodicidade,
    diaVencimento: l.dia_vencimento,
    meses: l.meses,
    regraDiaNaoUtil: l.regra_dia_nao_util,
    diaUtilN: l.dia_util_n,
    competenciaDefasagem: l.competencia_defasagem,
    regimesAplicaveis: l.regimes_aplicaveis,
    observacao: l.observacao,
    baseLegal: l.base_legal,
    ativo: l.ativo,
    atualizadoEm: l.atualizado_em ? l.atualizado_em.toISOString() : null,
    atualizadoPorNome: l.atualizado_por_nome,
  }
}

const SELECAO = `select o.id, o.nome, o.esfera, o.periodicidade, o.dia_vencimento, o.meses, o.regra_dia_nao_util,
                        o.dia_util_n, o.competencia_defasagem, o.regimes_aplicaveis, o.observacao, o.base_legal,
                        o.ativo, o.atualizado_em, u.nome as atualizado_por_nome
                 from obrigacoes o left join usuarios u on u.id = o.atualizado_por`

/**
 * Obrigações não excluídas, em ordem de nome, no formato que `vencimentosDaObrigacao` consome (camelCase,
 * `meses` como `number[] | null`). Só as ativas, salvo `incluirInativos`: obrigação que deixou de existir sai
 * do dia a dia e do calendário sem perder o histórico.
 */
export async function listarObrigacoes(
  db: PGlite,
  { incluirInativos = false }: { incluirInativos?: boolean } = {},
): Promise<ObrigacaoCadastro[]> {
  const r = await db.query<Linha>(`${SELECAO} where o.excluido_em is null and ($1::boolean or o.ativo)`, [
    incluirInativos,
  ])
  // Ordem de nome sem diferenciar caixa nem acento (a do banco não trata o português).
  return r.rows
    .map(paraObrigacao)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id))
}

/** Uma obrigação não excluída (ativa ou não), ou `null` (inclusive para id que não tem forma de uuid). */
export async function buscarObrigacao(db: PGlite, id: string): Promise<ObrigacaoCadastro | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<Linha>(`${SELECAO} where o.id = $1 and o.excluido_em is null`, [id])
  return r.rows[0] ? paraObrigacao(r.rows[0]) : null
}

// As páginas não importam `obterBanco`: estas duas abrem o banco por elas.
export async function obrigacoesDaTela(opcoes?: { incluirInativos?: boolean }): Promise<ObrigacaoCadastro[]> {
  return listarObrigacoes(await obterBanco(), opcoes)
}

export async function obrigacaoDaTela(id: string): Promise<ObrigacaoCadastro | null> {
  return buscarObrigacao(await obterBanco(), id)
}
