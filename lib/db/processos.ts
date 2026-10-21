import type { PGlite } from '@electric-sql/pglite'
import { normalizar } from '../regras/feriados-aplicaveis'
import type { Andamento, Anexo, Data, Processo, StatusProcesso } from '../tipos'
import { normalizada } from './clientes'
import { obterBanco } from './conexao'
import { UUID } from './usuarios'

// Todo o SQL de processo, andamento e anexo mora aqui. Nada de tela nem de Server Action monta consulta.
// Data pura sai como texto 'AAAA-MM-DD' (to_char), nunca como Date: não tem fuso.

type Linha = {
  id: string
  cliente_id: string
  cliente_nome: string
  tipo: string
  orgao: string
  protocolo: string | null
  status: StatusProcesso
  data_abertura: Data
  prazo: Data | null
  prazo_descricao: string | null
  atualizado_em: Date | null
}

// snake_case do banco para camelCase da aplicação: a conversão mora aqui.
function paraProcesso(l: Linha): Processo {
  return {
    id: l.id,
    clienteId: l.cliente_id,
    clienteNome: l.cliente_nome,
    tipo: l.tipo,
    orgao: l.orgao,
    protocolo: l.protocolo,
    status: l.status,
    dataAbertura: l.data_abertura,
    prazo: l.prazo,
    prazoDescricao: l.prazo_descricao,
    atualizadoEm: l.atualizado_em ? l.atualizado_em.toISOString() : null,
  }
}

// O cliente entra pela junção sem filtrar `excluido_em`: o processo continua mostrando o nome de um cliente
// excluído depois. A última atualização é a mais recente entre alterar o processo e registrar um andamento
// (`greatest` ignora o que for nulo).
const SELECAO = `select p.id, p.cliente_id, c.nome as cliente_nome, p.tipo, p.orgao, p.protocolo, p.status,
                        to_char(p.data_abertura, 'YYYY-MM-DD') as data_abertura,
                        to_char(p.prazo, 'YYYY-MM-DD') as prazo, p.prazo_descricao,
                        greatest(coalesce(p.atualizado_em, p.criado_em),
                                 (select max(a.criado_em) from andamentos a
                                  where a.processo_id = p.id and a.excluido_em is null)) as atualizado_em
                 from processos p join clientes c on c.id = p.cliente_id`

/**
 * Processos não excluídos, com prazo mais próximo primeiro e os sem prazo no fim. `busca` procura no nome do
 * cliente, no órgão e no protocolo, sem diferenciar caixa nem acento.
 */
export async function listarProcessos(db: PGlite, busca?: string): Promise<Processo[]> {
  const termo = normalizar(busca ?? '')
  const r = await db.query<Linha>(
    `${SELECAO}
     where p.excluido_em is null
       and ($1::text = ''
            or strpos(${normalizada('c.nome')}, $1::text) > 0
            or strpos(${normalizada('p.orgao')}, $1::text) > 0
            or strpos(${normalizada('p.protocolo')}, $1::text) > 0)
     order by p.prazo asc nulls last, p.data_abertura desc, p.id`,
    [termo],
  )
  return r.rows.map(paraProcesso)
}

/** Um processo não excluído com os andamentos (data crescente) e os anexos, ou `null` (inclusive para id que não é uuid). */
export async function buscarProcesso(
  db: PGlite,
  id: string,
): Promise<(Processo & { andamentos: Andamento[]; anexos: Anexo[] }) | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<Linha>(`${SELECAO} where p.id = $1 and p.excluido_em is null`, [id])
  if (!r.rows[0]) return null
  const andamentos = await db.query<{ id: string; data: Data; descricao: string; criado_por_nome: string }>(
    `select a.id, to_char(a.data, 'YYYY-MM-DD') as data, a.descricao, u.nome as criado_por_nome
     from andamentos a join usuarios u on u.id = a.criado_por
     where a.processo_id = $1 and a.excluido_em is null
     order by a.data, a.criado_em, a.id`,
    [id],
  )
  const anexos = await db.query<{
    id: string
    nome_arquivo: string
    caminho_storage: string
    criado_por_nome: string
  }>(
    `select x.id, x.nome_arquivo, x.caminho_storage, u.nome as criado_por_nome
     from anexos x join usuarios u on u.id = x.criado_por
     where x.processo_id = $1 and x.excluido_em is null
     order by x.criado_em, x.id`,
    [id],
  )
  return {
    ...paraProcesso(r.rows[0]),
    andamentos: andamentos.rows.map((a) => ({
      id: a.id,
      data: a.data,
      descricao: a.descricao,
      criadoPorNome: a.criado_por_nome,
    })),
    anexos: anexos.rows.map((a) => ({
      id: a.id,
      nomeArquivo: a.nome_arquivo,
      caminhoStorage: a.caminho_storage,
      criadoPorNome: a.criado_por_nome,
    })),
  }
}

// As páginas não importam `obterBanco`: estas duas abrem o banco por elas.
export async function processosDaTela(busca?: string): Promise<Processo[]> {
  return listarProcessos(await obterBanco(), busca)
}

export async function processoDaTela(id: string) {
  return buscarProcesso(await obterBanco(), id)
}

/** Anexo para download: só se a linha e o processo não foram excluídos. `null` também para id que não é uuid. */
export async function buscarAnexo(
  db: PGlite,
  id: string,
): Promise<{ nomeArquivo: string; caminhoStorage: string } | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<{ nome_arquivo: string; caminho_storage: string }>(
    `select x.nome_arquivo, x.caminho_storage
     from anexos x join processos p on p.id = x.processo_id
     where x.id = $1 and x.excluido_em is null and p.excluido_em is null`,
    [id],
  )
  return r.rows[0] ? { nomeArquivo: r.rows[0].nome_arquivo, caminhoStorage: r.rows[0].caminho_storage } : null
}
