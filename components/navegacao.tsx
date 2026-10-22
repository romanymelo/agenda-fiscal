'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Simbolo } from '@/components/marca'
import { AlternarTema } from '@/components/tema'

// Casca de navegação: trilho escuro à esquerda no desktop (lg+) e, no celular, uma barra no topo
// com a marca e a barra de abas na base, ao alcance do polegar. Os destinos são os mesmos nos dois;
// só a apresentação muda (Cadastros é menu suspenso no trilho e aba no celular).

type Icone = (p: { className?: string }) => React.ReactNode

const traco = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const IconeCalendario: Icone = ({ className }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" {...traco}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <rect x="12.5" y="13" width="4.5" height="3.5" rx="1" fill="currentColor" stroke="none" />
  </svg>
)
const IconeProcessos: Icone = ({ className }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" {...traco}>
    <rect x="3.5" y="4" width="4.8" height="16" rx="1.6" />
    <rect x="9.6" y="4" width="4.8" height="10" rx="1.6" />
    <rect x="15.7" y="4" width="4.8" height="13" rx="1.6" />
  </svg>
)
const IconeCadastros: Icone = ({ className }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" {...traco}>
    <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" />
    <path d="M5 17a3 3 0 0 1 3-3h11M9.5 8h5" />
  </svg>
)
const ITENS: { href: string; rotulo: string; Icone: Icone }[] = [
  { href: '/', rotulo: 'Calendário', Icone: IconeCalendario },
  { href: '/processos', rotulo: 'Processos', Icone: IconeProcessos },
  { href: '/cadastros', rotulo: 'Cadastros', Icone: IconeCadastros },
]

// O que há dentro de Cadastros (no trilho). "Visão geral" é o índice (`/cadastros`), que não tem outro caminho no
// trilho; a Equipe fica aqui também, embora a rota seja `/equipe` (no celular ela é um cartão em Cadastros).
const SUBITENS: { href: string; rotulo: string }[] = [
  { href: '/cadastros', rotulo: 'Visão geral' },
  { href: '/cadastros/clientes', rotulo: 'Clientes' },
  { href: '/cadastros/obrigacoes', rotulo: 'Obrigações' },
  { href: '/cadastros/feriados', rotulo: 'Feriados' },
  { href: '/equipe', rotulo: 'Equipe' },
]

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase()
}

function estaAtivo(caminho: string, href: string): boolean {
  // A raiz só vale em igualdade exata; as outras abas valem para as subrotas
  // (`/cadastros/clientes` continua destacando Cadastros).
  return href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/')
}

/** Subitem: "Visão geral" só vale em igualdade exata, para não acender junto com os outros. */
function subitemAtivo(caminho: string, href: string): boolean {
  return href === '/cadastros' ? caminho === href : estaAtivo(caminho, href)
}

/**
 * "Cadastros" como menu suspenso: o botão abre e fecha a lista. Abre sozinho quando a pessoa entra numa
 * tela de cadastro (por um link, por exemplo) e a escolha de fechar vale até ela entrar em outra.
 */
