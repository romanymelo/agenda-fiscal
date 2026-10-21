import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { exigirUsuario } from '@/lib/usuario-atual'

export const metadata = { title: 'Cadastros — Agenda Fiscal' }

// Índice dos cadastros. Cada tela de cadastro é uma entrada desta lista: quem criar uma nova
// (Obrigações, Feriados, praça do escritório, nas Tarefas 10 e 11) acrescenta um item aqui,
// com o caminho, o título e uma linha dizendo para que serve.
const CADASTROS = [
  {
    href: '/cadastros/clientes',
    titulo: 'Clientes',
    descricao: 'Quem o escritório atende, com código no Domínio, CNPJ, regime e as particularidades de cada um.',
  },
  {
    href: '/cadastros/obrigacoes',
    titulo: 'Obrigações',
    descricao: 'DAS, EFD-Contribuições, FGTS Digital, ICMS, ISS e as regras que definem quando cada uma vence.',
  },
  {
    href: '/cadastros/feriados',
    titulo: 'Feriados e praça do escritório',
    descricao: 'Os feriados que deslocam vencimentos e a UF e o município do escritório, que decidem quais deles valem.',
  },
]

export default function Cadastros() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">Cadastros</h1>
        <p className="text-sm text-suave">Os dados que o painel usa, em um só lugar</p>
      </div>
      <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  )
}

async function Conteudo() {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  await exigirUsuario()
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CADASTROS.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="flex h-full flex-col gap-1 rounded-[14px] border border-linha bg-white p-5 hover:border-mar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
          >
            <span className="text-base font-bold">{c.titulo}</span>
            <span className="text-sm text-suave">{c.descricao}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
