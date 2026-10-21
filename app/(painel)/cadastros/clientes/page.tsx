import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Botao, Campo } from '@/components/campos'
import { SeloSituacao } from '@/components/selo-situacao'
import { clientesDaTela } from '@/lib/db/clientes'
import { exigirUsuario } from '@/lib/usuario-atual'
import { criarCliente } from './acoes'
import { NovoCliente } from './formularios'

export const metadata = { title: 'Clientes — Agenda Fiscal' }

export default function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>
}) {
  return (
    <main className="mr-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 lg:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-suave">Quem o escritório atende e as particularidades de cada um</p>
      </div>
      {/* Lê o banco, o cookie e a busca da URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando os clientes…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Promise<{ [chave: string]: string | string[] | undefined }> }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  await exigirUsuario()
  const { busca: bruta, inativos: chaveInativos } = await searchParams
  const busca = (Array.isArray(bruta) ? bruta[0] : bruta)?.trim() ?? ''
  const incluirInativos = (Array.isArray(chaveInativos) ? chaveInativos[0] : chaveInativos) === '1'
  const clientes = await clientesDaTela(busca, { incluirInativos })
  // O outro estado do filtro, mantendo a busca: ativos por padrão, inativos a um clique.
  const alternar = new URLSearchParams()
  if (busca) alternar.set('busca', busca)
  if (!incluirInativos) alternar.set('inativos', '1')
  const destinoAlternar = `/cadastros/clientes${alternar.size ? `?${alternar}` : ''}`
  return (
    <>
      <Form action="/cadastros/clientes" className="flex items-end gap-2">
        <Campo
          rotulo="Buscar cliente"
          ocultarRotulo
          nome="busca"
          type="search"
          placeholder="Nome, código do Domínio ou CNPJ"
          defaultValue={busca}
          autoComplete="off"
          className="flex-1"
        />
        {incluirInativos && <input type="hidden" name="inativos" value="1" />}
        <Botao type="submit" variante="secundario">
          Buscar
        </Botao>
      </Form>
      <Link
        href={destinoAlternar}
        className="self-start text-sm font-semibold text-mar hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
      >
        {incluirInativos ? 'Ocultar clientes inativos' : 'Mostrar clientes inativos'}
      </Link>
      <NovoCliente criar={criarCliente} />
      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-linha bg-papel p-5 text-sm text-suave">
          {busca
            ? 'Nenhum cliente encontrado para essa busca.'
            : incluirInativos
              ? 'Nenhum cliente cadastrado ainda.'
              : 'Nenhum cliente ativo. Use "Mostrar clientes inativos" para ver quem saiu do escritório.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-linha rounded-2xl border border-linha bg-papel">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cadastros/clientes/${c.id}`}
                className="flex flex-col gap-1 p-4 hover:bg-sutil focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-mar sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{c.nome}</span>
                  <SeloSituacao ativo={c.ativo} />
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-suave">
                  <span>Domínio: {c.codigoDominio ?? '—'}</span>
                  <span>CNPJ: {c.cnpj ?? '—'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
