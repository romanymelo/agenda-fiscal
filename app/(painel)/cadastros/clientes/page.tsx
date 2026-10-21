import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Botao, Campo } from '@/components/campos'
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-[#4B5563]">Quem o escritório atende e as particularidades de cada um</p>
      </div>
      {/* Lê o banco, o cookie e a busca da URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando os clientes…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Promise<{ [chave: string]: string | string[] | undefined }> }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  await exigirUsuario()
  const { busca: bruta } = await searchParams
  const busca = (Array.isArray(bruta) ? bruta[0] : bruta)?.trim() ?? ''
  const clientes = await clientesDaTela(busca)
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
        <Botao type="submit" variante="secundario">
          Buscar
        </Botao>
      </Form>
      <NovoCliente criar={criarCliente} />
      {clientes.length === 0 ? (
        <p className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
          {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#E5E7EB] rounded-[14px] border border-[#E5E7EB] bg-white">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cadastros/clientes/${c.id}`}
                className="flex flex-col gap-1 p-4 hover:bg-[#F9FAFB] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0F766E] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{c.nome}</span>
                  {!c.ativo && (
                    <span className="rounded-full bg-[#E5E7EB] px-2.5 py-0.5 text-xs font-semibold text-[#4B5563]">
                      Inativo
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-[#4B5563]">
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
