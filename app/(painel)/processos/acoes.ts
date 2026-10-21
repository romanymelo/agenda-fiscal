'use server'

import { rm } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { nomeSeguro, salvarAnexo } from '@/lib/arquivos'
import { buscarCliente } from '@/lib/db/clientes'
import { alterar, criar, excluir, exigirPermissao, SemPermissao } from '@/lib/db/escrita'
import { buscarProcesso } from '@/lib/db/processos'
import { ErroDeFormulario, texto, textoOuNulo } from '@/lib/formulario'
import { ROTULO_STATUS, type StatusProcesso } from '@/lib/tipos'
import { contextoAtual } from '@/lib/usuario-atual'

/** Padrão das Server Actions do projeto: devolver `{ ok?, erro? }` em vez de lançar para erro esperado. */
export type Resultado = { ok?: true; erro?: string }

const STATUS = Object.keys(ROTULO_STATUS)

// Tamanho máximo de um anexo. O corpo da requisição tem limite próprio (`serverActions.bodySizeLimit` em
// next.config.ts), um pouco acima deste.
const LIMITE_ANEXO = 10 * 1024 * 1024

// Traduz o que o helper e os conversores podem lançar. O que não for conhecido sobe:
// erro de programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: e.message }
  if (e instanceof ErroDeFormulario) return { erro: e.message }
  throw e
}

// 'AAAA-MM-DD' que existe no calendário (31/02 não passa), sem depender de fuso.
function dataValida(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

// Lê o formulário de processo. Campo obrigatório que veio vazio é erro; na alteração, campo que nem veio
// (`undefined`) é "não mexa". Opcionais usam `textoOuNulo`: vazio limpa a coluna.
async function ler(
  ctx: Awaited<ReturnType<typeof contextoAtual>>,
  form: FormData,
  criacao: boolean,
): Promise<{ erro: string } | { dados: Record<string, unknown> }> {
  const clienteId = texto(form, 'cliente_id')
  const tipo = texto(form, 'tipo')
  const orgao = texto(form, 'orgao')
  const status = texto(form, 'status')
  const dataAbertura = texto(form, 'data_abertura')
  const prazo = textoOuNulo(form, 'prazo')
  const falta = (v: string | undefined) => (criacao ? !v : v === '')
  if (falta(clienteId)) return { erro: 'Escolha o cliente.' }
  if (clienteId && !(await buscarCliente(ctx.db, clienteId))) return { erro: 'Cliente não encontrado.' }
  if (falta(tipo)) return { erro: 'Informe o tipo do processo.' }
  if (falta(orgao)) return { erro: 'Informe o órgão.' }
  if (status !== undefined && !STATUS.includes(status)) return { erro: 'Escolha a situação do processo.' }
  if (falta(dataAbertura) || (dataAbertura && !dataValida(dataAbertura))) return { erro: 'Informe a data de abertura.' }
  if (prazo && !dataValida(prazo)) return { erro: 'Informe o prazo como uma data válida.' }
  return {
    dados: {
      cliente_id: clienteId,
      tipo,
      orgao,
      protocolo: textoOuNulo(form, 'protocolo'),
      status: status as StatusProcesso | undefined,
      data_abertura: dataAbertura,
      prazo,
      prazo_descricao: textoOuNulo(form, 'prazo_descricao'),
    },
  }
}

function atualizarQuadro() {
  revalidatePath('/processos')
}

export async function criarProcesso(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const lido = await ler(ctx, form, true)
  if ('erro' in lido) return lido
  try {
    await criar(ctx, 'processos', lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}

export async function alterarProcesso(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  // O helper não filtra `excluido_em`: quem recebe um id de fora confere antes de editar.
  if (!(await buscarProcesso(ctx.db, id))) return { erro: 'Processo não encontrado.' }
  const lido = await ler(ctx, form, false)
  if ('erro' in lido) return lido
  try {
    await alterar(ctx, 'processos', id, lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}

/** Muda só a situação (a coluna do quadro). O histórico guarda antes e depois, com o nome de quem mudou. */
export async function mudarStatus(id: string, status: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  if (!STATUS.includes(status)) return { erro: 'Escolha a situação do processo.' }
  if (!(await buscarProcesso(ctx.db, id))) return { erro: 'Processo não encontrado.' }
  try {
    await alterar(ctx, 'processos', id, { status })
  } catch (e) {
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}

/** Só acréscimo: a equipe adiciona andamento, não edita nem exclui (decisão desta fase). */
export async function adicionarAndamento(processoId: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  if (!(await buscarProcesso(ctx.db, processoId))) return { erro: 'Processo não encontrado.' }
  const data = texto(form, 'data')
  // O navegador envia a quebra de linha como \r\n: grava-se sempre \n.
  const descricao = texto(form, 'descricao')?.replace(/\r\n?/g, '\n')
  if (!data || !dataValida(data)) return { erro: 'Informe a data do andamento.' }
  if (!descricao) return { erro: 'Descreva o andamento.' }
  try {
    await criar(ctx, 'andamentos', { processo_id: processoId, data, descricao })
  } catch (e) {
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}

/**
 * Guarda o arquivo em `arquivos/` com nome gerado (`salvarAnexo`) e registra o nome que o usuário enviou, só
 * como texto de tela, em `nome_arquivo`.
 */
export async function enviarAnexo(processoId: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  if (!(await buscarProcesso(ctx.db, processoId))) return { erro: 'Processo não encontrado.' }
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: 'Escolha um arquivo para anexar.' }
  if (arquivo.size > LIMITE_ANEXO) return { erro: 'O arquivo passa de 10 MB.' }
  // O nome que a pessoa enviou, sem caminho: é só texto de tela e nunca entra num caminho em disco.
  const nome = nomeSeguro(arquivo.name)
  let caminho: string
  try {
    // Quem não pode escrever não deixa arquivo solto em disco.
    exigirPermissao(ctx.usuario, 'anexos', 'criacao')
    caminho = await salvarAnexo(arquivo.name, Buffer.from(await arquivo.arrayBuffer()))
  } catch (e) {
    return traduzir(e)
  }
  try {
    await criar(ctx, 'anexos', { processo_id: processoId, nome_arquivo: nome, caminho_storage: caminho })
  } catch (e) {
    // Sem a linha no banco o arquivo ficaria órfão.
    await rm(path.resolve('arquivos', caminho), { force: true })
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}

/** Exclusão lógica; só o administrador. O histórico do processo continua legível. */
export async function excluirProcesso(id: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  try {
    // A permissão vem antes de conferir o id: quem não pode não descobre nada.
    exigirPermissao(ctx.usuario, 'processos', 'exclusao')
    if (!(await buscarProcesso(ctx.db, id))) return { erro: 'Processo não encontrado.' }
    await excluir(ctx, 'processos', id)
  } catch (e) {
    return traduzir(e)
  }
  atualizarQuadro()
  return { ok: true }
}
