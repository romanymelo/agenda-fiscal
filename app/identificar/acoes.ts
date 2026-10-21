'use server'

import { redirect } from 'next/navigation'
import { obterBanco } from '@/lib/db/conexao'
import { buscarUsuario } from '@/lib/db/usuarios'
import { gravarEscolha, limparEscolha } from '@/lib/usuario-atual'

/**
 * Grava no cookie quem a pessoa disse que é. Uma Server Action é um POST público: o id
 * recebido é confirmado no banco (existe, ativo, não excluído) antes de virar cookie.
 * `redirect` lança, então fica fora de qualquer try.
 */
export async function escolherUsuario(id: string): Promise<void> {
  const usuario = await buscarUsuario(await obterBanco(), id)
  if (!usuario) redirect('/identificar')
  await gravarEscolha(usuario.id)
  redirect('/')
}

/** Botão "Trocar" do header: esquece a escolha e volta para a tela de identificação. */
export async function sairDaIdentificacao(): Promise<void> {
  await limparEscolha()
  redirect('/identificar')
}
