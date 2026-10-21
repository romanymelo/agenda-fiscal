import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana, somarDias } from '@/lib/regras/data'
import { COR_CATEGORIA, ROTULO_CATEGORIA, type Data } from '@/lib/tipos'

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

export function Semana({
  de,
  dia,
  hoje,
  itens,
  esfera,
}: {
  /** Primeiro dia (domingo) da semana mostrada. */
  de: Data
  /** Dia selecionado, para o destaque da coluna. */
  dia: Data
  hoje: Data
  /** Itens já filtrados pela esfera e restritos à semana. */
  itens: ItemCalendario[]
  esfera: string
}) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(de, i))
  const porData = new Map<Data, ItemCalendario[]>()
  for (const item of itens) {
    const lista = porData.get(item.data)
    if (lista) lista.push(item)
    else porData.set(item.data, [item])
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7 gap-2">
        {dias.map((d) => {
          const eventos = porData.get(d) ?? []
          const eHoje = d === hoje
          const selecionado = d === dia
          return (
            <Link
              key={d}
              href={`/?visao=semana&dia=${d}&esfera=${esfera}`}
              className={`box-border flex min-h-[420px] min-w-0 flex-col gap-2 rounded-[10px] bg-white text-left ${
                selecionado ? 'border-2 border-[#0F766E] p-[9px]' : 'border border-[#E5E7EB] p-2.5'
              }`}
            >
              <span
                className={`rounded-md px-1.5 py-1 text-[13px] font-bold ${eHoje ? 'bg-[#0F766E] text-white' : 'text-[#374151]'}`}
              >
                {DOW[diaDaSemana(d)]} {numeroDoDia(d)}
              </span>
              {eventos.length === 0 && <span className="px-0.5 py-1 text-xs text-[#6B7280]">Sem vencimentos</span>}
              {eventos.map((e, j) => (
                <span key={j} className="flex flex-col gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2">
                  <span
                    className="inline-block self-start rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: COR_CATEGORIA[e.categoria].fundo, color: COR_CATEGORIA[e.categoria].texto }}
                  >
                    {ROTULO_CATEGORIA[e.categoria]}
                  </span>
                  <span className="text-[13px] font-semibold leading-tight">{e.titulo}</span>
                  <span className="text-xs leading-snug text-[#4B5563]">{e.subtitulo}</span>
                </span>
              ))}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
