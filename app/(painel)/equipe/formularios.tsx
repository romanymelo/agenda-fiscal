'use client'

import { useActionState } from 'react'
import { Botao, Campo, Selecao } from '@/components/campos'
import type { Papel } from '@/lib/tipos'
import { alterarUsuario, criarUsuario, desativarUsuario, type Resultado } from './acoes'

export const OPCOES_PAPEL: { valor: Papel; rotulo: string }[] = [
  { valor: 'membro', rotulo: 'Membro' },
  { valor: 'admin', rotulo: 'Administrador' },
]

type Estado = { resultado: Resultado | null; valores: Record<string, string> }
const INICIAL: Estado = { resultado: null, valores: {} }

// Roda a ação e guarda o que foi digitado: o React limpa o formulário depois de toda ação, e
// em caso de erro a pessoa não deve ter de digitar tudo de novo.
function executar(acao: (f: FormData) => Promise<Resultado>) {
  return async (_: Estado, form: FormData): Promise<Estado> => {
    const resultado = await acao(form)
    const valores = resultado.ok
      ? {}
      : (Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>)
    return { resultado, valores }
  }
}

const erroDe = (e: Estado) => e.resultado?.erro

export function NovoUsuario() {
  const [estado, acao] = useActionState(executar(criarUsuario), INICIAL)
  const erro = erroDe(estado)
  return (
    <form action={acao} className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold">Novo usuário</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" required defaultValue={estado.valores.nome} autoComplete="off" />
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          required
          defaultValue={estado.valores.email}
          autoComplete="off"
        />
        <Selecao rotulo="Papel" nome="papel" opcoes={OPCOES_PAPEL} defaultValue={estado.valores.papel ?? 'membro'} />
      </div>
      {erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
      {estado.resultado?.ok && (
        <p role="status" className="text-sm font-medium text-[#166534]">
          Usuário cadastrado.
        </p>
      )}
      <Botao type="submit" className="self-start">
        Cadastrar usuário
      </Botao>
    </form>
  )
}

/** Controles de um usuário da lista: papel, e desativar ou reativar. Só o admin os recebe. */
export function AcoesDoUsuario({
  id,
  nome,
  papel,
  ativo,
  ehVoce,
}: {
  id: string
  nome: string
  papel: Papel
  ativo: boolean
  ehVoce: boolean
}) {
  const [estadoPapel, acaoPapel] = useActionState(executar(alterarUsuario.bind(null, id)), INICIAL)
  const [estadoSituacao, acaoSituacao] = useActionState(
    executar(ativo ? desativarUsuario.bind(null, id) : (f) => alterarUsuario(id, f)),
    INICIAL,
  )
  const erro = erroDe(estadoPapel) ?? erroDe(estadoSituacao)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <form action={acaoPapel} className="flex items-end gap-2">
          <Selecao
            rotulo={`Papel de ${nome}`}
            ocultarRotulo
            nome="papel"
            opcoes={OPCOES_PAPEL}
            defaultValue={papel}
            disabled={ehVoce}
          />
          <Botao type="submit" variante="secundario" disabled={ehVoce}>
            Salvar papel
          </Botao>
        </form>
        {!ehVoce && (
          <form action={acaoSituacao}>
            {!ativo && <input type="hidden" name="ativo" value="true" />}
            <Botao type="submit" variante={ativo ? 'perigo' : 'secundario'}>
              {ativo ? 'Desativar' : 'Reativar'}
            </Botao>
          </form>
        )}
      </div>
      {erro && (
        <p role="alert" className="text-xs font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
    </div>
  )
}
