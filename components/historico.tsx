import { connection } from 'next/server'
import { Suspense } from 'react'
import { historicoDoRegistro, type LinhaHistorico } from '@/lib/db/historico'
import { formatarBR, formatarDataHoraBR } from '@/lib/regras/data'
import type { Acao } from '@/lib/tipos'

// Histórico de um registro, para qualquer tela. É Server Component e lê sozinho: quem usa passa a
// tabela e o id, e, para a equipe ler "Código do Domínio" em vez de `codigo_dominio`, os rótulos.
// Nada de cliente (`'use client'`) aqui dentro, e nada de tela específica: os rótulos de cada tabela
// moram na tela que monta o histórico.
//
// ATENÇÃO, acesso: este componente NÃO se protege sozinho. Ele mostra os valores antigos e novos de
// qualquer tabela que lhe pedirem. A barreira de acesso é a página que o monta (`exigirUsuario()`),
// e quem o usar numa tela nova tem de garantir que quem vê a tela pode ver aquele registro.
//
// Uso:
//   // O nome de um registro relacionado (cliente no lugar do uuid) sai de UM mapa carregado antes, pela página,
//   // numa consulta só. `formatar` roda uma vez por valor (duas por campo alterado), em paralelo, sem lote nem
//   // cache: se ele consultar o banco, cada linha do histórico dispara várias consultas ao mesmo tempo.
//   const nomes = new Map((await listarClientes(db)).map((c) => [c.id, c.nome]))
//   <Historico
//     tabela="processos"
//     registroId={processo.id}
//     rotulos={{ orgao: 'Órgão', prazo: 'Prazo', cliente_id: 'Cliente' }}
//     formatar={(campo, valor) => (campo === 'cliente_id' ? nomes.get(String(valor)) : undefined)}
//   />

/** Nome de coluna do banco (`codigo_dominio`) para o rótulo que a equipe lê ("Código do Domínio"). */
export type Rotulos = Record<string, string>

/**
 * Texto de um valor de um campo, a critério da tela. Devolva:
 * - uma `string` para mostrar exatamente aquele texto (ex.: o nome do cliente para um `cliente_id`,
 *   "Em andamento" para `em_andamento`);
 * - `null` para mostrar "(vazio)";
 * - `undefined` para deixar o componente formatar do jeito padrão.
 * É chamada uma vez por valor, antes e depois de cada alteração, em paralelo e sem lote nem cache; `valor`
 * é o que o histórico guardou (jsonb: texto, número, booleano, `null`...). Prefira uma função SÍNCRONA que
 * lê de um `Map` já carregado pela página (nome do cliente, por exemplo). Pode ser assíncrona, mas nunca
 * consulte o banco a cada chamada: são duas consultas simultâneas por campo alterado, por linha.
 */
export type FormatarValor = (
  campo: string,
  valor: unknown,
) => string | null | undefined | Promise<string | null | undefined>

type Props = {
  tabela: string
  registroId: string
  /** Rótulos por nome de coluna. O que não estiver aqui aparece como o nome da coluna sem os sublinhados. */
  rotulos?: Rotulos
  /** Formatação de valores por campo; sem ela (ou devolvendo `undefined`), vale o padrão abaixo. */
  formatar?: FormatarValor
}

const VERBO: Record<Acao, string> = {
  criacao: 'criou',
  alteracao: 'alterou',
  exclusao: 'excluiu',
}

// Sem rótulo passado: o nome da coluna legível, nunca `cliente_id` cru.
function rotuloDoCampo(campo: string, rotulos: Rotulos | undefined): string {
  const r = rotulos?.[campo]
  if (r) return r
  const solto = campo.replace(/_/g, ' ')
  return solto.charAt(0).toUpperCase() + solto.slice(1)
}

// Formatação padrão: vazio, sim/não, data 'AAAA-MM-DD' como dd/mm/aaaa, o resto como texto.
function textoPadrao(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? formatarBR(s) : s
}

