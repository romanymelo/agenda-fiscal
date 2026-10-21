import { connection } from 'next/server'
import { Suspense } from 'react'
import { Controles } from '@/components/calendario/controles'
import { Hoje } from '@/components/calendario/hoje'
import { Lateral } from '@/components/calendario/lateral'
import { Mes } from '@/components/calendario/mes'
import { Semana } from '@/components/calendario/semana'
import { itensDaTela, periodoDaVisao, type ItemCalendario, type Visao } from '@/lib/calendario'
import { somarDias } from '@/lib/regras/data'
import type { CategoriaCalendario } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'

export const metadata = { title: 'Agenda Fiscal — painel' }

type Parametros = Promise<{ [chave: string]: string | string[] | undefined }>

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const VISOES = ['hoje', 'semana', 'mes'] as const
const ESFERAS = ['todas', 'federal', 'estadual', 'municipal', 'trabalhista', 'processo'] as const
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

export default function Pagina({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-[18px] px-4 py-6 sm:px-6">
      {/* Lê o banco, o cookie e a data de hoje: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando o calendário…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Conteudo({ searchParams }: { searchParams: Parametros }) {
  await connection()
  await exigirUsuario()
  const params = await searchParams

  const visaoPedida = primeiro(params.visao)
  const visao: Visao = (VISOES as readonly string[]).includes(visaoPedida ?? '') ? (visaoPedida as Visao) : 'mes'

  // "Hoje" é sempre calculado no fuso do escritório, nunca no fuso do servidor.
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date())

  const diaPedido = primeiro(params.dia)
  const dia = diaPedido && FORMATO_DATA.test(diaPedido) ? diaPedido : hoje

  const esferaPedida = primeiro(params.esfera)
  const esfera = (ESFERAS as readonly string[]).includes(esferaPedida ?? '') ? esferaPedida! : 'todas'

  const { de, ate } = periodoDaVisao(visao, dia)
  // Dois intervalos: o do período mostrado (grade/semana/hoje) e o fixo de hoje a hoje+7, para o
  // resumo do cabeçalho e para "Próximos 7 dias" — que não mudam ao navegar entre meses.
  const [itensPeriodo, itensProximos] = await Promise.all([
    itensDaTela(de, ate),
    itensDaTela(hoje, somarDias(hoje, 7)),
  ])

  // Feriado aparece em qualquer filtro (decisão 1 do brief): o filtro nunca o esconde.
  const visivel = (i: ItemCalendario) =>
    esfera === 'todas' || i.categoria === (esfera as CategoriaCalendario) || i.categoria === 'feriado'

  const doPeriodo = itensPeriodo.filter(visivel)
  const doDia = doPeriodo.filter((i) => i.data === dia)
  const hojeItens = itensProximos.filter((i) => i.data === hoje && visivel(i))
  // "Próximos 7 dias" conta a partir de amanhã (decisão 4 do brief), e é o que alimenta tanto o
  // resumo do cabeçalho quanto a seção da lateral.
  const proximos = itensProximos.filter((i) => i.data > hoje && visivel(i))

  return (
    <>
      <Controles
        visao={visao}
        dia={dia}
        hoje={hoje}
        esfera={esfera}
        hojeCount={hojeItens.length}
        proximosCount={proximos.length}
      />
      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-label="Calendário"
          className="min-w-0 flex-[999_1_620px] rounded-[14px] border border-[#E5E7EB] bg-white p-4"
        >
          {visao === 'mes' && <Mes dia={dia} hoje={hoje} itens={doPeriodo} esfera={esfera} />}
          {visao === 'semana' && <Semana de={de} dia={dia} hoje={hoje} itens={doPeriodo} esfera={esfera} />}
          {visao === 'hoje' && <Hoje itens={doDia} />}
        </section>
        <aside className="min-w-0 flex-[1_1_320px]">
          <Lateral dia={dia} hoje={hoje} itens={doDia} proximos={proximos} />
        </aside>
      </div>
    </>
  )
}
