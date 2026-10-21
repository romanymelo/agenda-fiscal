'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Botao, Campo, Selecao } from '@/components/campos'
import type { Papel } from '@/lib/tipos'
import { alterarUsuario, criarUsuario, desativarUsuario, type Resultado } from './acoes'

export const OPCOES_PAPEL: { valor: Papel; rotulo: string }[] = [
  { valor: 'membro', rotulo: 'Membro' },
  { valor: 'admin', rotulo: 'Administrador' },
]

// Envio feito à mão (`onSubmit` + `useTransition`), e não por `<form action>`: depois de toda ação o React 19
// reinicia o formulário e um `<select>` não recupera o valor (o papel escolhido voltava a Membro). Sem o
// reinício, o que a pessoa digitou e escolheu fica como está; só o cadastro bem-sucedido limpa o formulário.
// `origem` diz qual formulário disparou a última ação: só o resultado dela fica na tela.
type Estado = { resultado: Resultado; origem: string | null }

function useEnvio(acao: (f: FormData) => Promise<Resultado>, aoTerminar?: (r: Resultado, form: HTMLFormElement) => void) {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [enviando, iniciar] = useTransition()
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const dados = new FormData(form)
    const origem = dados.get('origem')
    iniciar(async () => {
      const resultado = await acao(dados)
      setEstado({ resultado, origem: typeof origem === 'string' ? origem : null })
      aoTerminar?.(resultado, form)
    })
  }
  return { estado, enviando, enviar }
}

export function NovoUsuario() {
  const { estado, enviando, enviar } = useEnvio(criarUsuario, (r, form) => r.ok && form.reset())
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold">Novo usuário</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" obrigatorio autoComplete="off" />
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          obrigatorio
          autoComplete="off"
        />
        <Selecao rotulo="Papel" nome="papel" opcoes={OPCOES_PAPEL} defaultValue="membro" />
      </div>
      {estado?.resultado.erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {estado.resultado.erro}
        </p>
      )}
      {estado?.resultado.ok && (
        <p role="status" className="text-sm font-medium text-[#166534]">
          Usuário cadastrado.
        </p>
      )}
      <Botao type="submit" disabled={enviando} className="self-start">
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
  const { estado, enviando, enviar } = useEnvio((form) =>
    form.get('origem') === 'situacao' && ativo ? desativarUsuario(id) : alterarUsuario(id, form),
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <form onSubmit={enviar} className="flex items-end gap-2">
          <input type="hidden" name="origem" value="papel" />
          <Selecao
            rotulo={`Papel de ${nome}`}
            ocultarRotulo
            nome="papel"
            opcoes={OPCOES_PAPEL}
            defaultValue={papel}
            disabled={ehVoce}
          />
          <Botao type="submit" variante="secundario" disabled={ehVoce || enviando} aria-label={`Salvar papel de ${nome}`}>
            Salvar papel
          </Botao>
        </form>
        {!ehVoce && (
          <form onSubmit={enviar}>
            <input type="hidden" name="origem" value="situacao" />
            {!ativo && <input type="hidden" name="ativo" value="true" />}
            <Botao
              type="submit"
              disabled={enviando}
              variante={ativo ? 'perigo' : 'secundario'}
              aria-label={`${ativo ? 'Desativar' : 'Reativar'} ${nome}`}
            >
              {ativo ? 'Desativar' : 'Reativar'}
            </Botao>
          </form>
        )}
      </div>
      {estado?.resultado.erro && (
        <p role="alert" className="text-xs font-medium text-[#B91C1C]">
          {estado.resultado.erro}
        </p>
      )}
      {estado?.resultado.ok && estado.origem === 'papel' && (
        <p role="status" className="text-xs font-medium text-[#166534]">
          Papel salvo.
        </p>
      )}
    </div>
  )
}
