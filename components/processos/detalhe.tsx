import type { ReactNode } from 'react'
import { formatarBR, formatarDataHoraBR } from '@/lib/regras/data'
import { COR_STATUS, ROTULO_STATUS, type Andamento, type Anexo, type Data, type Papel, type Processo, type Resultado } from '@/lib/tipos'
import {
  EditarProcesso,
  ExcluirProcesso,
  MudarStatus,
  NovoAnexo,
  NovoAndamento,
} from './formularios'

// Detalhe lateral de um processo, como no mockup. Server Component: mostra os dados e entrega os
// formulários (Client) com as Server Actions recebidas por prop, porque um componente de `components/`
// nunca importa de `app/`. O histórico chega pronto (`historico`), com os rótulos que só a tela conhece.

export type AcoesDoProcesso = {
  alterar: (id: string, f: FormData) => Promise<Resultado>
  mudarStatus: (id: string, status: string) => Promise<Resultado>
  adicionarAndamento: (processoId: string, f: FormData) => Promise<Resultado>
  enviarAnexo: (processoId: string, f: FormData) => Promise<Resultado>
  excluir: (id: string) => Promise<Resultado>
}

type Props = {
  processo: Processo & { andamentos: Andamento[]; anexos: Anexo[] }
  papel: Papel
  hoje: Data
  clientes: { valor: string; rotulo: string }[]
  acoes: AcoesDoProcesso
  historico: ReactNode
}

export function Detalhe({ processo, papel, hoje, clientes, acoes, historico }: Props) {
  const cor = COR_STATUS[processo.status]
  const dados: [string, string][] = [
    ['Órgão', processo.orgao],
    ['Protocolo', processo.protocolo ?? '—'],
    ['Aberto em', formatarBR(processo.dataAbertura)],
    ['Última atualização', processo.atualizadoEm ? formatarDataHoraBR(processo.atualizadoEm) : '—'],
  ]
  // Concluído não tem prazo pendente (o cartão do quadro também diz isso): a faixa só aparece enquanto o prazo vale.
  const prazoPendente = processo.prazo !== null && processo.status !== 'concluido'
  const ultimo = processo.andamentos.length - 1
  return (
    <aside
      aria-label="Detalhe do processo"
      className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1.5">
        <span
          className="self-start rounded-full px-2.5 py-1 text-xs font-bold tracking-[.03em] uppercase"
          style={{ background: cor.fundo, color: cor.texto }}
        >
          {ROTULO_STATUS[processo.status]}
        </span>
        <h2 className="mt-1 break-words text-xl leading-tight font-bold">{processo.tipo}</h2>
        <span className="break-words text-sm text-[#374151]">{processo.clienteNome}</span>
      </div>

      <MudarStatus id={processo.id} status={processo.status} mudar={acoes.mudarStatus} />

      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-[#4B5563]">{rotulo}</dt>
            <dd className="m-0 break-words text-sm font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>

      {prazoPendente && processo.prazo && (
        <div className="flex items-center gap-3 rounded-[10px] bg-[#FEF3C7] px-3.5 py-3 text-[#78350F]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <div className="flex min-w-0 flex-col gap-px">
            <span className="break-words text-sm font-bold">
              {processo.prazoDescricao ?? 'Prazo'}: {formatarBR(processo.prazo)}
            </span>
            <span className="text-xs">Já aparece no calendário da equipe</span>
          </div>
        </div>
      )}

      <section aria-label="Andamentos" className="flex flex-col gap-2.5">
        <h3 className="text-sm font-bold">Andamentos</h3>
        {processo.andamentos.length === 0 ? (
          <p className="text-sm text-[#4B5563]">Nenhum andamento registrado.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0">
            {processo.andamentos.map((a, i) => (
              <li key={a.id} className="flex gap-3">
                <span className="flex w-3.5 flex-none flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={`mt-[3px] size-3 flex-none rounded-full border-2 ${
                      i === ultimo ? 'border-[#0F766E] bg-[#0F766E]' : 'border-[#9CA3AF] bg-white'
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 w-0.5 flex-1 ${i === ultimo ? 'bg-transparent' : 'bg-[#E5E7EB]'}`}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3.5">
                  <span className="text-xs font-semibold text-[#4B5563]">{formatarBR(a.data)}</span>
                  <span className="whitespace-pre-wrap break-words text-sm leading-snug">{a.descricao}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <NovoAndamento processoId={processo.id} hoje={hoje} adicionar={acoes.adicionarAndamento} />
      </section>

      <section aria-label="Anexos" className="flex flex-col gap-2">
        <h3 className="text-sm font-bold">Anexos</h3>
        {processo.anexos.length === 0 ? (
          <p className="text-sm text-[#4B5563]">Nenhum anexo.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {processo.anexos.map((x) => (
              <li key={x.id}>
                {/* A rota recebe o id do anexo, nunca um caminho; baixa com o nome que a pessoa enviou. */}
                <a
                  href={`/processos/anexo/${x.id}`}
                  className="flex min-h-10 items-center gap-2.5 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[13px] text-[#1F2937] hover:bg-[#F9FAFB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                  </svg>
                  <span className="min-w-0 break-all">{x.nomeArquivo}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <NovoAnexo processoId={processo.id} enviar={acoes.enviarAnexo} />
      </section>

      <EditarProcesso processo={processo} clientes={clientes} hoje={hoje} alterar={acoes.alterar} />
      {/* Só o administrador exclui: para o membro o botão nem existe. */}
      {papel === 'admin' && (
        <ExcluirProcesso
          id={processo.id}
          descricao={`${processo.tipo} (${processo.clienteNome})`}
          excluir={acoes.excluir}
        />
      )}

      <hr className="border-[#E5E7EB]" />
      {historico}
    </aside>
  )
}
