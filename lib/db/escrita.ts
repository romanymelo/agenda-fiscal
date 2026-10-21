import type { PGlite } from '@electric-sql/pglite'
import type { Acao, Usuario } from '../tipos'

export type Contexto = { db: PGlite; usuario: Usuario }

/** Falta de permissão, separada de erro de banco para as Server Actions distinguirem. */
export class SemPermissao extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'SemPermissao'
  }
}

// Permissões (spec 6), declarativas: admin faz tudo; membro cria e altera todo o resto,
// mas não exclui nada e não mexe na equipe nem na configuração do escritório.
const EXIGEM_ADMIN = {
  tabelas: new Set(['usuarios', 'configuracao']),
  acoes: new Set<Acao>(['exclusao']),
}

export function exigirPermissao(usuario: Usuario, tabela: string, acao: Acao): void {
  if (!usuario.ativo)
    throw new SemPermissao(`O usuário ${usuario.nome} está inativo e não pode escrever.`)
  if (usuario.papel === 'admin') return
  if (EXIGEM_ADMIN.tabelas.has(tabela))
    throw new SemPermissao(`Só o administrador pode escrever em ${tabela}.`)
  if (EXIGEM_ADMIN.acoes.has(acao))
    throw new SemPermissao('Só o administrador pode excluir registros.')
}

// Colunas geridas pelo próprio helper: o chamador nunca as informa, e elas ficam fora do
// histórico de criação. A chave primária entra na lista porque trocá-la desligaria o registro
// do seu próprio histórico, que fica pendurado no id.
const GERIDAS = new Set([
  'id',
  'criado_por',
  'criado_em',
  'atualizado_por',
  'atualizado_em',
  'excluido_por',
  'excluido_em',
])

// Tabelas em que este helper nunca escreve, por nenhum papel: o rastro só é gravado junto da
// escrita que o originou, nunca à mão.
const PROIBIDAS = new Set(['historico', 'migrations_aplicadas'])

// Quem executa: o banco ou a transação aberta sobre ele.
type Executor = Pick<PGlite, 'query'>
type Campos = Record<string, { antes: unknown; depois: unknown }>

// Lista branca de colunas com o tipo de cada uma, tirada do catálogo — nunca do chamador.
// O tipo serve para converter o valor recebido antes de comparar e de gravar.
async function colunasDe(tx: Executor, tabela: string): Promise<Map<string, string>> {
  if (PROIBIDAS.has(tabela))
    throw new Error(
      `O helper de escrita nunca escreve em ${tabela}: essa tabela é escriturada pelo próprio sistema.`,
    )
  const r = await tx.query<{ column_name: string; tipo: string }>(
    `select column_name, case when data_type = 'ARRAY' then udt_name else data_type end as tipo
     from information_schema.columns where table_schema = 'public' and table_name = $1`,
    [tabela],
  )
  if (r.rows.length === 0) throw new Error(`Tabela desconhecida: ${tabela}`)
  return new Map(r.rows.map((c) => [c.column_name, c.tipo]))
}

// Nomes dos campos recebidos, conferidos um a um contra a lista branca.
function conferirCampos(
  colunas: Map<string, string>,
  tabela: string,
  dados: Record<string, unknown>,
): string[] {
  const nomes = Object.keys(dados)
  for (const nome of nomes) {
    if (GERIDAS.has(nome))
      throw new Error(
        `As colunas geridas pelo helper de escrita (${[...GERIDAS].join(', ')}) ` +
          `não podem vir do chamador: ${tabela}.${nome}.`,
      )
    if (!colunas.has(nome)) throw new Error(`Coluna desconhecida em ${tabela}: ${nome}`)
  }
  return nomes
}

// As colunas de auditoria que a ação vai preencher precisam existir na tabela.
function exigirAuditoria(colunas: Map<string, string>, tabela: string, exigidas: string[]): void {
  for (const coluna of exigidas)
    if (!colunas.has(coluna))
      throw new Error(
        `A tabela ${tabela} não tem a coluna de auditoria ${coluna}: o helper de escrita não escreve nela.`,
      )
}

// Chave com valor undefined é campo não informado, e não "limpar o campo": fica de fora.
// null explícito continua significando limpar.
function informados(dados: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined))
}

async function registroAtual<T>(tx: Executor, tabela: string, id: string): Promise<T> {
  const r = await tx.query<Record<string, unknown>>(`select * from "${tabela}" where id = $1`, [id])
  if (r.rows.length === 0) throw new Error(`Registro inexistente em ${tabela}: ${id}`)
  return r.rows[0] as T
}

