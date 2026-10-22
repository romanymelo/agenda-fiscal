import { Simbolo } from '@/components/marca'
import { formatarBR, formatarDataHoraBR } from '@/lib/regras/data'
import { diasAte, situacaoDoPrazo, textoDoPrazo } from '@/lib/regras/prazo'
import { prazoPendente, type FiltrosRelatorio, type Grupo } from '@/lib/regras/relatorio-processos'
import { COR_STATUS, ROTULO_STATUS, type Andamento, type Data, type Processo, type StatusProcesso } from '@/lib/tipos'

// A folha do relatório de processos: o que se vê na tela e o que sai na impressora é o mesmo. Fica sempre
// em papel branco (`claro-fixo`), inclusive no tema escuro, para imprimir e salvar em PDF sem surpresa.

const COR_PRAZO = { vencido: 'text-perigo font-semibold', urgente: 'font-semibold text-tinta', adiante: 'text-suave' } as const

function Situacao({ status }: { status: StatusProcesso }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: COR_STATUS[status].ponto }} />
      {ROTULO_STATUS[status]}
    </span>
  )
}

function Prazo({ processo, hoje }: { processo: Processo; hoje: Data }) {
  const prazo = prazoPendente(processo)
  if (processo.status === 'concluido')
    return (
      <span className="text-suave">
        {processo.concluidoEm ? `Concluído em ${formatarDataHoraBR(processo.concluidoEm).slice(0, 10)}` : 'Concluído'}
      </span>
    )
  if (!prazo) return <span className="text-suave">Sem prazo</span>
  const s = situacaoDoPrazo(prazo, hoje)
  return (
    <span className="flex flex-col">
      <span className={COR_PRAZO[s.tipo]}>{formatarBR(prazo)}</span>
      <span className="text-[11px] text-suave">{textoDoPrazo(diasAte(hoje, prazo))}</span>
      {processo.prazoDescricao && <span className="text-[11px] text-suave">{processo.prazoDescricao}</span>}
    </span>
  )
}

function Andamentos({ lista, conteudo }: { lista: Andamento[]; conteudo: 'ultimo' | 'todos' }) {
  if (lista.length === 0) return <p className="m-0 text-suave">Sem andamentos registrados.</p>
  const mostrados = conteudo === 'ultimo' ? lista.slice(-1) : lista
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {mostrados.map((a) => (
        <li key={a.id} className="break-inside-avoid">
          <span className="font-semibold tabular-nums">{formatarBR(a.data)}</span>{' '}
          <span className="whitespace-pre-wrap">{a.descricao}</span>{' '}
          <span className="text-suave">({a.criadoPorNome})</span>
        </li>
      ))}
    </ul>
  )
}

export function FolhaDoRelatorio({
  grupos,
  andamentos,
  conteudo,
  hoje,
  resumo,
  geradoEm,
  geradoPor,
}: {
  grupos: Grupo[]
  andamentos: Record<string, Andamento[]>
  conteudo: FiltrosRelatorio['conteudo']
  hoje: Data
  /** Frases com as opções escolhidas, para constar no cabeçalho. */
  resumo: string[]
  /** Instante em que o relatório foi gerado (ISO). */
  geradoEm: string
  geradoPor: string
}) {
  const todos = grupos.flatMap((g) => g.processos)
  const porSituacao = (['em_andamento', 'aguardando_orgao', 'em_exigencia', 'concluido'] as const)
    .map((s) => [s, todos.filter((p) => p.status === s).length] as const)
    .filter(([, n]) => n > 0)
  return (
    <article
      aria-label="Relatório de processos"
      className="claro-fixo flex flex-col gap-5 rounded-2xl border border-linha bg-papel p-5 text-[13px] text-tinta [print-color-adjust:exact] sm:p-8 print:rounded-none print:border-0 print:p-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b-2 border-trilho pb-4">
        <div className="flex items-center gap-3">
          <Simbolo className="h-9 w-auto text-mar" />
          <div className="flex flex-col gap-1">
            <span className="font-marca text-lg leading-none font-bold tracking-[0.04em]">AGENDA FISCAL</span>
            <span className="font-display text-[22px] leading-none font-semibold">Relatório de processos</span>
          </div>
        </div>
        <p className="m-0 text-right text-[12px] leading-relaxed text-suave">
          Gerado em {formatarDataHoraBR(geradoEm)}
          <br />
          por {geradoPor}
        </p>
      </header>

      <section aria-label="Opções do relatório" className="flex flex-col gap-1 text-[12px] text-suave">
        <p className="m-0">{resumo.join(' · ')}</p>
        <p className="m-0 font-semibold text-tinta">
          {todos.length === 0
            ? 'Nenhum processo com essas opções.'
            : `${todos.length} ${todos.length === 1 ? 'processo' : 'processos'}: ${porSituacao.map(([s, n]) => `${n} ${ROTULO_STATUS[s].toLowerCase()}`).join(', ')}`}
        </p>
      </section>

      {grupos.map((g) => (
        <section key={g.chave} className="flex flex-col gap-2">
          {g.titulo && (
            <h2 className="m-0 break-after-avoid font-display text-base font-semibold">
              {g.titulo} <span className="font-sans text-[12px] font-normal text-suave">({g.processos.length})</span>
            </h2>
          )}
          <table className="w-full table-fixed border-collapse text-left align-top">
            {/* Mesmas colunas em todos os grupos, para a folha ficar alinhada de cima a baixo. */}
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="table-header-group">
              <tr className="border-b border-linha-forte text-[11px] text-suave">
                <th className="py-1.5 pr-3 font-semibold">Cliente</th>
                <th className="py-1.5 pr-3 font-semibold">Processo</th>
                <th className="py-1.5 pr-3 font-semibold">Situação</th>
                <th className="py-1.5 pr-3 font-semibold">Abertura</th>
                <th className="py-1.5 font-semibold">Prazo</th>
              </tr>
            </thead>
            {g.processos.map((p) => (
              // Um <tbody> por processo: a linha e os andamentos dele não se separam entre páginas.
              <tbody key={p.id} className="break-inside-avoid border-b border-linha">
                <tr className="align-top">
                  <td className="py-2 pr-3 font-semibold">{p.clienteNome}</td>
                  <td className="py-2 pr-3">
                    <span className="block">{p.tipo}</span>
                    <span className="block text-suave">
                      {p.orgao}
                      {p.protocolo ? ` · Protocolo ${p.protocolo}` : ''}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <Situacao status={p.status} />
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{formatarBR(p.dataAbertura)}</td>
                  <td className="py-2">
                    <Prazo processo={p} hoje={hoje} />
                  </td>
                </tr>
                {conteudo !== 'resumo' && (
                  <tr>
                    <td colSpan={5} className="pb-2.5 pl-3">
                      <Andamentos lista={andamentos[p.id] ?? []} conteudo={conteudo} />
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </section>
      ))}
    </article>
  )
}
