import { connection } from 'next/server'
import { Suspense } from 'react'
import { listarEquipeAtiva } from '@/lib/db/usuarios'
import { escolherUsuario } from './acoes'

const PAPEL: Record<string, string> = { admin: 'Administrador', membro: 'Membro' }

export const metadata = { title: 'Quem é você? — Agenda Fiscal' }

export default function Identificar() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quem é você?</h1>
        <p className="text-sm text-suave">
          A escolha serve para registrar quem anotou cada informação. Não há senha: é só nos dizer
          quem está usando o painel.
        </p>
      </div>
      {/* A lista vem do banco, em tempo de requisição: fica atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando a equipe…</p>}>
        <Equipe />
      </Suspense>
    </main>
  )
}

async function Equipe() {
  // O PGlite é um banco local: sem `connection()` a consulta rodaria durante o build, onde
  // não há banco. Ela só pode acontecer com a requisição em mãos.
  await connection()
  const equipe = await listarEquipeAtiva()
  if (equipe.length === 0)
    return (
      <p className="text-sm text-suave">
        Nenhuma pessoa ativa cadastrada. Procure quem administra o painel.
      </p>
    )
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {equipe.map((pessoa) => (
        <li key={pessoa.id}>
          {/* Escrever cookie só é permitido em Server Action: o cartão é o submit de um form. */}
          <form action={escolherUsuario.bind(null, pessoa.id)}>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl border border-linha bg-white px-4 py-4 text-left transition-colors hover:border-mar hover:bg-mar-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
            >
              <span className="block font-semibold">{pessoa.nome}</span>
              <span className="block text-sm text-suave">{PAPEL[pessoa.papel]}</span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  )
}
