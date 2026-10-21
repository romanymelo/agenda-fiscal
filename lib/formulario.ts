// Conversores de FormData para as Server Actions de todas as telas. O contrato com o helper de
// escrita (lib/db/escrita.ts) é este: `undefined` = "não mexa na coluna"; `null` = "limpe a coluna".
// Por isso cada conversor diz com precisão qual dos dois devolve.

/** Valor de formulário inválido; a mensagem já está em português e pode ir direto para a tela. */
export class ErroDeFormulario extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeFormulario'
  }
}

function bruto(fd: FormData, campo: string): string | undefined {
  const v = fd.get(campo)
  return typeof v === 'string' ? v.trim() : undefined
}

/** Texto sem espaços nas pontas. Campo ausente: `undefined`. Campo vazio: `''` (não vira null). */
export function texto(fd: FormData, campo: string): string | undefined {
  return bruto(fd, campo)
}

/** Como `texto`, mas vazio vira `null`: é o que limpa uma coluna opcional. Ausente: `undefined`. */
export function textoOuNulo(fd: FormData, campo: string): string | null | undefined {
  const v = bruto(fd, campo)
  return v === '' ? null : v
}

/** Só `'true'` e `'false'` valem. Ausente: `undefined`. Qualquer outra coisa, inclusive `''`, é erro. */
export function booleano(fd: FormData, campo: string): boolean | undefined {
  const v = bruto(fd, campo)
  if (v === undefined) return undefined
  if (v === 'true') return true
  if (v === 'false') return false
  throw new ErroDeFormulario(`O campo ${campo} deve ser true ou false.`)
}

/** Inteiro (com sinal opcional). Ausente ou vazio: `undefined`. Outra coisa: erro. */
export function inteiro(fd: FormData, campo: string): number | undefined {
  const v = bruto(fd, campo)
  if (v === undefined || v === '') return undefined
  if (!/^-?\d+$/.test(v)) throw new ErroDeFormulario(`O campo ${campo} precisa ser um número inteiro.`)
  return Number(v)
}

/**
 * Como `inteiro`, mas campo vazio vira `null`: é o que limpa uma coluna numérica opcional (ex.: trocar a
 * regra de `dia_util_n` para `antecipa` limpa `dia_util_n`). Ausente: `undefined`. Outra coisa: erro.
 */
export function inteiroOuNulo(fd: FormData, campo: string): number | null | undefined {
  const v = bruto(fd, campo)
  if (v === undefined) return undefined
  return v === '' ? null : inteiro(fd, campo)
}

/**
 * Todos os valores de um campo repetido (caixas de marcação com o mesmo `name`), sem espaços nas pontas e
 * sem os vazios. Campo ausente ou nada marcado: `[]` (não há como distinguir os dois; quem precisa de
 * "não mexa" decide pela presença de outro campo).
 */
export function lista(fd: FormData, campo: string): string[] {
  return fd
    .getAll(campo)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v !== '')
}

/** Como `lista`, convertendo cada valor para inteiro. Valor que não for inteiro: erro. */
export function inteiros(fd: FormData, campo: string): number[] {
  return lista(fd, campo).map((v) => {
    if (!/^-?\d+$/.test(v)) throw new ErroDeFormulario(`O campo ${campo} precisa conter só números inteiros.`)
    return Number(v)
  })
}
