import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { SeloSituacao } from '@/components/selo-situacao'
import { obrigacoesDaTela } from '@/lib/db/obrigacoes'
import { ROTULO_ESFERA, ROTULO_PERIODICIDADE, type Esfera } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'
import { criarObrigacao } from './acoes'
import { NovaObrigacao } from './formularios'
import { descreverVencimento } from './rotulos'
import { SeloEsfera } from './selo-esfera'

export const metadata = { title: 'Obrigações — Agenda Fiscal' }

const ESFERAS = Object.keys(ROTULO_ESFERA) as Esfera[]

export default function Obrigacoes({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">Obrigações</h1>
        <p className="text-sm text-[#4B5563]">As regras que o calendário usa para calcular cada vencimento</p>
      </div>
      {/* Lê o banco, o cookie e o filtro da URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando as obrigações…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Promise<{ [chave: string]: string | string[] | undefined }> }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  await exigirUsuario()
  const { inativos: chaveInativos } = await searchParams
  const incluirInativos = (Array.isArray(chaveInativos) ? chaveInativos[0] : chaveInativos) === '1'
  const obrigacoes = await obrigacoesDaTela({ incluirInativos })
  return (
    <>
      <Link
        href={incluirInativos ? '/cadastros/obrigacoes' : '/cadastros/obrigacoes?inativos=1'}
        className="self-start text-sm font-semibold text-[#0F766E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
      >
        {incluirInativos ? 'Ocultar obrigações inativas' : 'Mostrar obrigações inativas'}
      </Link>
      <NovaObrigacao criar={criarObrigacao} />
      {obrigacoes.length === 0 ? (
        <p className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
          {incluirInativos
            ? 'Nenhuma obrigação cadastrada ainda.'
            : 'Nenhuma obrigação ativa. Use "Mostrar obrigações inativas" para ver as que deixaram de existir.'}
        </p>
      ) : (
        ESFERAS.map((esfera) => {
          const daEsfera = obrigacoes.filter((o) => o.esfera === esfera)
          if (daEsfera.length === 0) return null
          return (
            <section key={esfera} aria-label={ROTULO_ESFERA[esfera]} className="flex flex-col gap-2">
              <h2 className="m-0">
                <SeloEsfera esfera={esfera} className="text-sm" />
              </h2>
              <ul className="flex flex-col divide-y divide-[#E5E7EB] rounded-[14px] border border-[#E5E7EB] bg-white">
                {daEsfera.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/cadastros/obrigacoes/${o.id}`}
                      className="flex flex-col gap-1 p-4 hover:bg-[#F9FAFB] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0F766E] sm:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold">{o.nome}</span>
                        {!o.ativo && <SeloSituacao ativo={false} />}
                      </span>
                      <span className="text-sm text-[#4B5563]">
                        {ROTULO_PERIODICIDADE[o.periodicidade]}: {descreverVencimento(o)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </>
  )
}
