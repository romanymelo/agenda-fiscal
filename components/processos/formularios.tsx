'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState, useTransition, type FormEvent } from 'react'
import { AreaTexto, Botao, Campo, Selecao } from '@/components/campos'
import { ROTULO_STATUS, type Data, type Processo } from '@/lib/tipos'

// Formulários da tela de Processos. As Server Actions chegam por prop (um componente de `components/`
// nunca importa de `app/`). Todo envio é por `onSubmit` + `useTransition`, o padrão do projeto: com
// `<form action>` o React 19 reinicia o formulário e uma lista de escolha perde o valor depois de um erro.

type Resultado = { ok?: true; erro?: string }
type Opcao = { valor: string; rotulo: string }

const OPCOES_STATUS: Opcao[] = Object.entries(ROTULO_STATUS).map(([valor, rotulo]) => ({ valor, rotulo }))

// Estado e envio comuns aos formulários: devolve a mensagem do último envio e o `onSubmit`.
function useEnvio(
  acao: (f: FormData) => Promise<Resultado>,
  aoConcluir: (form: HTMLFormElement) => void,
) {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, iniciar] = useTransition()
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget // captura antes do await: depois dele currentTarget é null
    const dados = new FormData(form)
    iniciar(async () => {
      const r = await acao(dados)
      setResultado(r)
      if (r.ok) aoConcluir(form)
    })
  }
  return { resultado, enviando, enviar }
}

function Mensagem({ resultado, sucesso }: { resultado: Resultado | null; sucesso: string }) {
  if (resultado?.erro)
    return (
      <p role="alert" className="text-sm font-medium text-[#B91C1C]">
        {resultado.erro}
      </p>
    )
  if (resultado?.ok)
    return (
      <p role="status" className="text-sm font-medium text-[#166534]">
        {sucesso}
      </p>
    )
  return null
}

/** Formulário de processo, para cadastrar (sem `processo`) ou editar (com `processo`). */
function FormularioProcesso({
  processo,
  clientes,
  hoje,
  acao,
  envio,
  sucesso,
}: {
  processo?: Processo
  clientes: Opcao[]
  hoje: Data
  acao: (f: FormData) => Promise<Resultado>
  envio: string
  sucesso: string
}) {
  // Só o cadastro bem-sucedido limpa o formulário; a edição fica como foi salva.
  const { resultado, enviando, enviar } = useEnvio(acao, (form) => {
    if (!processo) form.reset()
  })
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Selecao
          rotulo="Cliente"
          nome="cliente_id"
          obrigatorio
          vazio="Escolha…"
          opcoes={clientes}
          defaultValue={processo?.clienteId ?? ''}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Tipo do processo"
          nome="tipo"
          obrigatorio
          autoComplete="off"
          placeholder="Impugnação de auto de infração"
          defaultValue={processo?.tipo ?? ''}
          className="sm:col-span-2"
        />
        <Campo rotulo="Órgão" nome="orgao" obrigatorio autoComplete="off" placeholder="SEFAZ-AL" defaultValue={processo?.orgao ?? ''} />
        <Campo rotulo="Protocolo" nome="protocolo" autoComplete="off" defaultValue={processo?.protocolo ?? ''} />
        <Campo rotulo="Aberto em" nome="data_abertura" type="date" obrigatorio defaultValue={processo?.dataAbertura ?? hoje} />
        {!processo && (
          <Selecao rotulo="Situação" nome="status" opcoes={OPCOES_STATUS} defaultValue="em_andamento" />
        )}
        <Campo rotulo="Prazo" nome="prazo" type="date" defaultValue={processo?.prazo ?? ''} />
        <Campo
          rotulo="Descrição do prazo"
          nome="prazo_descricao"
          autoComplete="off"
          placeholder="Prazo de impugnação"
          ajuda="Com prazo, o processo aparece no calendário da equipe."
          defaultValue={processo?.prazoDescricao ?? ''}
        />
      </div>
      <Mensagem resultado={resultado} sucesso={sucesso} />
      <Botao type="submit" disabled={enviando} className="self-start">
        {envio}
      </Botao>
    </form>
  )
}

