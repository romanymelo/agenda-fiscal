import Link from 'next/link'
import { formatarBR, formatarDataHoraBR, somarDias } from '@/lib/regras/data'
import { COR_STATUS, ROTULO_STATUS, type Data, type Processo, type StatusProcesso } from '@/lib/tipos'

// Quadro de quatro colunas por situação, como no mockup. Server Component: cada cartão é um link que põe o
// processo na URL (`?processo=`), e o detalhe ao lado é refeito no servidor. Largo: rola na horizontal
// dentro do próprio quadro, nunca a página.

const COLUNAS = Object.keys(ROTULO_STATUS) as StatusProcesso[]

/** Endereço do quadro com a busca atual e, se houver, o processo escolhido. */
export function enderecoDoQuadro(busca: string, processo?: string): string {
  const q = new URLSearchParams()
  if (busca) q.set('busca', busca)
  if (processo) q.set('processo', processo)
  return `/processos${q.size ? `?${q}` : ''}`
}

// O chip do cartão (decisão da Tarefa 12): escuro quando o prazo vence em até 7 dias (ou já passou), âmbar
// quando há prazo mais adiante, cinza quando não há prazo pendente. Concluído nunca tem prazo pendente.
function chip(p: Processo, hoje: Data): { texto: string; classe: string } {
  const cinza = 'bg-espuma text-suave'
  if (p.status === 'concluido')
    return {
      texto: p.atualizadoEm ? `Concluído em ${formatarDataHoraBR(p.atualizadoEm).slice(0, 5)}` : 'Concluído',
      classe: cinza,
    }
  if (!p.prazo) return { texto: 'Sem prazo pendente', classe: cinza }
  const urgente = p.prazo <= somarDias(hoje, 7)
  return {
    texto: `Prazo ${formatarBR(p.prazo).slice(0, 5)}`,
    classe: urgente ? 'bg-tinta text-white' : 'bg-[#FEF3C7] text-[#78350F]',
  }
}

export function Quadro({
  processos,
  selecionadoId,
  hoje,
  busca,
}: {
  processos: Processo[]
  selecionadoId: string | null
  hoje: Data
  busca: string
}) {
  return (
    <section aria-label="Quadro de processos">
      <div className="overflow-x-auto">
        <div className="grid min-w-[800px] grid-cols-4 gap-3">
          {COLUNAS.map((status) => {
            const cartoes = processos.filter((p) => p.status === status)
            return (
              <section
                key={status}
                aria-label={ROTULO_STATUS[status]}
                className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-sutil p-2.5"
              >
                <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold text-tinta">
                    <span
                      aria-hidden="true"
                      className="size-[9px] rounded-full"
                      style={{ background: COR_STATUS[status].ponto }}
                    />
                    {ROTULO_STATUS[status]}
                  </h2>
                  <span className="rounded-full bg-white px-[9px] py-0.5 text-xs font-semibold text-corpo">
                    {cartoes.length}
                  </span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {cartoes.map((p) => {
                    const c = chip(p, hoje)
                    const escolhido = p.id === selecionadoId
                    return (
                      <li key={p.id}>
                        <Link
                          href={enderecoDoQuadro(busca, p.id)}
                          scroll={false}
                          aria-current={escolhido ? 'true' : undefined}
                          className={`flex w-full flex-col items-start gap-1 rounded-[10px] bg-white text-left text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar ${
                            escolhido
                              ? 'border-2 border-mar p-[11px] shadow-[0_2px_6px_rgba(0,0,0,.08)]'
                              : 'border border-linha p-3 hover:border-apagado'
                          }`}
                        >
                          <span className="text-xs font-semibold text-suave">{p.orgao}</span>
                          <span className="break-words text-sm leading-tight font-bold">{p.tipo}</span>
                          <span className="break-words text-[13px] text-corpo">{p.clienteNome}</span>
                          <span
                            className={`mt-1 rounded-md px-2 py-[3px] text-xs font-semibold ${c.classe}`}
                          >
                            {c.texto}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
