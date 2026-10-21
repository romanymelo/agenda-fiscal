'use server'

import { revalidatePath } from 'next/cache'
import { alterar, criar, SemPermissao } from '@/lib/db/escrita'
import { usuarioExiste } from '@/lib/db/usuarios'
import type { Papel } from '@/lib/tipos'
import { contextoAtual } from '@/lib/usuario-atual'

/** O que a tela recebe de volta: ou deu certo, ou uma mensagem em português. */
export type Resultado = { ok?: true; erro?: string }

// Quem tira o próprio acesso de administrador pode deixar o painel sem ninguém que cadastre a equipe.
const CONTRA_SI_MESMO = 'Você não pode desativar nem rebaixar a si mesmo.'

const PAPEIS: Papel[] = ['admin', 'membro']

// Traduz o que o helper e o banco podem lançar. O que não for conhecido sobe: erro de
// programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: 'Só o administrador pode mexer na equipe.' }
  // 23505 = unique_violation; a única restrição de unicidade de `usuarios` (fora o id) é o e-mail.
  if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505')
    return { erro: 'Já existe um usuário com este e-mail.' }
  throw e
}

// Campo ausente do formulário vira undefined (o helper ignora); texto vazio vira null.
function texto(form: FormData, nome: string): string | undefined {
  const v = form.get(nome)
  return typeof v === 'string' ? v.trim() : undefined
}

export async function criarUsuario(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const nome = texto(form, 'nome')
  const email = texto(form, 'email')?.toLowerCase()
  const papel = texto(form, 'papel') as Papel
  if (!nome) return { erro: 'Informe o nome.' }
  if (!email || !email.includes('@')) return { erro: 'Informe um e-mail válido.' }
  if (!PAPEIS.includes(papel)) return { erro: 'Escolha o papel.' }
  try {
    await criar(ctx, 'usuarios', { nome, email, papel })
  } catch (e) {
    return traduzir(e)
  }
  revalidatePath('/equipe')
  return { ok: true }
}

export async function alterarUsuario(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  if (!(await usuarioExiste(ctx.db, id))) return { erro: 'Usuário não encontrado.' }
  const nome = texto(form, 'nome')
  const email = texto(form, 'email')?.toLowerCase()
  const papel = texto(form, 'papel')
  const ativo = texto(form, 'ativo') === undefined ? undefined : texto(form, 'ativo') === 'true'
  if (nome === '') return { erro: 'Informe o nome.' }
  if (email !== undefined && !email.includes('@')) return { erro: 'Informe um e-mail válido.' }
  if (papel !== undefined && !PAPEIS.includes(papel as Papel)) return { erro: 'Escolha o papel.' }
  if (id === ctx.usuario.id && (ativo === false || (papel !== undefined && papel !== 'admin')))
    return { erro: CONTRA_SI_MESMO }
  try {
    await alterar(ctx, 'usuarios', id, { nome, email, papel, ativo })
  } catch (e) {
    return traduzir(e)
  }
  revalidatePath('/equipe')
  return { ok: true }
}

/** Desativa, não exclui: o nome da pessoa precisa continuar no histórico. */
export async function desativarUsuario(id: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  if (!(await usuarioExiste(ctx.db, id))) return { erro: 'Usuário não encontrado.' }
  if (id === ctx.usuario.id) return { erro: CONTRA_SI_MESMO }
  try {
    await alterar(ctx, 'usuarios', id, { ativo: false })
  } catch (e) {
    return traduzir(e)
  }
  revalidatePath('/equipe')
  return { ok: true }
}
