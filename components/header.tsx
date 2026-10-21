'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sairDaIdentificacao } from '@/app/identificar/acoes'

const ITENS = [
  { href: '/', rotulo: 'Calendário' },
  { href: '/processos', rotulo: 'Processos' },
  { href: '/cadastros', rotulo: 'Cadastros' },
  { href: '/equipe', rotulo: 'Equipe' },
] as const

// `hoje` vem pronto do servidor (fuso America/Maceio): o relógio do navegador não decide a data.
export function Header({ nome, hoje }: { nome: string; hoje: string }) {
  const caminho = usePathname()
  return (
    <header className="bg-white border-b border-[#E5E7EB]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F766E"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4.5" width="18" height="16" rx="3" />
            <path d="M3 9.5h18" />
            <path d="M8 2.5v4" />
            <path d="M16 2.5v4" />
            <path d="M8.5 15l2.2 2.2L15.5 12.5" />
          </svg>
          <span className="text-lg font-bold tracking-tight">Agenda Fiscal</span>
        </div>

        <nav aria-label="Principal" className="flex flex-wrap gap-1">
          {ITENS.map((item) => {
            const ativo = caminho === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={`rounded-lg px-3.5 py-2.5 text-sm ${
                  ativo
                    ? 'bg-[#E6F2F0] font-semibold text-[#0F5E57]'
                    : 'font-medium text-[#374151] hover:bg-[#F3F4F6]'
                }`}
              >
                {item.rotulo}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto">
          <span className="text-[13px] text-[#4B5563]">{hoje}</span>
          <span className="flex items-center gap-2 text-[13px]">
            <span className="font-semibold">{nome}</span>
            <form action={sairDaIdentificacao}>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-[#374151] hover:bg-[#F3F4F6]"
              >
                Trocar
              </button>
            </form>
          </span>
        </div>
      </div>
    </header>
  )
}
