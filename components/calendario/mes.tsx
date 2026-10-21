import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana, montarData, somarDias, ultimoDiaDoMes } from '@/lib/regras/data'
import { COR_CATEGORIA, type Data } from '@/lib/tipos'

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

export function Mes({
  dia,
  hoje,
  itens,
  esfera,
}: {
  /** Dia de referência: define o mês mostrado. */
  dia: Data
  hoje: Data
  /** Itens já filtrados pela esfera e restritos ao mês de `dia`. */
  itens: ItemCalendario[]
  esfera: string
}) {
  const [ano, mes] = dia.split('-').map(Number)
  const primeiroDoMes = montarData(ano, mes, 1)
  const ultimoDia = ultimoDiaDoMes(ano, mes)
  const inicioSemana = diaDaSemana(primeiroDoMes) // 0 = domingo: quantas células de outro mês entram antes

  const porData = new Map<Data, ItemCalendario[]>()
  for (const item of itens) {
    const lista = porData.get(item.data)
    if (lista) lista.push(item)
    else porData.set(item.data, [item])
  }

  const celulas: { data: Data; doMes: boolean }[] = []
  for (let i = 0; i < inicioSemana; i++) celulas.push({ data: somarDias(primeiroDoMes, i - inicioSemana), doMes: false })
  for (let d = 1; d <= ultimoDia; d++) celulas.push({ data: montarData(ano, mes, d), doMes: true })
  while (celulas.length % 7 !== 0) celulas.push({ data: somarDias(celulas[celulas.length - 1].data, 1), doMes: false })

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[680px] flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5">
          {DOW.map((w) => (
            <div key={w} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {celulas.map((c, i) => {
            const numero = numeroDoDia(c.data)
            const fimDeSemana = i % 7 === 0 || i % 7 === 6

            if (!c.doMes) {
              return (
                <div
                  key={c.data}
                  className="min-h-[112px] min-w-0 rounded-[10px] border border-[#F3F4F6] bg-[#F9FAFB] p-2 box-border"
                >
                  <span className="px-1 py-0.5 text-[13px] font-medium text-[#6B7280]">{numero}</span>
                </div>
              )
            }

            const eventos = porData.get(c.data) ?? []
            const eHoje = c.data === hoje
            const selecionado = c.data === dia
            return (
              <Link
                key={c.data}
                href={`/?visao=mes&dia=${c.data}&esfera=${esfera}`}
                aria-label={`${numero}, ${eventos.length} ${eventos.length === 1 ? 'item' : 'itens'}`}
                aria-current={selecionado ? 'date' : undefined}
                className={`box-border flex min-h-[112px] min-w-0 flex-col gap-1 rounded-[10px] text-left ${
                  selecionado
                    ? 'border-2 border-[#0F766E] bg-white p-[7px]'
                    : `border border-[#E5E7EB] p-2 ${fimDeSemana ? 'bg-[#FAFAFA]' : 'bg-white'}`
                }`}
              >
                <span
                  className={
                    eHoje
                      ? 'inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#0F766E] text-[13px] font-bold text-white'
                      : 'px-1 py-0.5 text-[13px] font-semibold'
                  }
                >
                  {numero}
                </span>
                {eventos.map((e, j) => (
                  <span
                    key={j}
                    className="block truncate rounded-[6px] px-[7px] py-[3px] text-xs font-semibold"
                    style={{ background: COR_CATEGORIA[e.categoria].fundo, color: COR_CATEGORIA[e.categoria].texto }}
                  >
                    {e.titulo}
                  </span>
                ))}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
