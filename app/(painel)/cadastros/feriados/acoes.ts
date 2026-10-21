'use server'

import { revalidatePath } from 'next/cache'
import { obterConfiguracao } from '@/lib/db/configuracao'
import { alterar, criar, excluir, exigirPermissao, SemPermissao } from '@/lib/db/escrita'
import { buscarFeriado } from '@/lib/db/feriados'
import { ErroDeFormulario, texto } from '@/lib/formulario'
import { contextoAtual } from '@/lib/usuario-atual'
import { validarFeriado, validarPraca } from './validacao'

/** Padrão das Server Actions do projeto: devolver `{ ok?, erro? }` em vez de lançar para erro esperado. */
export type Resultado = { ok?: true; erro?: string }

// Traduz o que o helper e os conversores podem lançar. O que não for conhecido sobe:
// erro de programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: e.message }
  if (e instanceof ErroDeFormulario) return { erro: e.message }
  throw e
}

// O formulário de feriado é sempre completo, no cadastro e na edição. A abrangência decide o que vale:
// o que ela dispensa vira `null` (e não `undefined`), na mesma gravação em que o resto muda. Trocar um
// feriado de municipal para nacional sem limpar uf e município deixaria os valores antigos para trás, e o
// `check` do banco recusaria a gravação com um erro cru.
function lerFeriado(form: FormData): { erro: string } | { dados: Record<string, unknown> } {
  const campos = {
    data: texto(form, 'data') ?? '',
    descricao: texto(form, 'descricao') ?? '',
    abrangencia: texto(form, 'abrangencia') ?? '',
    uf: (texto(form, 'uf') ?? '').toUpperCase(),
    municipio: texto(form, 'municipio') ?? '',
  }
  const erro = validarFeriado(campos)
  if (erro) return { erro }
  const { abrangencia } = campos
  return {
    dados: {
      data: campos.data,
      descricao: campos.descricao,
      abrangencia,
      uf: abrangencia === 'nacional' ? null : campos.uf,
      municipio: abrangencia === 'municipal' ? campos.municipio : null,
    },
  }
}

const atualizarLista = () => revalidatePath('/cadastros/feriados')

export async function criarFeriado(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const lido = lerFeriado(form)
  if ('erro' in lido) return lido
  try {
    await criar(ctx, 'feriados', lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}

export async function alterarFeriado(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  // O helper não filtra `excluido_em`: quem recebe um id de fora confere antes de editar.
  if (!(await buscarFeriado(ctx.db, id))) return { erro: 'Feriado não encontrado.' }
  const lido = lerFeriado(form)
  if ('erro' in lido) return lido
  try {
    await alterar(ctx, 'feriados', id, lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}

/** Exclusão lógica; só o administrador. Feriado que não vale mais é excluído, não desativado. */
export async function excluirFeriado(id: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  try {
    // A permissão vem antes de conferir o id: quem não pode não descobre nada.
    exigirPermissao(ctx.usuario, 'feriados', 'exclusao')
    if (!(await buscarFeriado(ctx.db, id))) return { erro: 'Feriado não encontrado.' }
    await excluir(ctx, 'feriados', id)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}

/** Troca a praça do escritório. Só o administrador (a tabela de permissões do helper exige). */
export async function alterarConfiguracao(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  try {
    // A permissão vem antes da validação: quem não pode não ganha mensagem sobre os campos.
    exigirPermissao(ctx.usuario, 'configuracao', 'alteracao')
    const praca = { uf: (texto(form, 'uf') ?? '').toUpperCase(), municipio: texto(form, 'municipio') ?? '' }
    const erro = validarPraca(praca)
    if (erro) return { erro }
    const atual = await obterConfiguracao(ctx.db)
    await alterar(ctx, 'configuracao', atual.id, praca)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}
