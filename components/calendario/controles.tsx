import Link from 'next/link'
import { diaVizinho, periodoDaVisao, type Visao } from '@/lib/calendario'
import { diaDaSemana } from '@/lib/regras/data'
import { COR_CATEGORIA, type Data } from '@/lib/tipos'

// Cabeçalho da tela: título do período, resumo, setas de navegação, alternância de visão e os
// chips de filtro por esfera. Tudo aqui é `<Link>` para a própria URL (`?visao=&dia=&esfera=`):
// a tela não tem estado de cliente, a navegação é que decide o que o servidor busca no banco.

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado',
]

function partes(d: Data): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = d.split('-').map(Number)
  return { ano, mes, dia }
}

function porExtenso(d: Data): string {
  const { ano, mes, dia } = partes(d)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Título do período, conforme a visão (decisão do brief, seção 5/6: cada visão com seu próprio formato). */
function tituloDoPeriodo(visao: Visao, dia: Data, hoje: Data): string {
  if (visao === 'mes') {
    const { ano, mes } = partes(dia)
    return capitalizar(`${MESES[mes - 1]} de ${ano}`)
  }
  if (visao === 'semana') {
    const { de, ate } = periodoDaVisao('semana', dia)
    const a = partes(de)
    const b = partes(ate)
    if (a.mes === b.mes) return `${a.dia} a ${porExtenso(ate)}`
    return `${porExtenso(de)} a ${porExtenso(ate)}`
  }
  if (dia === hoje) return `Hoje, ${porExtenso(dia)}`
  return `${capitalizar(DIAS_SEMANA[diaDaSemana(dia)])}, ${porExtenso(dia)}`
}

function href(visao: Visao, dia: Data, esfera: string): string {
  return `/?visao=${visao}&dia=${dia}&esfera=${esfera}`
}

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
]

// "Prazos de processos" não tem ponto de cor (spec: Processo é fundo escuro sem marcador à parte).
const FILTROS: { valor: string; rotulo: string; ponto?: string }[] = [
  { valor: 'todas', rotulo: 'Todas', ponto: '#6B7280' },
  { valor: 'federal', rotulo: 'Federal', ponto: COR_CATEGORIA.federal.ponto },
  { valor: 'estadual', rotulo: 'Estadual', ponto: COR_CATEGORIA.estadual.ponto },
  { valor: 'municipal', rotulo: 'Municipal', ponto: COR_CATEGORIA.municipal.ponto },
  { valor: 'trabalhista', rotulo: 'Trabalhista', ponto: COR_CATEGORIA.trabalhista.ponto },
  { valor: 'processo', rotulo: 'Prazos de processos' },
]

export function Controles({
  visao,
  dia,
  hoje,
  esfera,
  hojeCount,
  proximosCount,
}: {
  visao: Visao
  dia: Data
  hoje: Data
  esfera: string
  hojeCount: number
  proximosCount: number
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[28px] font-bold tracking-tight">{tituloDoPeriodo(visao, dia, hoje)}</h1>
          <p className="text-sm text-[#4B5563]">
            {hojeCount} vencimentos hoje · {proximosCount} nos próximos 7 dias
          </p>
        </div>

        <div className="flex gap-1">
          <Link
            href={href(visao, diaVizinho(visao, dia, -1), esfera)}
            aria-label="Período anterior"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <Link
            href={href(visao, diaVizinho(visao, dia, 1), esfera)}
            aria-label="Próximo período"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div role="group" aria-label="Visualização" className="ml-auto flex gap-1 rounded-[10px] bg-[#E5E7EB] p-1">
          {VISOES.map((v) => {
            const ativo = visao === v.valor
            // Trocar para "Hoje" sempre recentra no dia de hoje; as outras visões mantêm o dia atual.
            const diaAlvo = v.valor === 'hoje' ? hoje : dia
            return (
              <Link
                key={v.valor}
                href={href(v.valor, diaAlvo, esfera)}
                aria-pressed={ativo}
                className={`min-h-10 rounded-lg px-[18px] py-2 text-sm ${
                  ativo ? 'bg-white font-semibold text-[#111827] shadow-sm' : 'font-medium text-[#374151]'
                }`}
              >
                {v.rotulo}
              </Link>
            )
          })}
        </div>
      </div>

      <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = esfera === f.valor
          return (
            <Link
              key={f.valor}
              href={href(visao, dia, f.valor)}
              aria-pressed={ativo}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                ativo ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#D1D5DB] bg-white text-[#374151]'
              }`}
            >
              {f.ponto && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: f.ponto }} />}
              {f.rotulo}
            </Link>
          )
        })}
      </div>
    </>
  )
}
