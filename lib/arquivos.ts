import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ErroDeFormulario } from './formulario'

// Anexos de processo, locais nesta fase: pasta `arquivos/` na raiz do projeto (fora do Git). O caminho que
// `salvarAnexo` devolve é relativo a ela e tem o formato que o Supabase Storage usará depois.
//
// Regra de ouro: o nome em disco é GERADO (uuid + extensão da lista branca). O nome que o usuário enviou
// vive só na coluna `nome_arquivo`, é só texto de tela e nunca entra num caminho.

const PASTA = 'arquivos'

/** Extensões aceitas. Nada que um navegador execute (html, svg, js…). */
export const EXTENSOES_ACEITAS: ReadonlySet<string> = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.odt', '.ods', '.txt', '.csv', '.xml',
])

/**
 * Nome de arquivo sem caminho: fica só o último trecho depois de `/` ou `\`, sem caracteres de controle, e
 * nunca devolve vazio, `.` nem `..` (sequências de pontos viram um ponto só; quem sobra sem nada vira "arquivo").
 */
export function nomeSeguro(original: string): string {
  const ultimo = original.split(/[\\/]/).pop() ?? ''
  const limpo = ultimo
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\.{2,}/g, '.')
    .trim()
  return /^\.*$/.test(limpo) ? 'arquivo' : limpo.slice(0, 200)
}

/**
 * Grava o conteúdo em `arquivos/` com nome gerado e devolve o caminho relativo gravado (por exemplo
 * `3f2a….pdf`). A extensão vem do nome enviado, mas só passa se estiver na lista branca; fora dela, recusa.
 */
export async function salvarAnexo(original: string, conteudo: Buffer): Promise<string> {
  const extensao = path.extname(nomeSeguro(original)).toLowerCase()
  if (!EXTENSOES_ACEITAS.has(extensao))
    throw new ErroDeFormulario(
      `Tipo de arquivo não aceito${extensao ? ` (${extensao})` : ''}. Aceitos: ${[...EXTENSOES_ACEITAS].join(', ')}.`,
    )
  const nome = `${randomUUID()}${extensao}`
  const pasta = path.resolve(PASTA)
  await mkdir(pasta, { recursive: true })
  // `wx`: nunca sobrescreve um arquivo que já exista.
  await writeFile(path.join(pasta, nome), conteudo, { flag: 'wx' })
  return nome
}
