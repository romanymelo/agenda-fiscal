import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Botao, Campo } from '@/components/campos'
import { Historico } from '@/components/historico'
import { Detalhe } from '@/components/processos/detalhe'
import { NovoProcesso } from '@/components/processos/formularios'
import { Quadro } from '@/components/processos/quadro'
import { RolarAoDetalhe } from '@/components/processos/rolar-ao-detalhe'
import { clientesDaTela } from '@/lib/db/clientes'
import { processoDaTela, processosDaTela } from '@/lib/db/processos'
import { exigirUsuario } from '@/lib/usuario-atual'
import {
  adicionarAndamento,
  alterarProcesso,
  criarProcesso,
  enviarAnexo,
  excluirProcesso,
  mudarStatus,
} from './acoes'
import { formatarProcesso, ROTULOS_PROCESSO } from './rotulos'

export const metadata = { title: 'Processos — Agenda Fiscal' }

type Parametros = Promise<{ [chave: string]: string | string[] | undefined }>

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default function Processos({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mr-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 py-6 sm:px-8 lg:py-8">
      {/* Lê o banco, o cookie, a data de hoje e a URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando os processos…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Parametros }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  const voce = await exigirUsuario()
  const params = await searchParams
  const busca = primeiro(params.busca)?.trim() ?? ''
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date())
  // Uma consulta de clientes serve ao seletor dos formulários e ao mapa de nomes do histórico.
  const [processos, clientes] = await Promise.all([
    processosDaTela(busca),
    clientesDaTela(undefined, { incluirInativos: true }),
  ])
  // O processo da URL; sem ele (ou com um id que não existe), o primeiro do quadro, como no mockup.
  const pedido = primeiro(params.processo)
  const detalhe =
    (pedido ? await processoDaTela(pedido) : null) ??
    (processos[0] ? await processoDaTela(processos[0].id) : null)
  const opcoes = clientes.map((c) => ({ valor: c.id, rotulo: c.ativo ? c.nome : `${c.nome} (inativo)` }))
  const nomes = new Map(clientes.map((c) => [c.id, c.nome]))
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">Processos</h1>
          <p className="text-sm text-suave">
            Pedidos e processos em órgãos, visíveis para toda a equipe
          </p>
        </div>
        <Form action="/processos" className="ml-auto flex items-end gap-2">
          <Campo
            rotulo="Buscar processo"
            ocultarRotulo
            nome="busca"
            type="search"
            placeholder="Cliente, órgão ou protocolo"
            defaultValue={busca}
            autoComplete="off"
            className="w-[240px] max-w-full"
          />
          <Botao type="submit" variante="secundario">
            Buscar
          </Botao>
        </Form>
        <Link
          href="/processos/relatorio"
          className="flex min-h-[44px] items-center rounded-full border border-linha-forte bg-papel px-4 text-sm font-semibold text-tinta transition-colors hover:bg-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
        >
          Relatório
        </Link>
        <NovoProcesso clientes={opcoes} hoje={hoje} criar={criarProcesso} />
      </div>

      {processos.length === 0 && (
        <p className="rounded-2xl border border-linha bg-papel p-5 text-sm text-suave">
          {busca ? 'Nenhum processo encontrado para essa busca.' : 'Nenhum processo cadastrado ainda.'}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_640px]">
          <Quadro processos={processos} selecionadoId={detalhe?.id ?? null} hoje={hoje} busca={busca} />
        </div>
        <RolarAoDetalhe id={detalhe?.id ?? null}>
          {detalhe ? (
            <Detalhe
              key={detalhe.id}
              processo={detalhe}
              papel={voce.papel}
              hoje={hoje}
              clientes={opcoes}
              acoes={{ alterar: alterarProcesso, mudarStatus, adicionarAndamento, enviarAnexo, excluir: excluirProcesso }}
              historico={
                <Historico
                  tabela="processos"
                  registroId={detalhe.id}
                  rotulos={ROTULOS_PROCESSO}
                  formatar={formatarProcesso(nomes)}
                />
              }
            />
          ) : (
            <aside
              aria-label="Detalhe do processo"
              className="rounded-2xl border border-linha bg-papel p-5 text-sm text-suave"
            >
              Escolha um processo no quadro para ver o detalhe.
            </aside>
          )}
        </RolarAoDetalhe>
      </div>
    </>
  )
}
