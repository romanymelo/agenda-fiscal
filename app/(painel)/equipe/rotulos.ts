import type { FormatarValor, Rotulos } from '@/components/historico'
import type { Papel } from '@/lib/tipos'

// O que o <Historico> precisa saber de um usuário: como chamar cada campo e como escrever os
// valores que o banco guarda por código. Mora aqui, na tela de equipe, e não no componente.

export const ROTULOS_USUARIO: Rotulos = {
  nome: 'Nome',
  email: 'E-mail',
  papel: 'Papel',
  ativo: 'Situação',
}

const ROTULO_PAPEL: Record<Papel, string> = { admin: 'Administrador', membro: 'Membro' }

export const formatarUsuario: FormatarValor = (campo, valor) => {
  if (campo === 'papel' && typeof valor === 'string') return ROTULO_PAPEL[valor as Papel]
  if (campo === 'ativo' && typeof valor === 'boolean') return valor ? 'Ativo' : 'Inativo'
  return undefined
}
