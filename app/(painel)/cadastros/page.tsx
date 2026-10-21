import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { exigirUsuario } from '@/lib/usuario-atual'

export const metadata = { title: 'Cadastros — Agenda Fiscal' }

// Índice dos cadastros. Cada tela de cadastro é uma entrada desta lista: quem criar uma nova
// (Obrigações, Feriados, praça do escritório, nas Tarefas 10 e 11) acrescenta um item aqui,
// com o caminho, o título e uma linha dizendo para que serve.
// Ícones de traço simples, no mesmo desenho da navegação.
const ICONES: Record<string, string> = {
  '/cadastros/clientes': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  '/cadastros/obrigacoes': 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  '/cadastros/feriados': 'M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM12 14v3',
}

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
    <main className="mr-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 py-6 sm:px-8 lg:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">Cadastros</h1>
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
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CADASTROS.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="flex h-full flex-col gap-3 rounded-2xl border border-linha bg-papel p-5 transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-flutua focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-mar-claro text-mar-escuro">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONES[c.href]} />
              </svg>
            </span>
            <span className="font-display text-xl font-semibold">{c.titulo}</span>
            <span className="text-sm leading-relaxed text-suave">{c.descricao}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