async function gravarHistorico(
  tx: Executor,
  ctx: Contexto,
  tabela: string,
  registroId: string,
  acao: Acao,
  camposAlterados: Campos | null,
): Promise<void> {
  await tx.query(
    `insert into historico (tabela, registro_id, acao, campos_alterados, usuario_id, usuario_nome)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      tabela,
      registroId,
      acao,
      camposAlterados === null ? null : JSON.stringify(camposAlterados),
      ctx.usuario.id,
      ctx.usuario.nome,
    ],
  )
}

export async function criar<T>(
  ctx: Contexto,
  tabela: string,
  dados: Record<string, unknown>,
): Promise<T> {
  return ctx.db.transaction(async (tx) => {
    exigirPermissao(ctx.usuario, tabela, 'criacao')
    const colunas = await colunasDe(tx, tabela)
    exigirAuditoria(colunas, tabela, ['criado_por'])
    const informado = informados(dados)
    const recebidos = conferirCampos(colunas, tabela, informado)
    const campos = [...recebidos, 'criado_por']
    const valores = [...recebidos.map((c) => informado[c]), ctx.usuario.id]
    const r = await tx.query<Record<string, unknown>>(
      `insert into "${tabela}" (${campos.map((c) => `"${c}"`).join(', ')})
       values (${campos.map((c, i) => `$${i + 1}::${colunas.get(c)}`).join(', ')})
       returning *, to_jsonb("${tabela}") as _linha`,
      valores,
    )
    // Em criação o histórico guarda os valores iniciais do registro (spec 4.2), já no formato
    // canônico do jsonb, com "antes" nulo para manter a mesma forma da alteração. As colunas de
    // auditoria e o id ficam de fora: quem criou e quando já são o usuario_nome e o em da linha,
    // e o id é a chave do próprio histórico.
    const linha = r.rows[0]._linha as Record<string, unknown>
    const iniciais = Object.fromEntries(
      Object.entries(linha)
        .filter(([k]) => !GERIDAS.has(k))
        .map(([k, v]) => [k, { antes: null, depois: v }]),
    )
    await gravarHistorico(tx, ctx, tabela, linha.id as string, 'criacao', iniciais)
    delete r.rows[0]._linha
    return r.rows[0] as T
  })
}

export async function alterar<T>(
  ctx: Contexto,
  tabela: string,
  id: string,
  dados: Record<string, unknown>,
): Promise<T> {
  return ctx.db.transaction(async (tx) => {
    exigirPermissao(ctx.usuario, tabela, 'alteracao')
    const colunas = await colunasDe(tx, tabela)
    exigirAuditoria(colunas, tabela, ['atualizado_por', 'atualizado_em'])
    const informado = informados(dados)
    const campos = conferirCampos(colunas, tabela, informado)
    // Nenhum campo é o caso degenerado de "nada mudou": devolve o registro como está.
    if (campos.length === 0) return registroAtual<T>(tx, tabela, id)
    // Quem compara é o Postgres: o valor recebido é convertido ao tipo da coluna e confrontado
    // com "is distinct from", então '2026-10-20' e a data equivalente do banco não contam
    // como mudança. "antes" e "depois" saem como jsonb, no mesmo formato canônico.
    const selecoes = campos.flatMap((c, i) => [
      `("${c}" is distinct from $${i + 1}::${colunas.get(c)}) as m${i}`,
      `to_jsonb("${c}") as a${i}`,
      `to_jsonb($${i + 1}::${colunas.get(c)}) as d${i}`,
    ])
    const comparacao = await tx.query<Record<string, unknown>>(
      `select ${selecoes.join(', ')} from "${tabela}" where id = $${campos.length + 1}`,
      [...campos.map((c) => informado[c]), id],
    )
    if (comparacao.rows.length === 0) throw new Error(`Registro inexistente em ${tabela}: ${id}`)
    const cmp = comparacao.rows[0]
    const mudaram = campos
      .map((nome, i) => ({ nome, antes: cmp[`a${i}`], depois: cmp[`d${i}`], mudou: cmp[`m${i}`] }))
      .filter((c) => c.mudou === true)

    if (mudaram.length === 0) return registroAtual<T>(tx, tabela, id)

    const n = mudaram.length
    const r = await tx.query<Record<string, unknown>>(
      `update "${tabela}" set
         ${mudaram.map((c, i) => `"${c.nome}" = $${i + 1}::${colunas.get(c.nome)}`).join(', ')},
         "atualizado_por" = $${n + 1}::${colunas.get('atualizado_por')}, "atualizado_em" = now()
       where id = $${n + 2} returning *`,
      [...mudaram.map((c) => informado[c.nome]), ctx.usuario.id, id],
    )
    const alteracoes = Object.fromEntries(
      mudaram.map((c) => [c.nome, { antes: c.antes, depois: c.depois }]),
    )
    await gravarHistorico(tx, ctx, tabela, id, 'alteracao', alteracoes)
    return r.rows[0] as T
  })
}

// Exclusão é sempre lógica: a linha fica no banco, com quem excluiu e quando.
export async function excluir(ctx: Contexto, tabela: string, id: string): Promise<void> {
  await ctx.db.transaction(async (tx) => {
    exigirPermissao(ctx.usuario, tabela, 'exclusao')
    const colunas = await colunasDe(tx, tabela)
    exigirAuditoria(colunas, tabela, ['excluido_por', 'excluido_em'])
    // "excluido_em is null": excluir duas vezes não sobrescreve quem excluiu de fato.
    const r = await tx.query<{ id: string }>(
      `update "${tabela}" set "excluido_por" = $1::${colunas.get('excluido_por')},
         "excluido_em" = now() where id = $2 and "excluido_em" is null returning id`,
      [ctx.usuario.id, id],
    )
    if (r.rows.length === 0) throw new Error(`Registro inexistente em ${tabela}: ${id}`)
    await gravarHistorico(tx, ctx, tabela, id, 'exclusao', null)
  })
}
