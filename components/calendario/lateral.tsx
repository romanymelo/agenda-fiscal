import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana } from '@/lib/regras/data'
import { ROTULO_CATEGORIA, ROTULO_REGIME, type Data } from '@/lib/tipos'
import { corBarra, corRotulo } from './estilo'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado',
]
const DOW3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

/** Lateral: a pauta do dia selecionado e os "Próximos 7 dias" — de amanhã até daqui a 7 dias. */
export function Lateral({
  dia,
  hoje,
  itens,
  proximos,
  abaixo = false,
  mostrarDia = true,
}: {
  dia: Data
  hoje: Data
  /** Itens do dia selecionado, já filtrados pela esfera. */
  itens: ItemCalendario[]
  /** Itens de amanhã a daqui a 7 dias, já filtrados pela esfera, em ordem de data. */
  proximos: ItemCalendario[]
  /** Lateral posta embaixo do calendário (visão da semana): as duas seções lado a lado. */
  abaixo?: boolean
  /** Na visão Hoje o dia já ocupa a área principal: a lateral só traz os próximos 7 dias. */
  mostrarDia?: boolean
}) {
  const [ano, mes] = dia.split('-').map(Number)
  const eHoje = dia === hoje
  return (
    <div className={abaixo ? 'grid gap-4 md:grid-cols-2 md:items-start' : 'flex flex-col gap-4'}>
      {mostrarDia && (
      <section aria-label="Dia selecionado" className="flex flex-col gap-4 rounded-2xl border border-linha bg-papel p-5">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-[34px] font-bold leading-none tabular-nums ${
              eHoje ? 'bg-sol text-tinta' : 'bg-mar-claro text-mar-escuro'
            }`}
          >
            {numeroDoDia(dia)}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-semibold leading-tight">
              {capitalizar(DIAS_SEMANA[diaDaSemana(dia)])}
            </h2>
            <p className="text-sm text-suave">
              {MESES[mes - 1]} de {ano}
              {eHoje && <span className="ml-2 rounded-full bg-sol px-2 py-0.5 text-xs font-semibold text-tinta">hoje</span>}
            </p>
          </div>
        </div>

        {itens.length === 0 ? (
          <p className="rounded-xl bg-sutil px-4 py-5 text-sm text-suave">Nada vence neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {itens.map((e, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 rounded-xl border-l-4 bg-sutil p-3.5"
                style={{ borderLeftColor: corBarra(e.categoria) }}
              >
                <span className="text-xs font-semibold" style={{ color: corRotulo(e.categoria) }}>
                  {ROTULO_CATEGORIA[e.categoria]}
                </span>
                <span className="text-[15px] font-semibold leading-snug">{e.titulo}</span>
                <span className="text-[13px] leading-snug text-suave">{e.subtitulo}</span>
                {e.regimesAplicaveis && e.regimesAplicaveis.length > 0 && (
                  <span className="text-[13px] leading-snug text-suave">
                    Regimes aplicáveis (informativo): {e.regimesAplicaveis.map((r) => ROTULO_REGIME[r]).join(', ')}
                  </span>
                )}
                {e.href && (
                  <Link href={e.href} className="mt-1 self-start text-[13px] font-semibold text-mar-escuro underline-offset-2 hover:underline">
                    Ver processo
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <section aria-label="Próximos 7 dias" className="flex flex-col gap-1 rounded-2xl border border-linha bg-papel p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Próximos 7 dias</h2>
        {proximos.length === 0 && <p className="text-sm text-suave">Nada vence nos próximos 7 dias.</p>}
        {proximos.map((e, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-linha py-2.5 last:border-0">
            <div className="flex w-11 flex-none flex-col items-center rounded-lg bg-espuma py-1">
              <span className="text-[11px] font-medium text-suave">{DOW3[diaDaSemana(e.data)]}</span>
              <span className="font-display text-lg font-bold leading-none tabular-nums">{numeroDoDia(e.data)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight">{e.titulo}</span>
              <span className="flex items-center gap-1.5 text-xs text-suave">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: corBarra(e.categoria) }} />
                {ROTULO_CATEGORIA[e.categoria]}
              </span>
            </div>
          </div>
        ))}
      </section>

      <p className={`px-1 text-xs leading-relaxed text-suave ${abaixo ? 'md:col-span-2' : ''}`}>
        Prazos de processos entram aqui automaticamente quando cadastrados na tela Processos.
      </p>
    </div>
  )
}
