import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Botao, Campo, GrupoMarcacoes, Selecao } from '@/components/campos'
import { Imprimir } from '@/components/processos/imprimir'
import { FolhaDoRelatorio } from '@/components/processos/relatorio'
import { clientesDaTela } from '@/lib/db/clientes'
import { andamentosDaTela, processosDaTela } from '@/lib/db/processos'
import {
  agrupar,
  filtrar,
  lerFiltros,
  OPCOES_AGRUPAR,
  OPCOES_CONTEUDO,
  OPCOES_ORDEM,
  OPCOES_ORIENTACAO,
  OPCOES_PRAZO,
  ordenar,
  ORDEM_STATUS,
  resumoDosFiltros,
} from '@/lib/regras/relatorio-processos'
import { ROTULO_STATUS } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'

export const metadata = { title: 'Relatório de processos — Agenda Fiscal' }

type Parametros = Promise<{ [chave: string]: string | string[] | undefined }>

const OPCOES_SITUACAO = ORDEM_STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] }))

export default function RelatorioDeProcessos({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mr-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-8 lg:py-8 print:max-w-none print:p-0">
      {/* Lê o banco, o cookie, o relógio e a URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Montando o relatório…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Parametros }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  const voce = await exigirUsuario()
  const filtros = lerFiltros(await searchParams)
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date())

  const [todos, clientes] = await Promise.all([
    processosDaTela(filtros.busca),
    clientesDaTela(undefined, { incluirInativos: true }),
  ])
  const escolhidos = ordenar(filtrar(todos, filtros, hoje), filtros.ordem)
  const andamentos = filtros.conteudo === 'resumo' ? {} : await andamentosDaTela(escolhidos.map((p) => p.id))
  const nomeDoCliente = clientes.find((c) => c.id === filtros.clienteId)?.nome ?? null

  return (
    <>
      {/* A folha impressa vem do papel de tamanho A4; a orientação é a escolhida na tela. */}
      <style>{`@page { size: A4 ${filtros.orientacao === 'paisagem' ? 'landscape' : 'portrait'}; margin: 12mm; }`}</style>

      <div className="flex flex-col gap-1 print:hidden">
        <Link
          href="/processos"
          className="self-start text-sm font-semibold text-mar hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
        >
          ← Processos
        </Link>
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">Relatório de processos</h1>
        <p className="text-sm text-suave">Escolha o que entra, confira a folha abaixo e imprima ou salve em PDF</p>
      </div>

      <Form
        action="/processos/relatorio"
        className="flex flex-col gap-4 rounded-2xl border border-linha bg-papel p-4 sm:p-5 print:hidden"
      >
        <input type="hidden" name="gerar" value="1" />
        <GrupoMarcacoes
          rotulo="Situação"
          nome="situacao"
          opcoes={OPCOES_SITUACAO}
          defaultValue={filtros.situacoes}
          ajuda="Sem nenhuma marcada, entram todas as situações."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Selecao
            rotulo="Cliente"
            nome="cliente"
            vazio="Todos os clientes"
            opcoes={clientes.map((c) => ({ valor: c.id, rotulo: c.ativo ? c.nome : `${c.nome} (inativo)` }))}
            defaultValue={filtros.clienteId}
          />
          <Selecao rotulo="Prazo" nome="prazo" opcoes={OPCOES_PRAZO} defaultValue={filtros.prazo} />
          <Campo
            rotulo="Buscar"
            nome="busca"
            type="search"
            placeholder="Cliente, órgão ou protocolo"
            defaultValue={filtros.busca}
            autoComplete="off"
          />
          <Selecao rotulo="Ordenar por" nome="ordem" opcoes={OPCOES_ORDEM} defaultValue={filtros.ordem} />
          <Selecao rotulo="Agrupar" nome="agrupar" opcoes={OPCOES_AGRUPAR} defaultValue={filtros.agrupar} />
          <Selecao rotulo="Conteúdo" nome="conteudo" opcoes={OPCOES_CONTEUDO} defaultValue={filtros.conteudo} />
          <Selecao rotulo="Orientação da folha" nome="orientacao" opcoes={OPCOES_ORIENTACAO} defaultValue={filtros.orientacao} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao type="submit">Gerar relatório</Botao>
          <Imprimir desabilitado={escolhidos.length === 0} />
        </div>
      </Form>

      <FolhaDoRelatorio
        grupos={agrupar(escolhidos, filtros.agrupar)}
        andamentos={andamentos}
        conteudo={filtros.conteudo}
        hoje={hoje}
        resumo={resumoDosFiltros(filtros, nomeDoCliente)}
        geradoEm={new Date().toISOString()}
        geradoPor={voce.nome}
      />
    </>
  )
}
