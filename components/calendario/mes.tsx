import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { diaDaSemana, montarData, somarDias, ultimoDiaDoMes } from '@/lib/regras/data'
import type { Data } from '@/lib/tipos'
import { corBarra, estiloEtiqueta } from './estilo'

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Quantas etiquetas cabem numa célula antes do "+N". O dia inteiro está sempre na lateral.
const MAX_ETIQUETAS = 3
const MAX_PONTOS = 3

function numeroDoDia(d: Data): number {
  return Number(d.slice(8, 10))
}

function rotuloDoDia(numero: number, qtd: number): string {
  return `${numero}, ${qtd} ${qtd === 1 ? 'item' : 'itens'}`
}

/**
 * O mês em duas apresentações da mesma lista de dias: grade larga (md+), onde cada vencimento é
 * uma etiqueta legível, e grade compacta (celular), só com pontinhos de cor — o detalhe do dia
 * escolhido vem logo abaixo, na lateral. Assim não há rolagem horizontal em tela estreita.
 */
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

  const cabecalho = (
    <div className="grid grid-cols-7 text-xs font-semibold text-suave">
      {DOW.map((w) => (
        <div key={w} className="px-2.5 py-1.5 max-md:text-center">
          {w}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Grade larga */}
      <div className="hidden md:block">
        {cabecalho}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-linha bg-linha">
          {celulas.map((c, i) => {
            const numero = numeroDoDia(c.data)
            const fimDeSemana = i % 7 === 0 || i % 7 === 6

            if (!c.doMes) {
              return (
                <div key={c.data} className="min-h-[124px] min-w-0 bg-sutil p-2">
                  <span className="px-1 text-[13px] text-apagado">{numero}</span>
                </div>
              )
            }

            const eventos = porData.get(c.data) ?? []
            const eHoje = c.data === hoje
            const selecionado = c.data === dia
            const visiveis = eventos.slice(0, MAX_ETIQUETAS)
            const restantes = eventos.length - visiveis.length
            return (
              <Link
                key={c.data}
                href={`/?visao=mes&dia=${c.data}&esfera=${esfera}`}
                aria-label={rotuloDoDia(numero, eventos.length)}
                aria-current={selecionado ? 'date' : undefined}
                className={`flex min-h-[124px] min-w-0 flex-col gap-1.5 p-2 text-left transition-colors ${
                  selecionado ? 'relative z-10 ring-2 ring-inset ring-mar' : ''
                } ${eHoje ? 'bg-sol-claro' : fimDeSemana ? 'bg-sutil hover:bg-mar-claro/60' : 'bg-papel hover:bg-mar-claro/60'}`}
              >
                <span
                  className={
                    eHoje
                      ? 'marca-texto -rotate-2 self-start rounded-[5px] px-1.5 font-display text-[15px] font-bold tabular-nums text-tinta'
                      : 'self-start px-1.5 font-display text-[15px] font-semibold tabular-nums text-corpo'
                  }
                >
                  {numero}
                </span>
                {visiveis.map((e, j) => (
                  <span
                    key={j}
                    className="block hyphens-auto break-words rounded-[5px] border-l-[3px] px-1.5 py-[3px] text-[12px] font-medium leading-[1.25] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
                    style={estiloEtiqueta(e.categoria)}
                  >
                    {e.titulo}
                  </span>
                ))}
                {restantes > 0 && <span className="px-1 text-[12px] font-semibold text-suave">+{restantes} mais</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Grade compacta (celular) */}
      <div className="md:hidden">
        {cabecalho}
        <div className="grid grid-cols-7 gap-y-1">
          {celulas.map((c) => {
            const numero = numeroDoDia(c.data)
            if (!c.doMes) {
              return (
                <div key={c.data} className="flex h-[54px] items-start justify-center pt-2 text-[13px] text-apagado/70">
                  {numero}
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
                aria-label={rotuloDoDia(numero, eventos.length)}
                aria-current={selecionado ? 'date' : undefined}
                className={`flex h-[54px] flex-col items-center gap-1.5 rounded-lg pt-1.5 ${
                  selecionado ? 'bg-mar-claro ring-2 ring-inset ring-mar' : ''
                }`}
              >
                <span
                  className={
                    eHoje
                      ? 'marca-texto -rotate-2 rounded-[5px] px-1.5 font-display text-[15px] font-bold tabular-nums text-tinta'
                      : 'px-1.5 font-display text-[15px] font-semibold tabular-nums text-corpo'
                  }
                >
                  {numero}
                </span>
                <span className="flex h-1.5 items-center gap-[3px]" aria-hidden="true">
                  {eventos.slice(0, MAX_PONTOS).map((e, j) => (
                    <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ background: corBarra(e.categoria) }} />
                  ))}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
