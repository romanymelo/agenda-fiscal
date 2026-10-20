import type { Data, Feriado, Praca } from '../tipos'

/** Minúsculas, sem acento e sem espaço nas pontas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Datas de feriado que valem para a praça (UF + município).
 * Nacional vale sempre; estadual só na UF; municipal só na UF e no município
 * (nomes de município se repetem entre estados).
 * Cadastro incompleto (estadual sem uf, municipal sem município) é ignorado,
 * para não deslocar vencimento de ninguém.
 */
export function feriadosDaPraca(feriados: Feriado[], praca: Praca): Set<Data> {
  const uf = normalizar(praca.uf)
  const municipio = normalizar(praca.municipio)
  const datas = new Set<Data>()
  for (const f of feriados) {
    if (f.abrangencia === 'nacional') {
      datas.add(f.data)
    } else if (f.abrangencia === 'estadual') {
      if (f.uf && normalizar(f.uf) === uf) datas.add(f.data)
    } else if (f.abrangencia === 'municipal') {
      if (
        f.uf && normalizar(f.uf) === uf &&
        f.municipio && normalizar(f.municipio) === municipio
      ) datas.add(f.data)
    }
  }
  return datas
}
