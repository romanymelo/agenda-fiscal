import Link from 'next/link'
import { diaVizinho, periodoDaVisao, type Visao } from '@/lib/calendario'
import { diaDaSemana } from '@/lib/regras/data'
import { COR_CATEGORIA, type Data } from '@/lib/tipos'

// Cabeçalho da tela: título do período, contadores, setas, alternância de visão e filtros por
// esfera. Tudo aqui é `<Link>` para a própria URL (`?visao=&dia=&esfera=`): a tela não tem estado
// de cliente, a navegação é que decide o que o servidor busca no banco.

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

/** Título do período, conforme a visão: cada visão com seu próprio formato. */
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

type Filtro = { valor: string; rotulo: string; ponto?: string; fundo?: string; texto?: string }
// "Prazos de processos" não tem ponto de cor (processo é fundo escuro, sem marcador à parte).
const FILTROS: Filtro[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'federal', rotulo: 'Federal', ...COR_CATEGORIA.federal },
  { valor: 'estadual', rotulo: 'Estadual', ...COR_CATEGORIA.estadual },
  { valor: 'municipal', rotulo: 'Municipal', ...COR_CATEGORIA.municipal },
  { valor: 'trabalhista', rotulo: 'Trabalhista', ...COR_CATEGORIA.trabalhista },
  { valor: 'processo', rotulo: 'Prazos de processos', ...COR_CATEGORIA.processo },
]

function Seta({ sentido, ...rest }: { sentido: 'esq' | 'dir'; href: string; rotulo: string }) {
  return (
    <Link
      href={rest.href}
      aria-label={rest.rotulo}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-linha-forte bg-papel text-corpo transition-colors hover:bg-mar-claro hover:text-mar-escuro"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={sentido === 'esq' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </Link>
  )
}

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
  /** Vencimentos e prazos de hoje (feriado não conta). */
  hojeCount: number
  /** Vencimentos e prazos de amanhã até daqui a 7 dias (feriado não conta). */
  proximosCount: number
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="font-display text-[34px] font-bold leading-none tracking-tight sm:text-[42px]">
          {tituloDoPeriodo(visao, dia, hoje)}
        </h1>
        <div className="flex gap-1.5">
          <Seta sentido="esq" href={href(visao, diaVizinho(visao, dia, -1), esfera)} rotulo="Período anterior" />
          <Seta sentido="dir" href={href(visao, diaVizinho(visao, dia, 1), esfera)} rotulo="Próximo período" />
        </div>

        <div role="group" aria-label="Visualização" className="ml-auto flex gap-0.5 rounded-full bg-linha p-1">
          {VISOES.map((v) => {
            const ativo = visao === v.valor
            // Trocar para "Hoje" sempre recentra no dia de hoje; as outras visões mantêm o dia atual.
            const diaAlvo = v.valor === 'hoje' ? hoje : dia
            return (
              <Link
                key={v.valor}
                href={href(v.valor, diaAlvo, esfera)}
                aria-pressed={ativo}
                className={`min-h-9 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  ativo ? 'bg-papel font-semibold text-tinta shadow-sm' : 'font-medium text-corpo hover:text-tinta'
                }`}
              >
                {v.rotulo}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-suave">
          <span>
            <strong className="font-display text-[28px] font-bold tabular-nums text-tinta">{hojeCount}</strong>{' '}
            {hojeCount === 1 ? 'vence hoje' : 'vencem hoje'}
          </span>
          <span>
            <strong className="font-display text-[28px] font-bold tabular-nums text-tinta">{proximosCount}</strong>{' '}
            nos próximos 7 dias
          </span>
        </p>

        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const ativo = esfera === f.valor
            const colorido = ativo && f.fundo
            return (
              <Link
                key={f.valor}
                href={href(visao, dia, f.valor)}
                aria-pressed={ativo}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  colorido
                    ? 'border-transparent'
                    : ativo
                      ? 'border-tinta bg-tinta text-white'
                      : 'border-linha-forte bg-papel text-corpo hover:bg-sutil'
                }`}
                style={colorido ? { background: f.fundo, color: f.texto } : undefined}
              >
                {f.ponto && (
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: f.ponto }} />
                )}
                {f.rotulo}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
