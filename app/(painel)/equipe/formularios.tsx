'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { Botao, Campo, Selecao } from '@/components/campos'
import type { Papel, Resultado } from '@/lib/tipos'
import { alterarUsuario, criarUsuario, desativarUsuario } from './acoes'

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
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-2xl border border-linha bg-papel p-4 sm:p-5">
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
        <p role="alert" className="text-sm font-medium text-perigo">
          {estado.resultado.erro}
        </p>
      )}
      {estado?.resultado.ok && (
        <p role="status" className="text-sm font-medium text-sucesso">
          Usuário cadastrado.
        </p>
      )}
      <Botao type="submit" disabled={enviando} className="self-start">
        Cadastrar usuário
      </Botao>
    </form>
  )
}

/** Corrige nome e e-mail de um usuário: erro de digitação não tem outro jeito de conserto, já que
 * o usuário nunca é excluído e o e-mail é único. Começa fechado; só o admin recebe. */
export function EditarDadosUsuario({ id, nome, email }: { id: string; nome: string; email: string }) {
  const [aberto, setAberto] = useState(false)
  const { estado, enviando, enviar } = useEnvio(
    (form) => alterarUsuario(id, form),
    (r) => r.ok && setAberto(false),
  )
  return (
    <div className="flex flex-col gap-2">
      <Botao
        variante="discreto"
        tamanho="compacto"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="self-start"
      >
        {aberto ? 'Fechar edição' : 'Corrigir nome/e-mail'}
      </Botao>
      {aberto && (
        <form
          onSubmit={enviar}
          className="flex flex-col gap-3 rounded-xl bg-sutil p-3 sm:flex-row sm:items-end"
        >
          <Campo rotulo="Nome" nome="nome" obrigatorio autoComplete="off" defaultValue={nome} className="flex-1" />
          <Campo
            rotulo="E-mail"
            nome="email"
            type="email"
            obrigatorio
            autoComplete="off"
            defaultValue={email}
            className="flex-1"
          />
          <Botao type="submit" variante="secundario" disabled={enviando}>
            Salvar dados
          </Botao>
        </form>
      )}
      {estado?.resultado.erro && (
        <p role="alert" className="text-xs font-medium text-perigo">
          {estado.resultado.erro}
        </p>
      )}
      {estado?.resultado.ok && (
        <p role="status" className="text-xs font-medium text-sucesso">
          Dados salvos.
        </p>
      )}
    </div>
  )
}

/** Histórico de um usuário, escondido atrás de um botão: começa fechado para não poluir a lista.
 * `historico` chega pronto da página (Server Component): este arquivo é `'use client'` e não pode
 * importar `<Historico>` diretamente. */
export function HistoricoDoUsuario({ historico }: { historico: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Botao variante="discreto" tamanho="compacto" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar histórico' : 'Ver histórico'}
      </Botao>
      {aberto && <div className="rounded-xl bg-sutil p-3">{historico}</div>}
    </div>
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
        <p role="alert" className="text-xs font-medium text-perigo">
          {estado.resultado.erro}
        </p>
      )}
      {estado?.resultado.ok && estado.origem === 'papel' && (
        <p role="status" className="text-xs font-medium text-sucesso">
          Papel salvo.
        </p>
      )}
    </div>
  )
}
