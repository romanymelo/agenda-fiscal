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
// Feriado aparece no calendário, mas não é vencimento: não entra nos contadores do topo.
const contaComoVencimento = (i: ItemCalendario) => i.categoria !== 'feriado'
const VISOES = ['hoje', 'semana', 'mes'] as const
const ESFERAS = ['todas', 'federal', 'estadual', 'municipal', 'trabalhista', 'processo'] as const
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

export default function Pagina({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 py-6 sm:px-8 lg:py-8">
      {/* Lê o banco, o cookie e a data de hoje: só com a requisição em mãos, atrás de um Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando o calendário…</p>}>
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
  // Dois intervalos precisam de itens: o período mostrado (grade/semana/hoje) e o fixo de hoje a
  // hoje+7, para o resumo do cabeçalho e para "Próximos 7 dias" — que não mudam ao navegar entre
  // meses. Uma só consulta, na união dos dois intervalos, evita buscar duas vezes a mesma lista de
  // obrigações e processos.
  const fimProximos = somarDias(hoje, 7)
  const uniaoDe = de < hoje ? de : hoje
  const uniaoAte = ate > fimProximos ? ate : fimProximos
  const itens = await itensDaTela(uniaoDe, uniaoAte)
  const itensPeriodo = itens.filter((i) => i.data >= de && i.data <= ate)
  const itensProximos = itens.filter((i) => i.data >= hoje && i.data <= fimProximos)

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
        hojeCount={hojeItens.filter(contaComoVencimento).length}
        proximosCount={proximos.filter(contaComoVencimento).length}
      />
      {/* A semana já mostra cada dia em coluna e precisa de largura: nela a lateral vai para baixo. */}
      <div className={`grid items-start gap-5 ${visao === 'semana' ? '' : 'xl:grid-cols-[minmax(0,1fr)_320px]'}`}>
        <section
          aria-label="Calendário"
          className="min-w-0 rounded-2xl border border-linha bg-papel p-3 sm:p-4"
        >
          {visao === 'mes' && <Mes dia={dia} hoje={hoje} itens={doPeriodo} esfera={esfera} />}
          {visao === 'semana' && <Semana de={de} dia={dia} hoje={hoje} itens={doPeriodo} esfera={esfera} />}
          {visao === 'hoje' && <Hoje itens={doDia} />}
        </section>
        <aside className="min-w-0">
          <Lateral dia={dia} hoje={hoje} itens={doDia} proximos={proximos} abaixo={visao === 'semana'} mostrarDia={visao !== 'hoje'} />
        </aside>
      </div>
    </>
  )
}
