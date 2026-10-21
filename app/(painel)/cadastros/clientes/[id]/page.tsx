import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Historico } from '@/components/historico'
import { SeloSituacao } from '@/components/selo-situacao'
import { clienteDaTela } from '@/lib/db/clientes'
import { formatarDataHoraBR } from '@/lib/regras/data'
import { ROTULO_REGIME } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'
import { alterarCliente } from '../acoes'
import { EditarCliente, ExcluirCliente } from '../formularios'
import { formatarCliente, ROTULOS_CLIENTE } from '../rotulos'

export const metadata = { title: 'Cliente — Agenda Fiscal' }

export default function DetalheDoCliente({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Link
        href="/cadastros/clientes"
        className="self-start text-sm font-semibold text-mar hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
      >
        ← Clientes
      </Link>
      {/* Lê o banco e o cookie: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando o cliente…</p>}>
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
  const cliente = await clienteDaTela(id)
  if (!cliente) notFound()
  const dados: [string, string][] = [
    ['Código no Domínio', cliente.codigoDominio ?? '—'],
    ['CNPJ', cliente.cnpj ?? '—'],
    ['Regime', ROTULO_REGIME[cliente.regime]],
    ['UF', cliente.uf],
    ['Município', cliente.municipio],
    [
      'Última atualização',
      cliente.atualizadoEm
        ? `${formatarDataHoraBR(cliente.atualizadoEm)} por ${cliente.atualizadoPorNome ?? '—'}`
        : '—',
    ],
  ]
  return (
    <article className="flex flex-col gap-5 rounded-[14px] border border-linha bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="break-words text-[24px] font-bold tracking-tight">{cliente.nome}</h1>
        <SeloSituacao ativo={cliente.ativo} className="self-start" />
      </div>

      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-suave">{rotulo}</dt>
            <dd className="m-0 break-words text-sm font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>

      {/* O motivo desta tela existir: texto da equipe, com as quebras de linha como foram digitadas. */}
      <section
        aria-label="Particularidades"
        className="flex flex-col gap-2 rounded-[10px] border border-mar/40 border-l-4 border-l-mar bg-mar-claro p-4"
      >
        <h2 className="text-sm font-bold text-mar-escuro">Particularidades</h2>
        {cliente.particularidades ? (
          <p className="m-0 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {cliente.particularidades}
          </p>
        ) : (
          <p className="m-0 text-sm text-suave">
            Nada registrado ainda. Use Editar para anotar como a nota fiscal deste cliente é emitida, o portal e o
            que for próprio dele.
          </p>
        )}
      </section>

      <EditarCliente cliente={cliente} alterar={alterarCliente} />
      {/* Só o administrador exclui: para o membro o botão nem existe. */}
      {voce.papel === 'admin' && <ExcluirCliente id={cliente.id} nome={cliente.nome} />}

      <hr className="border-linha" />
      <Historico
        tabela="clientes"
        registroId={cliente.id}
        rotulos={ROTULOS_CLIENTE}
        formatar={formatarCliente}
      />
    </article>
  )
}
