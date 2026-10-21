import type { PGlite } from '@electric-sql/pglite'
import { normalizar } from '../regras/feriados-aplicaveis'
import type { Cliente, Regime } from '../tipos'
import { obterBanco } from './conexao'
import { UUID } from './usuarios'

// O PGlite não tem a extensão `unaccent`. A coluna é normalizada no SQL com `translate()` dos
// acentos (maiúsculos e minúsculos, porque `lower()` pode não tratar letras acentuadas conforme o
// locale) e `lower()`; o termo digitado é normalizado em JS pela mesma regra de `normalizar`.
const COM_ACENTO = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ'
const SEM_ACENTO = 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'
export const normalizada = (coluna: string) =>
  `lower(translate(coalesce(${coluna}, ''), '${COM_ACENTO}', '${SEM_ACENTO}'))`

type Linha = {
  id: string
  nome: string
  codigo_dominio: string | null
  cnpj: string | null
  regime: Regime
  uf: string
  municipio: string
  particularidades: string | null
  ativo: boolean
  atualizado_em: Date | null
  atualizado_por_nome: string | null
}

// snake_case do banco para camelCase da aplicação: a conversão mora aqui.
function paraCliente(l: Linha): Cliente {
  return {
    id: l.id,
    nome: l.nome,
    codigoDominio: l.codigo_dominio,
    cnpj: l.cnpj,
    regime: l.regime,
    uf: l.uf,
    municipio: l.municipio,
    particularidades: l.particularidades,
    ativo: l.ativo,
    atualizadoEm: l.atualizado_em ? l.atualizado_em.toISOString() : null,
    atualizadoPorNome: l.atualizado_por_nome,
  }
}

const SELECAO = `select c.id, c.nome, c.codigo_dominio, c.cnpj, c.regime, c.uf, c.municipio, c.particularidades,
                        c.ativo, c.atualizado_em, u.nome as atualizado_por_nome
                 from clientes c left join usuarios u on u.id = c.atualizado_por`

/**
 * Clientes não excluídos, em ordem de nome. Só os ativos, salvo `incluirInativos` (inativo é cliente que
 * saiu do escritório: some da lista do dia a dia, mas não perde o histórico). `busca` procura em nome, código do Domínio e CNPJ,
 * sem diferenciar caixa nem acento; o CNPJ é comparado só pelos dígitos, com ou sem máscara.
 */
export async function listarClientes(
  db: PGlite,
  busca?: string,
  { incluirInativos = false }: { incluirInativos?: boolean } = {},
): Promise<Cliente[]> {
  const termo = normalizar(busca ?? '')
  // Só uma busca feita de dígitos e pontuação de máscara vale também como CNPJ: "Loja 2" não deve
  // trazer todo cliente cujo CNPJ tenha um 2.
  const digitos = /^[\d.\-/\s]+$/.test(termo) ? termo.replace(/\D/g, '') : ''
  const r = await db.query<Linha>(
    `${SELECAO}
     where c.excluido_em is null
       and ($3::boolean or c.ativo)
       and ($1::text = ''
            or strpos(${normalizada('c.nome')}, $1::text) > 0
            or strpos(${normalizada('c.codigo_dominio')}, $1::text) > 0
            or ($2::text <> '' and strpos(regexp_replace(coalesce(c.cnpj, ''), '[^0-9]', '', 'g'), $2::text) > 0))
     order by ${normalizada('c.nome')}, c.id`,
    [termo, digitos, incluirInativos],
  )
  return r.rows.map(paraCliente)
}

/** Um cliente não excluído, ou `null` (inclusive para id que não tem forma de uuid). */
export async function buscarCliente(db: PGlite, id: string): Promise<Cliente | null> {
  if (!UUID.test(id)) return null
  const r = await db.query<Linha>(`${SELECAO} where c.id = $1 and c.excluido_em is null`, [id])
  return r.rows[0] ? paraCliente(r.rows[0]) : null
}

// As páginas não importam `obterBanco`: estas duas abrem o banco por elas.
export async function clientesDaTela(
  busca?: string,
  opcoes?: { incluirInativos?: boolean },
): Promise<Cliente[]> {
  return listarClientes(await obterBanco(), busca, opcoes)
}

export async function clienteDaTela(id: string): Promise<Cliente | null> {
  return buscarCliente(await obterBanco(), id)
}
