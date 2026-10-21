import type { PGlite } from '@electric-sql/pglite'
import type { Praca } from '../tipos'
import { obterBanco } from './conexao'

/**
 * A praça do escritório (UF + município), da linha única de `configuracao`. É ela que decide quais feriados
 * deslocam vencimentos. A migration inicial cria a linha: se não existir, o banco está quebrado e o erro sobe.
 */
export async function obterConfiguracao(db: PGlite): Promise<Praca & { id: string }> {
  const r = await db.query<Praca & { id: string }>(
    'select id, uf, municipio from configuracao where excluido_em is null',
  )
  if (!r.rows[0]) throw new Error('A configuração do escritório não existe: a migration inicial não foi aplicada.')
  return r.rows[0]
}

export async function configuracaoDaTela(): Promise<Praca & { id: string }> {
  return obterConfiguracao(await obterBanco())
}
