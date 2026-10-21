import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana, somarDias } from '@/lib/regras/data'
import { ROTULO_CATEGORIA, type Data } from '@/lib/tipos'
import { corBarra, corRotulo } from './estilo'

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

/**
 * A semana: sete colunas no desktop (lg+) e, em tela estreita, uma pauta vertical — um bloco por
 * dia, sem rolagem horizontal.
 */
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
    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-7">
      {dias.map((d) => {
        const eventos = porData.get(d) ?? []
        const eHoje = d === hoje
        const selecionado = d === dia
        return (
          <Link
            key={d}
            href={`/?visao=semana&dia=${d}&esfera=${esfera}`}
            aria-current={selecionado ? 'date' : undefined}
            className={`flex min-w-0 flex-col gap-2 rounded-xl p-2.5 text-left transition-colors lg:min-h-[400px] ${
              eHoje ? 'bg-sol-claro' : 'bg-sutil hover:bg-mar-claro/60'
            } ${selecionado ? 'ring-2 ring-inset ring-mar' : ''}`}
          >
            <span className="flex items-baseline gap-2 px-1 lg:flex-col lg:gap-0">
              <span className="text-[13px] font-semibold text-suave">
                <span className="lg:hidden">{DIA_LONGO[diaDaSemana(d)]}</span>
                <span className="hidden lg:inline">{DOW[diaDaSemana(d)]}</span>
              </span>
              <span
                className={
                  eHoje
                    ? 'marca-texto -rotate-2 self-start rounded-[5px] px-1.5 font-display text-[26px] font-bold leading-tight tabular-nums text-tinta'
                    : 'self-start px-1.5 font-display text-[26px] font-semibold leading-tight tabular-nums text-tinta'
                }
              >
                {numeroDoDia(d)}
              </span>
            </span>
            {eventos.length === 0 && <span className="px-1 py-1 text-xs text-apagado">Sem vencimentos</span>}
            {eventos.map((e, j) => (
              <span
                key={j}
                className="flex flex-col gap-0.5 rounded-lg border-l-[3px] bg-papel p-2.5 shadow-[0_1px_0_rgb(14_42_49/0.05)]"
                style={{ borderLeftColor: corBarra(e.categoria) }}
              >
                <span className="text-[11px] font-semibold" style={{ color: corRotulo(e.categoria) }}>
                  {ROTULO_CATEGORIA[e.categoria]}
                </span>
                <span className="text-[13px] font-semibold leading-tight">{e.titulo}</span>
                <span className="text-xs leading-snug text-suave">{e.subtitulo}</span>
              </span>
            ))}
          </Link>
        )
      })}
    </div>
  )
}
