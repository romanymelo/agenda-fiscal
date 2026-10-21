'use client'

import { useActionState } from 'react'
import { Botao, Campo, Selecao } from '@/components/campos'
import type { Papel } from '@/lib/tipos'
import { alterarUsuario, criarUsuario, desativarUsuario, type Resultado } from './acoes'

export const OPCOES_PAPEL: { valor: Papel; rotulo: string }[] = [
  { valor: 'membro', rotulo: 'Membro' },
  { valor: 'admin', rotulo: 'Administrador' },
]

// `origem` diz qual formulário disparou a última ação: só o resultado dela fica na tela.
type Estado = { resultado: Resultado | null; valores: Record<string, string>; origem: string | null }
const INICIAL: Estado = { resultado: null, valores: {}, origem: null }

// Roda a ação e guarda o que foi digitado: o React limpa o formulário depois de toda ação, e
// em caso de erro a pessoa não deve ter de digitar tudo de novo.
function executar(acao: (f: FormData) => Promise<Resultado>) {
  return async (_: Estado, form: FormData): Promise<Estado> => {
    const resultado = await acao(form)
    const valores = resultado.ok
      ? {}
      : (Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>)
    const origem = form.get('origem')
    return { resultado, valores, origem: typeof origem === 'string' ? origem : null }
  }
}

export function NovoUsuario() {
  const [estado, acao] = useActionState(executar(criarUsuario), INICIAL)
  return (
    <form action={acao} className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold">Novo usuário</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" obrigatorio defaultValue={estado.valores.nome} autoComplete="off" />
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          obrigatorio
          defaultValue={estado.valores.email}
          autoComplete="off"
        />
        <Selecao rotulo="Papel" nome="papel" opcoes={OPCOES_PAPEL} defaultValue={estado.valores.papel ?? 'membro'} />
      </div>
      {estado.resultado?.erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {estado.resultado.erro}
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
  // Um só estado para os dois formulários: o resultado mostrado é sempre o da última ação.
  const [estado, acao] = useActionState(
    executar((form) =>
      form.get('origem') === 'situacao' && ativo ? desativarUsuario(id) : alterarUsuario(id, form),
    ),
    INICIAL,
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <form action={acao} className="flex items-end gap-2">
          <input type="hidden" name="origem" value="papel" />
          <Selecao
            rotulo={`Papel de ${nome}`}
            ocultarRotulo
            nome="papel"
            opcoes={OPCOES_PAPEL}
            defaultValue={estado.valores.papel ?? papel}
            disabled={ehVoce}
          />
          <Botao type="submit" variante="secundario" disabled={ehVoce} aria-label={`Salvar papel de ${nome}`}>
            Salvar papel
          </Botao>
        </form>
        {!ehVoce && (
          <form action={acao}>
            <input type="hidden" name="origem" value="situacao" />
            {!ativo && <input type="hidden" name="ativo" value="true" />}
            <Botao
              type="submit"
              variante={ativo ? 'perigo' : 'secundario'}
              aria-label={`${ativo ? 'Desativar' : 'Reativar'} ${nome}`}
            >
              {ativo ? 'Desativar' : 'Reativar'}
            </Botao>
          </form>
        )}
      </div>
      {estado.resultado?.erro && (
        <p role="alert" className="text-xs font-medium text-[#B91C1C]">
          {estado.resultado.erro}
        </p>
      )}
      {estado.resultado?.ok && estado.origem === 'papel' && (
        <p role="status" className="text-xs font-medium text-[#166534]">
          Papel salvo.
        </p>
      )}
    </div>
  )
}
