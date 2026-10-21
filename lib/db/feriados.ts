import type { PGlite } from '@electric-sql/pglite'
import type { Abrangencia, Data, FeriadoCadastro } from '../tipos'
import { obterBanco } from './conexao'
import { UUID } from './usuarios'

type Linha = {
  id: string
  data: Data
  descricao: string
  abrangencia: Abrangencia
  uf: string | null
  municipio: string | null
}

// `data` sai como texto 'AAAA-MM-DD' (to_char), nunca como Date: data pura não tem fuso, e o objeto Date
// do driver a deslocaria conforme o fuso de quem lê. O resultado é o `Feriado` que `feriadosDaPraca` consome.
const SELECAO = `select id, to_char(data, 'YYYY-MM-DD') as data, descricao, abrangencia, uf, municipio from feriados`

const ORDEM = `order by data, descricao, id`

const paraFeriado = (l: Linha): FeriadoCadastro => ({
  id: l.id,
  data: l.data,
  descricao: l.descricao,
  abrangencia: l.abrangencia,
  uf: l.uf,
  municipio: l.municipio,
})

/** Feriados não excluídos de um ano, por data. Traz todas as praças: quem filtra o cálculo é `feriadosDaPraca`. */
export async function listarFeriados(db: PGlite, ano: number): Promise<FeriadoCadastro[]> {
  return feriadosEntre(db, `${String(ano).padStart(4, '0')}-01-01`, `${String(ano).padStart(4, '0')}-12-31`)
}

/**
 * Feriados não excluídos entre duas datas, inclusive as duas pontas, por data. O calendário monta o período por
 * intervalo, e "próximos 7 dias" no fim de dezembro cruza o ano: com um ano só, o 1º de janeiro ficaria de fora.
 */
export async function feriadosEntre(db: PGlite, de: Data, ate: Data): Promise<FeriadoCadastro[]> {
  const r = await db.query<Linha>(`${SELECAO} where excluido_em is null and data between $1::date and $2::date ${ORDEM}`, [
    de,
    ate,
  ])
  return r.rows.map(paraFeriado)
}

/** Um feriado não excluído, ou `null` (inclusive para id que não tem forma de uuid). */
export async function buscarFeriado(db: PGlite, id: string): Promise<FeriadoCadastro | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<Linha>(`${SELECAO} where id = $1 and excluido_em is null`, [id])
  return r.rows[0] ? paraFeriado(r.rows[0]) : null
}

// As páginas não importam `obterBanco`: esta abre o banco por elas.
export async function feriadosDaTela(ano: number): Promise<FeriadoCadastro[]> {
  return listarFeriados(await obterBanco(), ano)
}
