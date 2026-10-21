'use server'

import { revalidatePath } from 'next/cache'
import { alterar, criar, excluir, exigirPermissao, SemPermissao } from '@/lib/db/escrita'
import { buscarCliente } from '@/lib/db/clientes'
import { booleano, ErroDeFormulario, texto, textoOuNulo } from '@/lib/formulario'
import { ROTULO_REGIME, type Regime, type Resultado } from '@/lib/tipos'
import { contextoAtual } from '@/lib/usuario-atual'
import { ufValida } from '@/lib/ufs'

const REGIMES = Object.keys(ROTULO_REGIME)

// Traduz o que o helper e os conversores podem lançar. O que não for conhecido sobe:
// erro de programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: e.message }
  if (e instanceof ErroDeFormulario) return { erro: e.message }
  throw e
}

// Lê o formulário. Campo obrigatório que veio vazio é erro; na alteração, campo que nem veio
// (`undefined`) é "não mexa". Opcionais usam `textoOuNulo`: vazio limpa a coluna.
function ler(form: FormData, criacao: boolean): { erro: string } | { dados: Record<string, unknown> } {
  const nome = texto(form, 'nome')
  const regime = texto(form, 'regime')
  const uf = texto(form, 'uf')?.toUpperCase()
  const municipio = texto(form, 'municipio')
  // O navegador envia a quebra de linha como \r\n: grava-se sempre \n. `null` (limpar) passa direto.
  const bruto = textoOuNulo(form, 'particularidades')
  const particularidades = typeof bruto === 'string' ? bruto.replace(/\r\n?/g, '\n') : bruto
  let ativo: boolean | undefined
  try {
    ativo = booleano(form, 'ativo')
  } catch (e) {
    if (e instanceof ErroDeFormulario) return { erro: e.message }
    throw e
  }
  const falta = (v: string | undefined) => (criacao ? !v : v === '')
  if (falta(nome)) return { erro: 'Informe o nome do cliente.' }
  if (falta(regime) || (regime !== undefined && !REGIMES.includes(regime)))
    return { erro: 'Escolha o regime tributário.' }
  if (falta(uf) || (uf !== undefined && !ufValida(uf))) return { erro: 'Informe uma UF válida, como AL.' }
  if (falta(municipio)) return { erro: 'Informe o município.' }
  return {
    dados: {
      nome,
      codigo_dominio: textoOuNulo(form, 'codigo_dominio'),
      cnpj: textoOuNulo(form, 'cnpj'),
      regime: regime as Regime | undefined,
      uf,
      municipio,
      particularidades,
      ativo,
    },
  }
}

// Na exclusão só a lista é atualizada: a página do cliente excluído não pode se refazer (viraria 404)
// antes de a tela sair dela.
function atualizarLista() {
  revalidatePath('/cadastros/clientes')
}

export async function criarCliente(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const lido = ler(form, true)
  if ('erro' in lido) return lido
  try {
    await criar(ctx, 'clientes', lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}

export async function alterarCliente(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  // O helper não filtra `excluido_em`: quem recebe um id de fora confere antes de editar.
  if (!(await buscarCliente(ctx.db, id))) return { erro: 'Cliente não encontrado.' }
  const lido = ler(form, false)
  if ('erro' in lido) return lido
  try {
    await alterar(ctx, 'clientes', id, lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  revalidatePath('/cadastros/clientes/[id]', 'page')
  return { ok: true }
}

/** Exclusão lógica; só o administrador. O histórico do cliente continua legível. */
export async function excluirCliente(id: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  try {
    // A permissão vem antes de conferir o id: quem não pode não descobre nada.
    exigirPermissao(ctx.usuario, 'clientes', 'exclusao')
    if (!(await buscarCliente(ctx.db, id))) return { erro: 'Cliente não encontrado.' }
    await excluir(ctx, 'clientes', id)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}
