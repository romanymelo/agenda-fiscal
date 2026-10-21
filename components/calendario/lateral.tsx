import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana } from '@/lib/regras/data'
import { COR_CATEGORIA, ROTULO_CATEGORIA, type Data } from '@/lib/tipos'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado',
]
const DOW3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function porExtenso(d: Data): string {
  const [ano, mes, dia] = d.split('-').map(Number)
  return `${capitalizar(DIAS_SEMANA[diaDaSemana(d)])}, ${dia} de ${MESES[mes - 1]} de ${ano}`
}

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

/** Lateral: o dia selecionado (seção "Dia selecionado") e os "Próximos 7 dias" — de amanhã até daqui a 7 dias. */
export function Lateral({
  dia,
  hoje,
  itens,
  proximos,
}: {
  dia: Data
  hoje: Data
  /** Itens do dia selecionado, já filtrados pela esfera. */
  itens: ItemCalendario[]
  /** Itens de amanhã a daqui a 7 dias, já filtrados pela esfera, em ordem de data. */
  proximos: ItemCalendario[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Dia selecionado"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E5E7EB] bg-white p-[18px]"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#0F5E57]">
            {dia === hoje ? 'Hoje' : 'Dia selecionado'}
          </span>
          <h2 className="text-[19px] font-bold">{porExtenso(dia)}</h2>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-[#4B5563]">Nada vence neste dia.</p>
        ) : (
          itens.map((e, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-[10px] border border-[#EEF0F2] bg-[#F9FAFB] p-3">
              <span
                className="inline-block self-start rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: COR_CATEGORIA[e.categoria].fundo, color: COR_CATEGORIA[e.categoria].texto }}
              >
                {ROTULO_CATEGORIA[e.categoria]}
              </span>
              <span className="text-[15px] font-semibold">{e.titulo}</span>
              <span className="text-[13px] leading-snug text-[#4B5563]">{e.subtitulo}</span>
            </div>
          ))
        )}
      </section>

      <section
        aria-label="Próximos 7 dias"
        className="flex flex-col gap-2.5 rounded-[14px] border border-[#E5E7EB] bg-white p-[18px]"
      >
        <h2 className="text-base font-bold">Próximos 7 dias</h2>
        {proximos.length === 0 && <p className="text-sm text-[#4B5563]">Nada vence nos próximos 7 dias.</p>}
        {proximos.map((e, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[#F3F4F6] py-1.5 last:border-0">
            <div className="flex w-[46px] flex-none flex-col items-center rounded-lg bg-[#F3F4F6] py-1">
              <span className="text-[10px] font-bold tracking-wide text-[#4B5563]">{DOW3[diaDaSemana(e.data)]}</span>
              <span className="text-lg font-bold leading-none">{numeroDoDia(e.data)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold leading-tight">{e.titulo}</span>
              <span className="flex items-center gap-1.5 text-xs text-[#4B5563]">
                {COR_CATEGORIA[e.categoria].ponto && (
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ background: COR_CATEGORIA[e.categoria].ponto }}
                  />
                )}
                {ROTULO_CATEGORIA[e.categoria]}
              </span>
            </div>
          </div>
        ))}
      </section>

      <p className="px-1 text-xs leading-relaxed text-[#4B5563]">
        Prazos de processos entram aqui automaticamente quando cadastrados na tela Processos.
      </p>
    </div>
  )
}
