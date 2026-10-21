// Validação de feriado e da praça antes da escrita. O banco tem o mesmo `check` de abrangência
// (feriados_abrangencia_ck), mas o erro dele é cru; esta função existe para a mensagem chegar em português.
// Fica fora de `acoes.ts` porque arquivo 'use server' só exporta Server Actions.
import { ufValida } from '@/lib/ufs'

const UF_INVALIDA = 'Informe uma UF válida, como AL.'

export type DadosFeriado = {
  data: string
  descricao: string
  abrangencia: string
  /** Só vale para estadual e municipal. */
  uf: string
  /** Só vale para municipal. */
  municipio: string
}

/** 'AAAA-MM-DD' que existe no calendário (31/04 não existe). */
export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const d = new Date(`${data}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data
}

/** `null` quando está tudo certo; senão a mensagem em português. `uf` já vem em maiúsculas. */
export function validarFeriado(d: DadosFeriado): string | null {
  if (!d.data) return 'Informe a data do feriado.'
  if (!dataValida(d.data)) return 'A data do feriado é inválida.'
  if (!d.descricao) return 'Informe a descrição do feriado.'
  if (d.abrangencia !== 'nacional' && d.abrangencia !== 'estadual' && d.abrangencia !== 'municipal')
    return 'Escolha a abrangência do feriado.'
  if (d.abrangencia !== 'nacional') {
    if (!d.uf) return `Informe a UF do feriado ${d.abrangencia}.`
    if (!ufValida(d.uf)) return UF_INVALIDA
  }
  if (d.abrangencia === 'municipal' && !d.municipio) return 'Informe o município do feriado municipal.'
  return null
}

/** A praça do escritório: UF e município são obrigatórios. */
export function validarPraca(d: { uf: string; municipio: string }): string | null {
  if (!ufValida(d.uf)) return UF_INVALIDA
  if (!d.municipio) return 'Informe o município do escritório.'
  return null
}
