import type { Data, Feriado, FeriadoCadastro } from '../tipos'
import { montarData, somarDias } from './data'

// Feriados nacionais calculados por regra, para qualquer ano: os fixos (data certa) e os móveis, que
// dependem da Páscoa. Assim o calendário não fica sem feriado quando o cadastro não cobre o ano.

/** Domingo de Páscoa do ano (calendário gregoriano; algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): Data {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return montarData(ano, mes, dia)
}

const FIXOS: [string, string][] = [
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['09-07', 'Independência'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
  ['12-25', 'Natal'],
]

/**
 * Feriados nacionais de um ano. Carnaval (segunda e terça) e Corpus Christi são pontos facultativos, mas
 * sem expediente bancário: entram porque deslocam vencimentos do mesmo jeito que um feriado.
 */
export function feriadosNacionais(ano: number): Feriado[] {
  const ano4 = String(ano).padStart(4, '0')
  const p = pascoa(ano)
  const moveis: [Data, string][] = [
    [somarDias(p, -48), 'Carnaval (segunda-feira)'],
    [somarDias(p, -47), 'Carnaval (terça-feira)'],
    [somarDias(p, -2), 'Sexta-feira Santa'],
    [somarDias(p, 60), 'Corpus Christi'],
  ]
  const todos: [Data, string][] = [...FIXOS.map(([dia, nome]): [Data, string] => [`${ano4}-${dia}`, nome]), ...moveis]
  return todos
    .map(([data, descricao]) => ({ data, descricao, abrangencia: 'nacional' as const, uf: null, municipio: null }))
    .sort((x, y) => (x.data < y.data ? -1 : 1))
}

/**
 * Junta o que está cadastrado com os nacionais calculados que caem entre `de` e `ate` (inclusive).
 * Um nacional calculado some quando já há um cadastrado na mesma data: o cadastro manda e não duplica.
 * Os calculados levam `automatico` e um id que não existe no banco, para as telas não os editarem.
 */
export function comNacionaisCalculados(cadastrados: FeriadoCadastro[], de: Data, ate: Data): FeriadoCadastro[] {
  const jaCadastrados = new Set(cadastrados.filter((f) => f.abrangencia === 'nacional').map((f) => f.data))
  const calculados: FeriadoCadastro[] = []
  for (let ano = Number(de.slice(0, 4)); ano <= Number(ate.slice(0, 4)); ano++) {
    for (const f of feriadosNacionais(ano)) {
      if (f.data < de || f.data > ate || jaCadastrados.has(f.data)) continue
      calculados.push({ ...f, id: `automatico-${f.data}`, automatico: true })
    }
  }
  return [...cadastrados, ...calculados].sort((x, y) =>
    x.data !== y.data ? (x.data < y.data ? -1 : 1) : x.descricao.localeCompare(y.descricao, 'pt-BR'),
  )
}
