import type { PGlite } from '@electric-sql/pglite'
import type { Acao } from '../tipos'
import { obterBanco } from './conexao'

export type LinhaHistorico = {
  acao: Acao
  usuarioNome: string
  em: string
  camposAlterados: Record<string, { antes: unknown; depois: unknown }> | null
}

/** Histórico de um registro, mais recente primeiro. */
export async function historicoDe(
  db: PGlite,
  tabela: string,
  registroId: string,
): Promise<LinhaHistorico[]> {
  const r = await db.query<{
    acao: Acao
    usuario_nome: string
    em: Date
    campos_alterados: LinhaHistorico['camposAlterados']
  }>(
    `select acao, usuario_nome, em, campos_alterados from historico
     where tabela = $1 and registro_id = $2
     order by em desc, ctid desc`, // ctid desempata fatos gravados no mesmo instante
    [tabela, registroId],
  )
  return r.rows.map((l) => ({
    acao: l.acao,
    usuarioNome: l.usuario_nome,
    em: l.em.toISOString(),
    camposAlterados: l.campos_alterados,
  }))
}

/** Como `historicoDe`, abrindo o banco: para componentes e páginas, que não importam `obterBanco`. */
export async function historicoDoRegistro(
  tabela: string,
  registroId: string,
): Promise<LinhaHistorico[]> {
  return historicoDe(await obterBanco(), tabela, registroId)
}
