import type { Data } from '../tipos'

/** Quantos dias faltam (positivo) ou passaram (negativo) de `de` até `ate`. Dias corridos, sem fuso. */
export function diasAte(de: Data, ate: Data): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

export type SituacaoPrazo = {
  /** vencido: já passou · urgente: de hoje até daqui a 7 dias · adiante: depois disso. */
  tipo: 'vencido' | 'urgente' | 'adiante'
  dias: number
}

/** O mesmo corte de 7 dias do "Próximos 7 dias" do calendário. */
export function situacaoDoPrazo(prazo: Data, hoje: Data): SituacaoPrazo {
  const dias = diasAte(hoje, prazo)
  return { tipo: dias < 0 ? 'vencido' : dias <= 7 ? 'urgente' : 'adiante', dias }
}

export function textoDoPrazo(dias: number): string {
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  if (dias > 1) return `em ${dias} dias`
  if (dias === -1) return 'venceu ontem'
  return `venceu há ${-dias} dias`
}
