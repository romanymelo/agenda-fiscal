'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import { AreaTexto, Botao, Campo, Selecao } from '@/components/campos'
import { ROTULO_REGIME, type Cliente } from '@/lib/tipos'
import { excluirCliente, type Resultado } from './acoes'

const OPCOES_REGIME = Object.entries(ROTULO_REGIME).map(([valor, rotulo]) => ({ valor, rotulo }))

// Guarda o resultado e o que foi digitado: o React limpa o formulário depois de toda ação, e em
// caso de erro a pessoa não deve ter de digitar tudo de novo (principalmente as particularidades).
type Estado = { resultado: Resultado | null; valores: Record<string, string> }
const INICIAL: Estado = { resultado: null, valores: {} }

function executar(acao: (f: FormData) => Promise<Resultado>) {
  return async (_: Estado, form: FormData): Promise<Estado> => {
    const resultado = await acao(form)
    const valores = resultado.ok
      ? {}
      : (Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>)
    return { resultado, valores }
  }
}

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
  const [estado, enviar] = useActionState(executar(acao), INICIAL)
  const valor = (campo: string, padrao: string | null | undefined) => estado.valores[campo] ?? padrao ?? ''
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Campo
          rotulo="Nome"
          nome="nome"
          obrigatorio
          autoComplete="off"
          defaultValue={valor('nome', cliente?.nome)}
          className="sm:col-span-6"
        />
        <Campo
          rotulo="Código no Domínio"
          nome="codigo_dominio"
          autoComplete="off"
          defaultValue={valor('codigo_dominio', cliente?.codigoDominio)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="CNPJ"
          nome="cnpj"
          autoComplete="off"
          defaultValue={valor('cnpj', cliente?.cnpj)}
          className="sm:col-span-2"
        />
        <Selecao
          rotulo="Regime"
          nome="regime"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_REGIME}
          defaultValue={valor('regime', cliente?.regime)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="UF"
          nome="uf"
          obrigatorio
          maxLength={2}
          autoComplete="off"
          defaultValue={valor('uf', cliente?.uf)}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Município"
          nome="municipio"
          obrigatorio
          autoComplete="off"
          defaultValue={valor('municipio', cliente?.municipio)}
          className="sm:col-span-4"
        />
        <AreaTexto
          rotulo="Particularidades"
          nome="particularidades"
          rows={6}
          ajuda="Texto livre, quantas linhas precisar: como a nota fiscal deste cliente é emitida, por qual portal, observações próprias dele."
          defaultValue={valor('particularidades', cliente?.particularidades)}
          className="sm:col-span-6"
        />
      </div>
      {estado.resultado?.erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {estado.resultado.erro}
        </p>
      )}
      {estado.resultado?.ok && (
        <p role="status" className="text-sm font-medium text-[#166534]">
          {sucesso}
        </p>
      )}
      <Botao type="submit" className="self-start">
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
