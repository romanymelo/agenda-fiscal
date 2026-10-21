'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState, useTransition, type FormEvent } from 'react'
import { AreaTexto, Botao, Campo, Selecao } from '@/components/campos'
import { ROTULO_REGIME, type Cliente, type Resultado } from '@/lib/tipos'
import { excluirCliente } from './acoes'

const OPCOES_SITUACAO = [
  { valor: 'true', rotulo: 'Ativo' },
  { valor: 'false', rotulo: 'Inativo' },
]
const OPCOES_REGIME = Object.entries(ROTULO_REGIME).map(([valor, rotulo]) => ({ valor, rotulo }))

/** Formulário de cliente, para cadastrar (sem `cliente`) ou editar (com `cliente`). */
function FormularioCliente({
  cliente,
  acao,
  envio,
  sucesso,
}: {
  cliente?: Cliente
  acao: (f: FormData) => Promise<Resultado>
  envio: string
  sucesso: string
}) {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, iniciar] = useTransition()
  // Envio feito à mão (`onSubmit` + `useTransition`), e não por `<form action>`: depois de toda ação o React 19
  // reinicia o formulário e um `<select>` não recupera o valor (regime e situação voltavam ao padrão depois de um
  // erro do servidor). Sem o reinício, o que foi digitado e escolhido fica; só o cadastro bem-sucedido limpa.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const dados = new FormData(form)
    iniciar(async () => {
      const r = await acao(dados)
      setResultado(r)
      if (r.ok && !cliente) form.reset()
    })
  }
  const valor = (padrao: string | null | undefined) => padrao ?? ''
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Campo
          rotulo="Nome"
          nome="nome"
          obrigatorio
          autoComplete="off"
          defaultValue={valor(cliente?.nome)}
          className="sm:col-span-6"
        />
        <Campo
          rotulo="Código no Domínio"
          nome="codigo_dominio"
          autoComplete="off"
          defaultValue={valor(cliente?.codigoDominio)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="CNPJ"
          nome="cnpj"
          autoComplete="off"
          defaultValue={valor(cliente?.cnpj)}
          className="sm:col-span-2"
        />
        <Selecao
          rotulo="Regime"
          nome="regime"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_REGIME}
          defaultValue={valor(cliente?.regime)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="UF"
          nome="uf"
          obrigatorio
          maxLength={2}
          autoComplete="off"
          defaultValue={valor(cliente?.uf)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Município"
          nome="municipio"
          obrigatorio
          autoComplete="off"
          defaultValue={valor(cliente?.municipio)}
          className="sm:col-span-4"
        />
        <Selecao
          rotulo="Situação"
          nome="ativo"
          opcoes={OPCOES_SITUACAO}
          ajuda="Inativo é o cliente que saiu do escritório: some da lista do dia a dia, mas o cadastro e o histórico ficam."
          defaultValue={cliente && !cliente.ativo ? 'false' : 'true'}
          className="sm:col-span-6"
        />
        <AreaTexto
          rotulo="Particularidades"
          nome="particularidades"
          rows={6}
          ajuda="Texto livre, quantas linhas precisar: como a nota fiscal deste cliente é emitida, por qual portal, observações próprias dele."
          defaultValue={valor(cliente?.particularidades)}
          className="sm:col-span-6"
        />
      </div>
      {resultado?.erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {resultado.erro}
        </p>
      )}
      {resultado?.ok && (
        <p role="status" className="text-sm font-medium text-[#166534]">
          {sucesso}
        </p>
      )}
      <Botao type="submit" disabled={enviando} className="self-start">
        {envio}
      </Botao>
    </form>
  )
}

/** "Novo cliente": o botão abre o formulário de cadastro, no próprio lugar. */
export function NovoCliente({ criar }: { criar: (f: FormData) => Promise<Resultado> }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Botao
        variante={aberto ? 'secundario' : 'primario'}
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="self-start"
      >
        {aberto ? 'Fechar' : 'Novo cliente'}
      </Botao>
      {aberto && (
        <section
          aria-label="Novo cliente"
          className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
        >
          <h2 className="text-base font-bold">Novo cliente</h2>
          <FormularioCliente acao={criar} envio="Cadastrar cliente" sucesso="Cliente cadastrado." />
        </section>
      )}
    </div>
  )
}

/** "Editar": o botão abre o formulário com os dados atuais. */
export function EditarCliente({
  cliente,
  alterar,
}: {
  cliente: Cliente
  alterar: (id: string, f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar edição' : 'Editar'}
      </Botao>
      {aberto && (
        <section
          aria-label="Editar cliente"
          className="flex flex-col gap-4 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <FormularioCliente
            cliente={cliente}
            acao={(f) => alterar(cliente.id, f)}
            envio="Salvar alterações"
            sucesso="Alterações salvas."
          />
        </section>
      )}
    </div>
  )
}

/** Exclusão (lógica). Só o administrador recebe este botão; quem decide é a página. */
export function ExcluirCliente({ id, nome }: { id: string; nome: string }) {
  const router = useRouter()
  const [erro, excluir] = useActionState(async (): Promise<string | null> => {
    const r = await excluirCliente(id)
    if (r.ok) {
      router.replace('/cadastros/clientes')
      return null
    }
    return r.erro ?? 'Não foi possível excluir.'
  }, null)
  return (
    <form
      action={excluir}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir o cliente ${nome}? Ele sai da lista; o histórico fica guardado.`)) e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <Botao type="submit" variante="perigo" className="self-start">
        Excluir cliente
      </Botao>
      {erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
    </form>
  )
}
