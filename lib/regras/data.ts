import type { Data } from '../tipos'

// Aritmética de data pura sobre 'AAAA-MM-DD'.
// Toda conta usa Date.UTC / getUTC*, nunca o construtor local, para que o
// resultado não dependa do fuso da máquina. Date é só detalhe interno.

const MS_POR_DIA = 86_400_000

function paraUTC(d: Data): number {
  const [ano, mes, dia] = d.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

function doUTC(ms: number): Data {
  const dt = new Date(ms)
  return montarTexto(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

function montarTexto(ano: number, mes: number, dia: number): Data {
  const dd = String(dia).padStart(2, '0')
  const mm = String(mes).padStart(2, '0')
  return `${String(ano).padStart(4, '0')}-${mm}-${dd}`
}

/** Dia da semana: 0 = domingo ... 6 = sábado. */
export function diaDaSemana(d: Data): number {
  return new Date(paraUTC(d)).getUTCDay()
}

/** Soma (ou subtrai, se negativo) dias corridos. */
export function somarDias(d: Data, n: number): Data {
  return doUTC(paraUTC(d) + n * MS_POR_DIA)
}

/** Último dia do mês (mes de 1 a 12). */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** Monta a data limitando o dia ao último dia do mês (31/04 vira 30/04). */
export function montarData(ano: number, mes: number, dia: number): Data {
  return montarTexto(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)))
}

/** Soma (ou subtrai) meses a um par ano/mês (mes de 1 a 12). */
export function somarMeses(
  ano: number,
  mes: number,
  n: number,
): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + n
  return { ano: Math.floor(total / 12), mes: (total % 12 + 12) % 12 + 1 }
}

/** Formata 'AAAA-MM-DD' como 'dd/mm/aaaa' por recorte de texto, sem fuso. */
export function formatarBR(d: Data): string {
  const [ano, mes, dia] = d.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Formata um instante ISO como 'dd/mm/aaaa hh:mm' no fuso do escritório (America/Maceio). */
export function formatarDataHoraBR(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Maceio',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  )
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}
