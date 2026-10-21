// Regras de coerência de uma obrigação. Fica num arquivo próprio, e não em acoes.ts, porque um arquivo
// 'use server' só pode exportar funções assíncronas; assim a mesma função serve à ação e ao teste.

/** Valores já convertidos. `undefined` é "não informado": aquela regra não é conferida. */
export type DadosObrigacao = {
  periodicidade?: string
  meses?: number[] | null
  regra_dia_nao_util?: string
  dia_vencimento?: number | null
  dia_util_n?: number | null
  competencia_defasagem?: number | null
}

/** Mensagem em português para o primeiro problema encontrado, ou `null` se os dados são coerentes. */
export function validarObrigacao(d: DadosObrigacao): string | null {
  if (d.periodicidade && d.periodicidade !== 'mensal' && !d.meses?.length)
    return 'Marque ao menos um mês de vencimento: obrigação trimestral ou anual precisa dos meses.'
  if (d.meses?.some((m) => m < 1 || m > 12)) return 'Os meses devem estar entre 1 (janeiro) e 12 (dezembro).'

  if (d.regra_dia_nao_util === 'dia_util_n') {
    if (d.dia_util_n == null)
      return 'Informe o número do dia útil (por exemplo, 10 para o 10º dia útil do mês).'
    // Um mês tem no máximo 23 dias úteis.
    if (d.dia_util_n < 1 || d.dia_util_n > 23) return 'O número do dia útil deve estar entre 1 e 23.'
  } else if (d.regra_dia_nao_util !== undefined && d.dia_vencimento == null) {
    return 'Informe o dia do vencimento, de 1 a 31.'
  }
  if (d.dia_vencimento != null && (d.dia_vencimento < 1 || d.dia_vencimento > 31))
    return 'O dia do vencimento deve estar entre 1 e 31.'

  if (d.competencia_defasagem != null && (d.competencia_defasagem < 0 || d.competencia_defasagem > 12))
    return 'A defasagem da competência deve estar entre 0 e 12 meses.'
  return null
}