function GrupoCadastros({ caminho, Icone }: { caminho: string; Icone: Icone }) {
  const dentro = SUBITENS.some((s) => subitemAtivo(caminho, s.href))
  const [aberto, setAberto] = useState(dentro)
  const [estavaDentro, setEstavaDentro] = useState(dentro)
  if (dentro !== estavaDentro) {
    setEstavaDentro(dentro)
    if (dentro) setAberto(true)
  }
  const aceso = dentro && !aberto
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="submenu-cadastros"
        onClick={() => setAberto(!aberto)}
        className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
          aceso
            ? 'bg-white/10 font-semibold text-white'
            : dentro
              ? 'font-semibold text-white hover:bg-white/5'
              : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        {aceso && <span aria-hidden="true" className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-marca" />}
        <Icone className={dentro ? 'text-marca' : 'text-white/60 group-hover:text-white'} />
        Cadastros
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          className={`ml-auto text-white/60 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          {...traco}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Fechado, a lista continua no HTML mas `inert`: não recebe foco nem clique. */}
      <div
        id="submenu-cadastros"
        inert={!aberto}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <ul className="m-0 ml-[22px] flex min-h-0 list-none flex-col gap-0.5 overflow-hidden border-l border-white/15 p-0 pl-2">
          {SUBITENS.map(({ href, rotulo }) => {
            const ativo = subitemAtivo(caminho, href)
            return (
              <li key={href} className="first:mt-1 last:mb-1">
                <Link
                  href={href}
                  aria-current={ativo ? 'page' : undefined}
                  className={`relative flex items-center rounded-lg px-3 py-2 text-[14px] transition-colors ${
                    ativo ? 'bg-white/10 font-semibold text-white' : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {ativo && <span aria-hidden="true" className="absolute -left-[9px] top-2 bottom-2 w-1 rounded-r-full bg-marca" />}
                  {rotulo}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// `hoje` vem pronto do servidor (fuso America/Maceio): o relógio do navegador não decide a data.
// `trocar` chega por prop: um componente de `components/` nunca importa de `app/`.
export function Navegacao({
  nome,
  hoje,
  trocar,
}: {
  nome: string
  hoje: string
  trocar: () => Promise<void>
}) {
  const caminho = usePathname()
  // "Quarta-feira, 21 de outubro de 2026" -> "Quarta-feira, 21 de outubro" (o ano está no calendário)
  const dataCurta = hoje.replace(/ de \d{4}$/, '')

  return (
    <>
      {/* Desktop: trilho fixo */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-trilho px-4 pb-5 pt-6 text-white lg:flex print:hidden">
        <Link
          href="/"
          aria-label="Agenda Fiscal: ir para o calendário"
          className="flex items-center gap-3 rounded-lg px-2 py-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          <Simbolo className="h-8 w-auto shrink-0 text-marca" />
          <div className="flex flex-col gap-1.5">
            <span className="font-marca text-[15px] leading-none font-bold tracking-[0.02em] whitespace-nowrap">AGENDA FISCAL</span>
            <span className="text-[13px] leading-none font-bold text-white/60">Painel do escritório</span>
          </div>
        </Link>
        <p className="mt-3 px-2 text-[13px] leading-snug text-white/60">{dataCurta}</p>

        <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
          {ITENS.map(({ href, rotulo, Icone }) => {
            if (href === '/cadastros') return <GrupoCadastros key={href} caminho={caminho} Icone={Icone} />
            const ativo = estaAtivo(caminho, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                  ativo ? 'bg-white/10 font-semibold text-white' : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {ativo && <span aria-hidden="true" className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-marca" />}
                <Icone className={ativo ? 'text-marca' : 'text-white/60 group-hover:text-white'} />
                {rotulo}
              </Link>
            )
          })}
        </nav>

        <AlternarTema comRotulo className="mt-auto px-3 py-2.5" />

        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mar-claro text-[13px] font-bold text-mar-escuro" aria-hidden="true">
            {iniciais(nome)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nome}</p>
            <form action={trocar}>
              <button type="submit" className="cursor-pointer text-[13px] text-white/60 underline-offset-2 hover:text-white hover:underline">
                Trocar de usuário
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Celular: marca e usuário no topo */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-trilho px-4 text-white lg:hidden print:hidden">
        <Link
          href="/"
          aria-label="Agenda Fiscal: ir para o calendário"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          <Simbolo className="h-7 w-auto shrink-0 text-marca" />
          <span className="font-marca text-base leading-none font-bold tracking-[0.04em] whitespace-nowrap">AGENDA FISCAL</span>
        </Link>
        <AlternarTema className="ml-auto h-9 w-9 justify-center" />
        <form action={trocar}>
          <button
            type="submit"
            aria-label={`${nome}. Trocar de usuário`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-mar-claro text-[13px] font-bold text-mar-escuro"
          >
            {iniciais(nome)}
          </button>
        </form>
      </header>

      {/* Celular: abas na base */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-linha bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        {ITENS.map(({ href, rotulo, Icone }) => {
          // A aba Cadastros também vale para a Equipe, que é um cartão dela.
          const ativo = href === '/cadastros' ? SUBITENS.some((s) => subitemAtivo(caminho, s.href)) : estaAtivo(caminho, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] ${
                ativo ? 'font-semibold text-mar' : 'font-medium text-suave'
              }`}
            >
              {ativo && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-sol" />}
              <Icone />
              {rotulo}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
