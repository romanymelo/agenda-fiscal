import type { PGlite } from '@electric-sql/pglite'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { obterBanco } from './db/conexao'
import type { Contexto } from './db/escrita'
import { buscarUsuario } from './db/usuarios'
import type { Usuario } from './tipos'

/**
 * Quem está usando o painel (spec 5). Nesta fase não há senha: a pessoa se escolhe numa
 * lista e a escolha fica neste cookie. Isto identifica, não autentica.
 * Quando o Supabase Auth entrar, só este arquivo muda.
 */
export const COOKIE_USUARIO = 'agenda_fiscal_usuario'

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365

/**
 * Núcleo testável: recebe o banco e o id que estava no cookie, sem depender do servidor Next.
 * Quem valida (ativo, não excluído, id com forma de uuid) é `buscarUsuario`, na consulta.
 */
export async function usuarioDoCookie(
  db: PGlite,
  id: string | undefined,
): Promise<Usuario | null> {
  if (!id) return null
  return buscarUsuario(db, id)
}

/** Casca fina: lê o cookie da requisição e delega. `cookies()` é assíncrona nesta versão. */
export async function usuarioAtual(): Promise<Usuario | null> {
  const cookieStore = await cookies()
  return usuarioDoCookie(await obterBanco(), cookieStore.get(COOKIE_USUARIO)?.value)
}

/** Para telas que não existem sem autoria: manda escolher quem é. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect('/identificar')
  return usuario
}

/** Contexto do helper de escrita, pronto para as Server Actions. Exige usuário. */
export async function contextoAtual(): Promise<Contexto> {
  const usuario = await exigirUsuario()
  return { db: await obterBanco(), usuario }
}

// Escrever cookie só é permitido em Server Action ou Route Handler, nunca durante a
// renderização de uma página: quem chama estas duas é `app/identificar/acoes.ts`.

export async function gravarEscolha(id: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_USUARIO, id, {
    path: '/',
    sameSite: 'lax',
    maxAge: UM_ANO_EM_SEGUNDOS,
    // Nenhum código do navegador lê este cookie: só o servidor precisa dele.
    httpOnly: true,
    // Em desenvolvimento o painel roda em http, onde um cookie `secure` não seria enviado.
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function limparEscolha(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_USUARIO)
}
