import { connection } from 'next/server'
import { Suspense } from 'react'
import { Logotipo } from '@/components/marca'
import { listarEquipeAtiva } from '@/lib/db/usuarios'
import { escolherUsuario } from './acoes'

const PAPEL: Record<string, string> = { admin: 'Administrador', membro: 'Membro' }

// "Camila Bezerra" vira "CB": primeira e última palavra do nome.
function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export const metadata = { title: 'Quem é você? — Agenda Fiscal' }

export default function Identificar() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <header className="flex flex-col items-center bg-trilho px-4 pb-14 pt-12 text-white sm:pt-16">
        <Logotipo tamanho="grande" slogan />
      </header>
      <div className="mx-auto -mt-8 flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 sm:px-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-linha bg-papel p-5 shadow-flutua sm:p-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Quem é você?</h1>
          <p className="text-sm text-suave">
            A escolha serve para registrar quem anotou cada informação. Não há senha: é só nos dizer
            quem está usando o painel.
          </p>
        </div>
        {/* A lista vem do banco, em tempo de requisição: fica atrás de um limite de Suspense. */}
        <Suspense fallback={<p className="text-sm text-suave">Carregando a equipe…</p>}>
          <Equipe />
        </Suspense>
      </div>
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
              className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-linha bg-papel px-4 py-4 text-left transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-flutua focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mar-claro font-display text-base font-semibold text-mar-escuro"
              >
                {iniciais(pessoa.nome)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{pessoa.nome}</span>
                <span className="text-sm text-suave">{PAPEL[pessoa.papel]}</span>
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  )
}
