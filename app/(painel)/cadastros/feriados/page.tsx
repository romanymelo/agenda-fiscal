import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Historico } from '@/components/historico'
import { configuracaoDaTela } from '@/lib/db/configuracao'
import { feriadosDaTela } from '@/lib/db/feriados'
import { diaDaSemana, formatarBR } from '@/lib/regras/data'
import { feriadosDaPraca } from '@/lib/regras/feriados-aplicaveis'
import { exigirUsuario } from '@/lib/usuario-atual'
import { AcoesFeriado, EditarPraca, NovoFeriado } from './formularios'
import { formatarFeriado, ROTULOS_CONFIGURACAO, ROTULOS_FERIADO } from './rotulos'
import { SeloAbrangencia } from './selo-abrangencia'

export const metadata = { title: 'Feriados — Agenda Fiscal' }

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const LINK =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]'

export default function Feriados({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">Feriados</h1>
        <p className="text-sm text-[#4B5563]">Os dias que deslocam vencimentos, e a praça do escritório que os escolhe</p>
      </div>
      {/* Lê o banco, o cookie, o relógio e o ano da URL: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando os feriados…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

// Ano da URL, de 1900 a 2100; sem ele, com lixo ou fora da faixa (`0000` viraria uma data que o banco recusa),
// o ano corrente no fuso do escritório.
function anoDe(valor: string | string[] | undefined, corrente: number): number {
  const v = Array.isArray(valor) ? valor[0] : valor
  const ano = v && /^\d{4}$/.test(v) ? Number(v) : NaN
  return ano >= 1900 && ano <= 2100 ? ano : corrente
}

async function Conteudo({ searchParams }: { searchParams: Promise<{ [chave: string]: string | string[] | undefined }> }) {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  const usuario = await exigirUsuario()
  const admin = usuario.papel === 'admin'
  const corrente = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio', year: 'numeric' }).format(new Date()),
  )
  const ano = anoDe((await searchParams).ano, corrente)
  const [praca, feriados] = await Promise.all([configuracaoDaTela(), feriadosDaTela(ano)])
  return (
    <>
      <section
        aria-label="Praça do escritório"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
      >
        <h2 className="text-base font-bold">Praça do escritório</h2>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#4B5563]">UF</dt>
            <dd className="text-base font-semibold">{praca.uf}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#4B5563]">Município</dt>
            <dd className="text-base font-semibold">{praca.municipio}</dd>
          </div>
        </dl>
        <p className="text-sm text-[#4B5563]">
          Só os feriados dessa praça deslocam vencimentos: os nacionais valem sempre, os estaduais só na UF acima e os
          municipais só no município acima. Os de outras praças ficam cadastrados, mas não mudam nenhuma data.
        </p>
        {admin ? (
          <EditarPraca praca={praca} />
        ) : (
          <p className="text-sm text-[#4B5563]">Só o administrador altera a praça do escritório.</p>
        )}
        <hr className="border-[#E5E7EB]" />
        <Historico tabela="configuracao" registroId={praca.id} rotulos={ROTULOS_CONFIGURACAO} />
      </section>

      <nav aria-label="Ano" className="flex items-center gap-2">
        <Link
          href={`/cadastros/feriados?ano=${ano - 1}`}
          className={`flex min-h-[44px] items-center rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6] ${LINK}`}
        >
          <span aria-hidden="true">←&nbsp;</span>
          {ano - 1}
        </Link>
        <span aria-current="page" className="px-3 text-lg font-bold">
          {ano}
        </span>
        <Link
          href={`/cadastros/feriados?ano=${ano + 1}`}
          className={`flex min-h-[44px] items-center rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6] ${LINK}`}
        >
          {ano + 1}
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </nav>

      <NovoFeriado ano={ano} praca={praca} />

      {feriados.length === 0 ? (
        <p className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
          Nenhum feriado cadastrado em {ano}.
        </p>
      ) : (
        <section aria-label={`Feriados de ${ano}`} className="flex flex-col gap-2">
          <ul className="flex flex-col divide-y divide-[#E5E7EB] rounded-[14px] border border-[#E5E7EB] bg-white">
            {feriados.map((f) => {
              // A mesma função que o calendário usa decide se este feriado vale para a praça.
              const vale = feriadosDaPraca([f], praca).size > 0
              return (
                <li key={f.id} className="flex flex-col gap-3 p-4 sm:px-5">
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold tabular-nums">{formatarBR(f.data)}</span>
                      <span className="text-sm text-[#4B5563]">{DIAS[diaDaSemana(f.data)]}</span>
                      <SeloAbrangencia abrangencia={f.abrangencia} />
                      {f.uf && (
                        <span className="text-sm text-[#4B5563]">
                          {f.municipio ? `${f.municipio}/${f.uf}` : f.uf}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">{f.descricao}</span>
                    {!vale && (
                      <span className="text-sm text-[#92400E]">Fora da praça do escritório: não desloca vencimentos.</span>
                    )}
                  </div>
                  <AcoesFeriado
                    feriado={f}
                    praca={praca}
                    admin={admin}
                    historico={
                      <Historico
                        tabela="feriados"
                        registroId={f.id}
                        rotulos={ROTULOS_FERIADO}
                        formatar={formatarFeriado}
                      />
                    }
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
