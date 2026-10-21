import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Historico } from '@/components/historico'
import { SeloSituacao } from '@/components/selo-situacao'
import { obrigacaoDaTela } from '@/lib/db/obrigacoes'
import { formatarDataHoraBR } from '@/lib/regras/data'
import { ROTULO_PERIODICIDADE, ROTULO_REGIME, ROTULO_REGRA } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'
import { alterarObrigacao } from '../acoes'
import { EditarObrigacao, ExcluirObrigacao } from '../formularios'
import { descreverCompetencia, descreverVencimento, formatarObrigacao, ROTULOS_OBRIGACAO } from '../rotulos'
import { SeloEsfera } from '../selo-esfera'

export const metadata = { title: 'Obrigação — Agenda Fiscal' }

export default function DetalheDaObrigacao({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Link
        href="/cadastros/obrigacoes"
        className="self-start text-sm font-semibold text-mar hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
      >
        ← Obrigações
      </Link>
      {/* Lê o banco e o cookie: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando a obrigação…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  const voce = await exigirUsuario()
  const { id } = await params
  const o = await obrigacaoDaTela(id)
  if (!o) notFound()
  const dados: [string, string][] = [
    ['Periodicidade', ROTULO_PERIODICIDADE[o.periodicidade]],
    ['Vencimento', descreverVencimento(o)],
    ['Regra de vencimento', ROTULO_REGRA[o.regraDiaNaoUtil]],
    ['Competência', descreverCompetencia(o.competenciaDefasagem)],
    ['Base legal', o.baseLegal ?? '—'],
    [
      'Última atualização',
      o.atualizadoEm ? `${formatarDataHoraBR(o.atualizadoEm)} por ${o.atualizadoPorNome ?? '—'}` : '—',
    ],
  ]
  return (
    <article className="flex flex-col gap-5 rounded-[14px] border border-linha bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="break-words text-[24px] font-bold tracking-tight">{o.nome}</h1>
        <div className="flex flex-wrap gap-2">
          <SeloEsfera esfera={o.esfera} />
          <SeloSituacao ativo={o.ativo} />
        </div>
      </div>

      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-suave">{rotulo}</dt>
            <dd className="m-0 break-words text-sm font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Regimes aplicáveis" className="flex flex-col gap-1">
        <h2 className="text-sm font-bold">Regimes aplicáveis</h2>
        <p className="m-0 text-sm">
          {o.regimesAplicaveis?.length
            ? o.regimesAplicaveis.map((r) => ROTULO_REGIME[r]).join(', ')
            : 'Não informado'}
        </p>
        <p className="m-0 text-xs text-suave">
          Só informativo: as obrigações não são ligadas a clientes aqui, então nada no calendário é filtrado por regime.
        </p>
      </section>

      <section aria-label="Observação" className="flex flex-col gap-1">
        <h2 className="text-sm font-bold">Observação</h2>
        {o.observacao ? (
          <p className="m-0 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{o.observacao}</p>
        ) : (
          <p className="m-0 text-sm text-suave">Nada registrado.</p>
        )}
      </section>

      <EditarObrigacao obrigacao={o} alterar={alterarObrigacao} />
      {/* Só o administrador exclui: para o membro o botão nem existe. */}
      {voce.papel === 'admin' && <ExcluirObrigacao id={o.id} nome={o.nome} />}

      <hr className="border-linha" />
      <Historico tabela="obrigacoes" registroId={o.id} rotulos={ROTULOS_OBRIGACAO} formatar={formatarObrigacao} />
    </article>
  )
}
