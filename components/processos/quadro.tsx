import Link from 'next/link'
import { formatarBR, formatarDataHoraBR } from '@/lib/regras/data'
import { situacaoDoPrazo, textoDoPrazo } from '@/lib/regras/prazo'
import { COR_STATUS, ROTULO_STATUS, type Data, type Processo, type StatusProcesso } from '@/lib/tipos'

// Quadro de quatro colunas por situação. Server Component: cada cartão é um link que põe o processo
// na URL (`?processo=`), e o detalhe ao lado é refeito no servidor. No celular as colunas viram um
// carrossel (uma por vez, com "snap"); a página nunca rola na horizontal.

const COLUNAS = Object.keys(ROTULO_STATUS) as StatusProcesso[]

/** Endereço do quadro com a busca atual e, se houver, o processo escolhido. */
export function enderecoDoQuadro(busca: string, processo?: string): string {
  const q = new URLSearchParams()
  if (busca) q.set('busca', busca)
  if (processo) q.set('processo', processo)
  return `/processos${q.size ? `?${q}` : ''}`
}

// O selo de prazo do cartão: vencido (vermelho), urgente em até 7 dias (marca-texto), adiante (âmbar
// claro) e, sem prazo pendente ou concluído, cinza. Concluído nunca tem prazo pendente.
function selo(p: Processo, hoje: Data): { texto: string; relativo?: string; classe: string } {
  const cinza = 'bg-espuma text-suave'
  if (p.status === 'concluido')
    return {
      texto: p.atualizadoEm ? `Concluído em ${formatarDataHoraBR(p.atualizadoEm).slice(0, 5)}` : 'Concluído',
      classe: cinza,
    }
  if (!p.prazo) return { texto: 'Sem prazo pendente', classe: cinza }
  const s = situacaoDoPrazo(p.prazo, hoje)
  const classe =
    s.tipo === 'vencido' ? 'bg-perigo text-white' : s.tipo === 'urgente' ? 'bg-sol text-tinta' : 'bg-[#FEF3C7] text-[#78350F]'
  return { texto: `Prazo ${formatarBR(p.prazo).slice(0, 5)}`, relativo: textoDoPrazo(s.dias), classe }
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
    <section aria-label="Quadro de processos" className="@container">
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 @2xl:mx-0 @2xl:grid @2xl:grid-cols-2 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0 @4xl:grid-cols-4">
        {COLUNAS.map((status) => {
          const cartoes = processos.filter((p) => p.status === status)
          return (
            <section
              key={status}
              aria-label={ROTULO_STATUS[status]}
              className="flex min-w-[84%] snap-start flex-col gap-2.5 rounded-2xl bg-sutil p-2.5 sm:min-w-[46%] @2xl:min-w-0"
            >
              <div className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: COR_STATUS[status].ponto }}
                  />
                  {ROTULO_STATUS[status]}
                </h2>
                <span className="rounded-full bg-papel px-2.5 py-0.5 font-display text-[13px] font-semibold tabular-nums text-corpo">
                  {cartoes.length}
                </span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {cartoes.map((p) => {
                  const c = selo(p, hoje)
                  const escolhido = p.id === selecionadoId
                  return (
                    <li key={p.id}>
                      <Link
                        href={enderecoDoQuadro(busca, p.id)}
                        scroll={false}
                        aria-current={escolhido ? 'true' : undefined}
                        className={`flex w-full flex-col items-start gap-1 rounded-xl bg-papel p-3.5 text-left text-tinta transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-flutua ${
                          escolhido ? 'ring-2 ring-mar shadow-flutua' : 'ring-1 ring-linha'
                        }`}
                      >
                        <span className="text-xs font-medium text-suave">{p.orgao}</span>
                        <span className="break-words text-[15px] leading-snug font-semibold">{p.tipo}</span>
                        <span className="break-words text-[13px] text-corpo">{p.clienteNome}</span>
                        <span className={`mt-1.5 inline-flex flex-wrap items-baseline gap-x-1.5 rounded-lg px-2.5 py-1 text-xs ${c.classe}`}>
                          <span className="font-semibold">{c.texto}</span>
                          {c.relativo && <span className="opacity-80">{c.relativo}</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
                {cartoes.length === 0 && <li className="px-2 py-3 text-[13px] text-apagado">Nenhum processo aqui.</li>}
              </ul>
            </section>
          )
        })}
      </div>
    </section>
  )
}
