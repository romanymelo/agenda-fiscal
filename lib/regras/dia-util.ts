import type { Data } from '../tipos'
import { diaDaSemana, montarData, somarDias, ultimoDiaDoMes } from './data'

/** Dia útil: não é sábado, domingo nem feriado do conjunto recebido. */
export function ehDiaUtil(d: Data, feriados: Set<Data>): boolean {
  const dia = diaDaSemana(d)
  return dia !== 0 && dia !== 6 && !feriados.has(d)
}

/** Recua até achar dia útil (a própria data, se já for útil). */
export function diaUtilAnterior(d: Data, feriados: Set<Data>): Data {
  let atual = d
  while (!ehDiaUtil(atual, feriados)) atual = somarDias(atual, -1)
  return atual
}

/** Avança até achar dia útil (a própria data, se já for útil). */
export function diaUtilSeguinte(d: Data, feriados: Set<Data>): Data {
  let atual = d
  while (!ehDiaUtil(atual, feriados)) atual = somarDias(atual, 1)
  return atual
}

/**
 * N-ésimo dia útil do mês, contado a partir do dia 1.
 * Se n exceder a quantidade de dias úteis do mês, devolve o último dia útil.
 */
export function nEsimoDiaUtil(
  ano: number,
  mes: number,
  n: number,
  feriados: Set<Data>,
): Data {
  let contados = 0
  let ultimoUtil: Data | null = null
  for (let dia = 1; dia <= ultimoDiaDoMes(ano, mes); dia++) {
    const d = montarData(ano, mes, dia)
    if (!ehDiaUtil(d, feriados)) continue
    ultimoUtil = d
    if (++contados === n) return d
  }
  return ultimoUtil as Data
}
