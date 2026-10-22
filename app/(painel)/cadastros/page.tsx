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
  '/cadastros/clientes': 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  '/cadastros/obrigacoes': 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  '/equipe': 'M12.2 8.5a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0ZM3 19.5c.4-3.2 2.8-5 6-5s5.6 1.8 6 5M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.9c1.7.6 2.7 2.1 3 4.6',
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
  {
    href: '/equipe',
    titulo: 'Equipe',
    descricao: 'Quem usa o painel, com qual papel, e quem está ativo. Só o administrador altera.',
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
