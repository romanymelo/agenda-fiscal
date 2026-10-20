import type { Data, Esfera, Obrigacao } from '../tipos'
import { montarData, somarMeses } from './data'
import { diaUtilAnterior, diaUtilSeguinte, ehDiaUtil, nEsimoDiaUtil } from './dia-util'

export type Vencimento = {
  obrigacaoId: string
  nome: string
  esfera: Esfera
  data: Data
  competencia: string // 'MM/AAAA'
}

type AnoMes = { ano: number; mes: number }

function formatarCompetencia({ ano, mes }: AnoMes): string {
  return `${String(mes).padStart(2, '0')}/${ano}`
}

/**
 * Calcula as datas de vencimento de uma obrigacao, ordenadas por data.
 *
 * `de` e `ate` (inclusivos) delimitam os meses-base do vencimento, nao os limites da data resultante.
 * Quando a regra de dia nao util desloca a data, ela pode cair no mes vizinho
 * (ex.: 31/10/2026 e sabado; com `posterga` o vencimento sai em 02/11/2026).
 * A `competencia` e sempre calculada sobre o mes-base, nunca sobre o mes da data ajustada.
 */
export function vencimentosDaObrigacao(
  o: Obrigacao,
  de: AnoMes,
  ate: AnoMes,
  feriados: Set<Data>,
): Vencimento[] {
  const resultado: Vencimento[] = []
  const fim = ate.ano * 12 + ate.mes

  for (let i = 0; ; i++) {
    const { ano, mes } = somarMeses(de.ano, de.mes, i)
    if (ano * 12 + mes > fim) break

    // Trimestral e anual so vencem nos meses cadastrados; sem meses, nao inventa data.
    if (o.periodicidade !== 'mensal' && !(o.meses ?? []).includes(mes)) continue

    let data: Data
    if (o.regraDiaNaoUtil === 'dia_util_n') {
      // Sem N valido, obrigacao mal cadastrada nao gera data (melhor vazio que data errada).
      if (o.diaUtilN == null || o.diaUtilN < 1) continue
      // N-esimo dia util do mes: diaVencimento nao e usado.
      data = nEsimoDiaUtil(ano, mes, o.diaUtilN, feriados)
    } else {
      // Primeiro monta a data (limitando o dia ao fim do mes), so depois aplica a regra de dia nao util.
      data = montarData(ano, mes, o.diaVencimento)
      if (!ehDiaUtil(data, feriados)) {
        if (o.regraDiaNaoUtil === 'antecipa') data = diaUtilAnterior(data, feriados)
        else if (o.regraDiaNaoUtil === 'posterga') data = diaUtilSeguinte(data, feriados)
      }
    }

    resultado.push({
      obrigacaoId: o.id,
      nome: o.nome,
      esfera: o.esfera,
      data,
      competencia: formatarCompetencia(somarMeses(ano, mes, -o.competenciaDefasagem)),
    })
  }

  return resultado.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
}
