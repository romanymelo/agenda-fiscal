import type { PGlite } from '@electric-sql/pglite'
import type { Usuario } from '../tipos'

const CAMPOS = 'id, nome, email, papel, ativo'

// O id pode vir do cookie, ou seja, do navegador: o que não tem forma de uuid nem chega ao banco
// (`where id = $1` com texto qualquer estouraria num erro de conversão).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Equipe, em ordem de nome. Nunca traz quem foi excluído logicamente (spec 6). */
export async function listarUsuarios(
  db: PGlite,
  { apenasAtivos = false }: { apenasAtivos?: boolean } = {},
): Promise<Usuario[]> {
  const r = await db.query<Usuario>(
    `select ${CAMPOS} from usuarios
     where excluido_em is null ${apenasAtivos ? 'and ativo = true' : ''}
     order by nome`,
  )
  return r.rows
}

/**
 * Usuário que ainda vale: `ativo = true and excluido_em is null` é condição da consulta,
 * não filtro em memória — quem foi desativado hoje não vale mais, mesmo que escolhido ontem.
 */
export async function buscarUsuario(db: PGlite, id: string): Promise<Usuario | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<Usuario>(
    `select ${CAMPOS} from usuarios where id = $1 and ativo = true and excluido_em is null`,
    [id],
  )
  return r.rows[0] ?? null
}
