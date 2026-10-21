'use server'

import { revalidatePath } from 'next/cache'
import { alterar, criar, exigirPermissao, SemPermissao, type Contexto } from '@/lib/db/escrita'
import { usuarioExiste } from '@/lib/db/usuarios'
import { booleano, ErroDeFormulario, texto } from '@/lib/formulario'
import type { Papel, Resultado } from '@/lib/tipos'
import { contextoAtual } from '@/lib/usuario-atual'

// Quem tira o próprio acesso de administrador pode deixar o painel sem ninguém que cadastre a equipe.
const CONTRA_SI_MESMO = 'Você não pode desativar nem rebaixar a si mesmo.'

const PAPEIS: Papel[] = ['admin', 'membro']

// Traduz o que o helper, o banco e os conversores podem lançar. O que não for conhecido sobe:
// erro de programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: 'Só o administrador pode mexer na equipe.' }
  if (e instanceof ErroDeFormulario) return { erro: e.message }
  // 23505 = unique_violation; a única restrição de unicidade de `usuarios` (fora o id) é o e-mail.
  if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505')
    return { erro: 'Já existe um usuário com este e-mail.' }
  throw e
}

// A permissão vem antes de tudo (antes até de conferir se o id existe): quem não pode não descobre nada.
// A regra é a tabela do helper de escrita, que a repete em `criar`/`alterar` como segunda linha.
function recusa(ctx: Contexto, acao: 'criacao' | 'alteracao'): Resultado | null {
  try {
    exigirPermissao(ctx.usuario, 'usuarios', acao)
    return null
  } catch (e) {
    return traduzir(e)
  }
}

export async function criarUsuario(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const negado = recusa(ctx, 'criacao')
  if (negado) return negado
  try {
    const nome = texto(form, 'nome')
    const email = texto(form, 'email')?.toLowerCase()
    const papel = texto(form, 'papel') as Papel
    if (!nome) return { erro: 'Informe o nome.' }
    if (!email || !email.includes('@')) return { erro: 'Informe um e-mail válido.' }
    if (!PAPEIS.includes(papel)) return { erro: 'Escolha o papel.' }
    await criar(ctx, 'usuarios', { nome, email, papel })
  } catch (e) {
    return traduzir(e)
  }
  revalidatePath('/equipe')
  return { ok: true }
}

export async function alterarUsuario(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const negado = recusa(ctx, 'alteracao')
  if (negado) return negado
  if (!(await usuarioExiste(ctx.db, id))) return { erro: 'Usuário não encontrado.' }
  try {
    const nome = texto(form, 'nome')
    const email = texto(form, 'email')?.toLowerCase()
    const papel = texto(form, 'papel')
    const ativo = booleano(form, 'ativo')
    if (nome === '') return { erro: 'Informe o nome.' }
    if (email !== undefined && !email.includes('@')) return { erro: 'Informe um e-mail válido.' }
    if (papel !== undefined && !PAPEIS.includes(papel as Papel)) return { erro: 'Escolha o papel.' }
    if (id === ctx.usuario.id && (ativo === false || (papel !== undefined && papel !== 'admin')))
      return { erro: CONTRA_SI_MESMO }
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
  const negado = recusa(ctx, 'alteracao')
  if (negado) return negado
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