async function textoDoValor(campo: string, v: unknown, formatar?: FormatarValor): Promise<string | null> {
  const dela = formatar ? await formatar(campo, v) : undefined
  return dela === undefined ? textoPadrao(v) : dela
}

type Mudanca = { campo: string; rotulo: string; antes: string | null; depois: string | null }

// Só a alteração detalha campos (a criação guarda os valores iniciais, que a tela já mostra).
async function mudancasDe(linha: LinhaHistorico, rotulos?: Rotulos, formatar?: FormatarValor): Promise<Mudanca[]> {
  if (linha.acao !== 'alteracao') return []
  return Promise.all(
    Object.entries(linha.camposAlterados ?? {}).map(async ([campo, { antes, depois }]) => ({
      campo,
      rotulo: rotuloDoCampo(campo, rotulos),
      antes: await textoDoValor(campo, antes, formatar),
      depois: await textoDoValor(campo, depois, formatar),
    })),
  )
}

export function Historico({ tabela, registroId, rotulos, formatar }: Props) {
  return (
    <section aria-label="Histórico" className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">Histórico</h3>
      {/* Lê o banco: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando o histórico…</p>}>
        <Linhas tabela={tabela} registroId={registroId} rotulos={rotulos} formatar={formatar} />
      </Suspense>
    </section>
  )
}

async function Linhas({ tabela, registroId, rotulos, formatar }: Props) {
  await connection()
  const linhas = await historicoDoRegistro(tabela, registroId)
  if (linhas.length === 0) return <p className="text-sm text-suave">Nenhum registro ainda.</p>
  const mudancas = await Promise.all(linhas.map((l) => mudancasDe(l, rotulos, formatar)))
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {linhas.map((l, i) => (
        <Linha
          key={`${l.em}-${i}`}
          linha={l}
          mudancas={mudancas[i]}
          maisRecente={i === 0}
          ultima={i === linhas.length - 1}
        />
      ))}
    </ol>
  )
}

function Linha({
  linha,
  mudancas,
  maisRecente,
  ultima,
}: {
  linha: LinhaHistorico
  mudancas: Mudanca[]
  maisRecente: boolean
  ultima: boolean
}) {
  return (
    <li className="flex gap-3">
      <span className="flex w-3.5 flex-none flex-col items-center">
        <span
          aria-hidden="true"
          className={`mt-[3px] size-3 flex-none rounded-full border-2 ${
            maisRecente ? 'border-mar bg-mar' : 'border-apagado bg-white'
          }`}
        />
        <span aria-hidden="true" className={`mt-0.5 w-0.5 flex-1 ${ultima ? 'bg-transparent' : 'bg-linha'}`} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-3.5">
        <span className="text-xs font-semibold text-suave">{formatarDataHoraBR(linha.em)}</span>
        <span className="text-sm leading-snug">
          <strong className="font-semibold">{linha.usuarioNome}</strong> {VERBO[linha.acao]}
          {linha.acao === 'alteracao' ? ' o cadastro' : ' o registro'}
        </span>
        {mudancas.length > 0 && (
          <dl className="m-0 mt-1 flex flex-col gap-2.5">
            {mudancas.map((m) => (
              <div key={m.campo} className="flex min-w-0 flex-col gap-1">
                <dt className="text-xs font-semibold text-corpo">{m.rotulo}</dt>
                <dd className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Valor rotulo="Antes" texto={m.antes} />
                  <Valor rotulo="Depois" texto={m.depois} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  )
}

function Valor({ rotulo, texto }: { rotulo: string; texto: string | null }) {
  return (
    <div className="min-w-0 rounded-lg bg-espuma px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-suave">{rotulo}</div>
      {texto === null ? (
        <div className="text-sm italic text-apagado">(vazio)</div>
      ) : (
        <div className="whitespace-pre-wrap break-words text-sm">{texto}</div>
      )}
    </div>
  )
}
