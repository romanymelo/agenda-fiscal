import type { PGlite } from '@electric-sql/pglite'
import { obterConfiguracao } from './db/configuracao'
import { obterBanco } from './db/conexao'
import { feriadosEntre } from './db/feriados'
import { listarObrigacoes } from './db/obrigacoes'
import { listarProcessos } from './db/processos'
import { feriadosDaPraca } from './regras/feriados-aplicaveis'
import { comNacionaisCalculados } from './regras/feriados-nacionais'
import { montarData, somarDias, somarMeses, ultimoDiaDoMes, diaDaSemana } from './regras/data'
import { vencimentosDaObrigacao } from './regras/vencimentos'
import { ROTULO_ABRANGENCIA, type CategoriaCalendario, type Data, type Regime } from './tipos'

export type ItemCalendario = {
  data: Data
  categoria: CategoriaCalendario
  titulo: string
  subtitulo: string
  href?: string
  /** Só em vencimentos de obrigação: informativo (spec 4.2), nada no calendário é filtrado por ele. */
  regimesAplicaveis?: Regime[] | null
}

function paraAnoMes(d: Data): { ano: number; mes: number } {
  const [ano, mes] = d.split('-').map(Number)
  return { ano, mes }
}

/**
 * Junta vencimentos calculados, prazos de processos (não concluídos) e feriados da praça do
 * escritório entre `de` e `ate` (inclusive nas duas pontas), ordenados por data.
 *
 * Folga de consulta: `vencimentosDaObrigacao` recebe meses-base, e a data resultante pode cair
 * no mês vizinho (virada de mês, ex. dia 31 que é sábado vence em 02 do mês seguinte). Por isso
 * pedimos a ela um mês a mais de folga em cada ponta e filtramos o resultado pela DATA (não pelo
 * mês-base) dentro de [de, ate] — sem essa folga um vencimento de virada de mês desapareceria.
 */
export async function itensDoPeriodo(db: PGlite, de: Data, ate: Data): Promise<ItemCalendario[]> {
  const desejadoDe = paraAnoMes(de)
  const desejadoAte = paraAnoMes(ate)
  const folgaDe = somarMeses(desejadoDe.ano, desejadoDe.mes, -1)
  const folgaAte = somarMeses(desejadoAte.ano, desejadoAte.mes, 1)
  // Os feriados cobrem os mesmos meses de folga: é o conjunto que `vencimentosDaObrigacao` usa
  // para decidir se uma data cai em dia não útil perto da virada do mês.
  const feriadosDe = montarData(folgaDe.ano, folgaDe.mes, 1)
  const feriadosAte = montarData(folgaAte.ano, folgaAte.mes, ultimoDiaDoMes(folgaAte.ano, folgaAte.mes))

  const [praca, feriadosCadastrados, obrigacoes, processos] = await Promise.all([
    obterConfiguracao(db),
    feriadosEntre(db, feriadosDe, feriadosAte).then((f) => comNacionaisCalculados(f, feriadosDe, feriadosAte)),
    listarObrigacoes(db),
    listarProcessos(db),
  ])
  const feriadosPraca = feriadosDaPraca(feriadosCadastrados, praca)

  const itens: ItemCalendario[] = []

  for (const o of obrigacoes) {
    // Defensivo (decisão 3 do brief): uma obrigação nunca devia gerar duas datas iguais, mas o
    // agrupamento por data não pode duplicar visualmente se isso acontecer.
    const vistos = new Set<Data>()
    for (const v of vencimentosDaObrigacao(o, folgaDe, folgaAte, feriadosPraca)) {
      if (v.data < de || v.data > ate) continue
      if (vistos.has(v.data)) continue
      vistos.add(v.data)
      itens.push({
        data: v.data,
        categoria: v.esfera,
        titulo: v.nome,
        subtitulo: `Competência ${v.competencia}`,
        regimesAplicaveis: o.regimesAplicaveis,
      })
    }
  }

  for (const p of processos) {
    // Processo concluído não tem prazo pendente (decisão confirmada pela Tarefa 12): não entra no calendário.
    if (!p.prazo || p.status === 'concluido') continue
    if (p.prazo < de || p.prazo > ate) continue
    itens.push({
      data: p.prazo,
      categoria: 'processo',
      titulo: p.prazoDescricao ?? p.tipo,
      subtitulo: `${p.clienteNome} · ${p.orgao}`,
      href: `/processos?processo=${p.id}`,
    })
  }

  for (const f of feriadosCadastrados) {
    // Confronta o feriado individualmente com a praça (e não só a data): dois feriados municipais
    // na mesma data, de praças diferentes, não podem se confundir no `Set` de datas que vale.
    if (feriadosDaPraca([f], praca).size === 0) continue
    // Aqui sim filtramos pelo período pedido (sem a folga): a folga só serve ao cálculo de dia não útil acima.
    if (f.data < de || f.data > ate) continue
    itens.push({
      data: f.data,
      categoria: 'feriado',
      titulo: f.descricao,
      subtitulo: `Feriado ${ROTULO_ABRANGENCIA[f.abrangencia].toLowerCase()}`,
    })
  }

  return itens.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
}

/** Casca fina: a página não importa `obterBanco`. */
export async function itensDaTela(de: Data, ate: Data): Promise<ItemCalendario[]> {
  return itensDoPeriodo(await obterBanco(), de, ate)
}

export type Visao = 'hoje' | 'semana' | 'mes'

/**
 * O intervalo [de, ate] que cada visão mostra, a partir de um dia de referência `dia`.
 * Semana vai de domingo a sábado (contendo `dia`); Mês é o mês inteiro que contém `dia`.
 */
export function periodoDaVisao(visao: Visao, dia: Data): { de: Data; ate: Data } {
  if (visao === 'hoje') return { de: dia, ate: dia }
  if (visao === 'semana') {
    const de = somarDias(dia, -diaDaSemana(dia))
    return { de, ate: somarDias(de, 6) }
  }
  const { ano, mes } = paraAnoMes(dia)
  return { de: montarData(ano, mes, 1), ate: montarData(ano, mes, ultimoDiaDoMes(ano, mes)) }
}

/**
 * Dia de referência vizinho, um período inteiro adiante ou atrás: um mês (Mês), uma semana
 * (Semana, 7 dias) ou um dia (Hoje) — decisão de navegação do brief (seção 6).
 */
export function diaVizinho(visao: Visao, dia: Data, direcao: -1 | 1): Data {
  if (visao === 'mes') {
    const { ano, mes } = paraAnoMes(dia)
    const prox = somarMeses(ano, mes, direcao)
    return montarData(prox.ano, prox.mes, 1)
  }
  if (visao === 'semana') return somarDias(dia, 7 * direcao)
  return somarDias(dia, direcao)
}
