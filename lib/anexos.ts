import type { PGlite } from '@electric-sql/pglite'
import { lerAnexo } from './arquivos'
import { obterBanco } from './db/conexao'
import { buscarAnexo } from './db/processos'

// Download de anexo. A rota recebe o ID do anexo, nunca um caminho: a linha de `anexos` (não excluída, de
// processo não excluído) diz qual arquivo é, e `lerAnexo` confirma que ele está dentro de `arquivos/`.

function texto(mensagem: string, status: number): Response {
  return new Response(mensagem, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

// `attachment` com o nome que a pessoa enviou. Cabeçalho só aceita ASCII: `filename` leva uma versão sem acento
// (clientes antigos) e `filename*` a versão UTF-8 codificada (RFC 5987/6266).
function disposicao(nome: string): string {
  const ascii = nome.replace(/[^\x20-\x7e]|["\\%;]/g, '_')
  const utf8 = encodeURIComponent(nome).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

/** Resposta de download do anexo `id`; erros em português, nunca exceção crua. */
export async function respostaDoAnexo(db: PGlite, id: string): Promise<Response> {
  const anexo = await buscarAnexo(db, id)
  if (!anexo) return texto('Anexo não encontrado.', 404)
  const lido = await lerAnexo(anexo.caminhoStorage)
  // Caminho que escapa de arquivos/: não se diz nada além de "não encontrado".
  if ('erro' in lido) {
    return lido.erro === 'fora'
      ? texto('Anexo não encontrado.', 404)
      : texto('O arquivo deste anexo não está mais no disco.', 404)
  }
  return new Response(new Uint8Array(lido.conteudo), {
    headers: {
      // Sempre binário genérico + attachment + nosniff: o navegador baixa, nunca interpreta o conteúdo.
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': disposicao(anexo.nomeArquivo),
      'Content-Length': String(lido.conteudo.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}

/** Como `respostaDoAnexo`, abrindo o banco: a rota não importa `obterBanco`. */
export async function respostaDoAnexoDaTela(id: string): Promise<Response> {
  return respostaDoAnexo(await obterBanco(), id)
}