/** "Novo processo": o botão abre o formulário de cadastro numa linha própria do cabeçalho. */
export function NovoProcesso({
  clientes,
  hoje,
  criar,
}: {
  clientes: Opcao[]
  hoje: Data
  criar: (f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Botao variante={aberto ? 'secundario' : 'primario'} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {aberto ? 'Fechar' : 'Novo processo'}
      </Botao>
      {aberto && (
        <section
          aria-label="Novo processo"
          className="flex basis-full flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
        >
          <h2 className="text-base font-bold">Novo processo</h2>
          <FormularioProcesso
            clientes={clientes}
            hoje={hoje}
            acao={criar}
            envio="Cadastrar processo"
            sucesso="Processo cadastrado."
          />
        </section>
      )}
    </>
  )
}

/** "Editar": o botão abre o formulário com os dados atuais. */
export function EditarProcesso({
  processo,
  clientes,
  hoje,
  alterar,
}: {
  processo: Processo
  clientes: Opcao[]
  hoje: Data
  alterar: (id: string, f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar edição' : 'Editar processo'}
      </Botao>
      {aberto && (
        <section
          aria-label="Editar processo"
          className="flex flex-col gap-4 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <FormularioProcesso
            processo={processo}
            clientes={clientes}
            hoje={hoje}
            acao={(f) => alterar(processo.id, f)}
            envio="Salvar alterações"
            sucesso="Alterações salvas."
          />
        </section>
      )}
    </div>
  )
}

/** Troca a situação (a coluna do quadro) direto da lista, sem abrir o formulário. */
export function MudarStatus({
  id,
  status,
  mudar,
}: {
  id: string
  status: string
  mudar: (id: string, status: string) => Promise<Resultado>
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [mudando, iniciar] = useTransition()
  return (
    <div className="flex flex-col gap-1">
      {/* Controlada pelo servidor: se a troca falhar, a lista volta à situação gravada. */}
      <Selecao
        rotulo="Mudar situação"
        nome="status"
        opcoes={OPCOES_STATUS}
        value={status}
        disabled={mudando}
        onChange={(e) => {
          const novo = e.target.value
          iniciar(async () => {
            const r = await mudar(id, novo)
            setErro(r.erro ?? null)
          })
        }}
        erro={erro ?? undefined}
        className="sm:max-w-[240px]"
      />
    </div>
  )
}

/** "Adicionar andamento": data (hoje por padrão) e descrição. Só acréscimo. */
export function NovoAndamento({
  processoId,
  hoje,
  adicionar,
}: {
  processoId: string
  hoje: Data
  adicionar: (processoId: string, f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  const { resultado, enviando, enviar } = useEnvio(
    (f) => adicionar(processoId, f),
    (form) => form.reset(),
  )
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar' : 'Adicionar andamento'}
      </Botao>
      {aberto && (
        <form
          onSubmit={enviar}
          aria-label="Novo andamento"
          className="flex flex-col gap-3 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <Campo rotulo="Data do andamento" nome="data" type="date" obrigatorio defaultValue={hoje} />
          <AreaTexto rotulo="O que aconteceu" nome="descricao" obrigatorio rows={3} />
          <Mensagem resultado={resultado} sucesso="Andamento registrado." />
          <Botao type="submit" disabled={enviando} className="self-start">
            Registrar andamento
          </Botao>
        </form>
      )}
    </div>
  )
}

/** "Anexar arquivo": um arquivo por envio. */
export function NovoAnexo({
  processoId,
  enviar: enviarArquivo,
}: {
  processoId: string
  enviar: (processoId: string, f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  const { resultado, enviando, enviar } = useEnvio(
    (f) => enviarArquivo(processoId, f),
    (form) => form.reset(),
  )
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar' : 'Anexar arquivo'}
      </Botao>
      {aberto && (
        <form
          onSubmit={enviar}
          aria-label="Novo anexo"
          className="flex flex-col gap-3 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <Campo
            rotulo="Arquivo"
            nome="arquivo"
            type="file"
            obrigatorio
            ajuda="PDF, imagem, planilha, documento, XML ou ZIP, até 10 MB."
          />
          <Mensagem resultado={resultado} sucesso="Arquivo anexado." />
          <Botao type="submit" disabled={enviando} className="self-start">
            Enviar arquivo
          </Botao>
        </form>
      )}
    </div>
  )
}

/** Exclusão (lógica). Só o administrador recebe este botão; quem decide é a página. */
export function ExcluirProcesso({
  id,
  descricao,
  excluir,
}: {
  id: string
  descricao: string
  excluir: (id: string) => Promise<Resultado>
}) {
  const router = useRouter()
  const [erro, acao] = useActionState(async (): Promise<string | null> => {
    const r = await excluir(id)
    if (r.ok) {
      router.replace('/processos')
      return null
    }
    return r.erro ?? 'Não foi possível excluir.'
  }, null)
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir o processo ${descricao}? Ele sai do quadro; o histórico fica guardado.`)) e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <Botao type="submit" variante="perigo" className="self-start">
        Excluir processo
      </Botao>
      {erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
    </form>
  )
}
