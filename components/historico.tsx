import { connection } from 'next/server'
import { Suspense } from 'react'
import { historicoDoRegistro, type LinhaHistorico } from '@/lib/db/historico'
import { formatarBR, formatarDataHoraBR } from '@/lib/regras/data'
import { ROTULO_REGIME, type Acao } from '@/lib/tipos'

// Histórico de um registro, para qualquer tela. É Server Component e lê sozinho: quem usa só
// passa a tabela e o id. Nada de cliente aqui dentro.
//
// Os nomes de campo que chegam do banco (`codigo_dominio`) viram rótulos que a equipe lê.
// Uma tela nova acrescenta aqui os seus campos; o que não estiver na lista aparece com o nome da
// coluna sem os sublinhados, para nunca mostrar um identificador cru.
export const ROTULOS_DE_CAMPO: Record<string, string> = {
  nome: 'Nome',
  codigo_dominio: 'Código do Domínio',
  cnpj: 'CNPJ',
  regime: 'Regime',
  uf: 'UF',
  municipio: 'Município',
  particularidades: 'Particularidades',
  ativo: 'Situação',
}

// Valores que o banco guarda por código e a equipe lê por nome, por campo.
export const ROTULOS_DE_VALOR: Record<string, Record<string, string>> = {
  regime: ROTULO_REGIME,
  ativo: { true: 'Ativo', false: 'Inativo' },
}

const VERBO: Record<Acao, string> = {
  criacao: 'criou',
  alteracao: 'alterou',
  exclusao: 'excluiu',
}

function rotuloDoCampo(campo: string): string {
  const r = ROTULOS_DE_CAMPO[campo]
  if (r) return r
  const solto = campo.replace(/_/g, ' ')
  return solto.charAt(0).toUpperCase() + solto.slice(1)
}

// Texto do valor, ou `null` para vazio (a tela escreve "(vazio)").
function textoDoValor(campo: string, v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v)
  const rotulado = ROTULOS_DE_VALOR[campo]?.[s]
  if (rotulado) return rotulado
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? formatarBR(s) : s
}

export function Historico({ tabela, registroId }: { tabela: string; registroId: string }) {
  return (
    <section aria-label="Histórico" className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">Histórico</h3>
      {/* Lê o banco: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando o histórico…</p>}>
        <Linhas tabela={tabela} registroId={registroId} />
      </Suspense>
    </section>
  )
}

async function Linhas({ tabela, registroId }: { tabela: string; registroId: string }) {
  await connection()
  const linhas = await historicoDoRegistro(tabela, registroId)
  if (linhas.length === 0) return <p className="text-sm text-[#4B5563]">Nenhum registro ainda.</p>
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {linhas.map((l, i) => (
        <Linha key={`${l.em}-${i}`} linha={l} maisRecente={i === 0} ultima={i === linhas.length - 1} />
      ))}
    </ol>
  )
}

function Linha({
  linha,
  maisRecente,
  ultima,
}: {
  linha: LinhaHistorico
  maisRecente: boolean
  ultima: boolean
}) {
  // Na criação o histórico guarda os valores iniciais, que a tela já mostra: só a alteração detalha.
  const mudancas = linha.acao === 'alteracao' ? Object.entries(linha.camposAlterados ?? {}) : []
  return (
    <li className="flex gap-3">
      <span className="flex w-3.5 flex-none flex-col items-center">
        <span
          aria-hidden="true"
          className={`mt-[3px] size-3 flex-none rounded-full border-2 ${
            maisRecente ? 'border-[#0F766E] bg-[#0F766E]' : 'border-[#9CA3AF] bg-white'
          }`}
        />
        <span aria-hidden="true" className={`mt-0.5 w-0.5 flex-1 ${ultima ? 'bg-transparent' : 'bg-[#E5E7EB]'}`} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-3.5">
        <span className="text-xs font-semibold text-[#4B5563]">{formatarDataHoraBR(linha.em)}</span>
        <span className="text-sm leading-snug">
          <strong className="font-semibold">{linha.usuarioNome}</strong> {VERBO[linha.acao]}
          {linha.acao === 'alteracao' ? ' o cadastro' : ' o registro'}
        </span>
        {mudancas.length > 0 && (
          <dl className="m-0 mt-1 flex flex-col gap-2.5">
            {mudancas.map(([campo, { antes, depois }]) => (
              <div key={campo} className="flex min-w-0 flex-col gap-1">
                <dt className="text-xs font-semibold text-[#374151]">{rotuloDoCampo(campo)}</dt>
                <dd className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Valor rotulo="Antes" campo={campo} valor={antes} />
                  <Valor rotulo="Depois" campo={campo} valor={depois} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  )
}

function Valor({ rotulo, campo, valor }: { rotulo: string; campo: string; valor: unknown }) {
  const texto = textoDoValor(campo, valor)
  return (
    <div className="min-w-0 rounded-lg bg-[#F3F4F6] px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#4B5563]">{rotulo}</div>
      {texto === null ? (
        <div className="text-sm italic text-[#6B7280]">(vazio)</div>
      ) : (
        <div className="whitespace-pre-wrap break-words text-sm">{texto}</div>
      )}
    </div>
  )
}
