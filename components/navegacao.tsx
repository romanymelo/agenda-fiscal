'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Casca de navegação: trilho escuro à esquerda no desktop (lg+) e, no celular, uma barra no topo
// com a marca e a barra de abas na base, ao alcance do polegar. Os quatro destinos são os mesmos
// nos dois; só a apresentação muda.

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
const IconeEquipe: Icone = ({ className }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" {...traco}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3 19.5c.4-3.2 2.8-5 6-5s5.6 1.8 6 5" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.9c1.7.6 2.7 2.1 3 4.6" />
  </svg>
)

const ITENS: { href: string; rotulo: string; Icone: Icone }[] = [
  { href: '/', rotulo: 'Calendário', Icone: IconeCalendario },
  { href: '/processos', rotulo: 'Processos', Icone: IconeProcessos },
  { href: '/cadastros', rotulo: 'Cadastros', Icone: IconeCadastros },
  { href: '/equipe', rotulo: 'Equipe', Icone: IconeEquipe },
]

/** A marca: um calendário com o dia de hoje marcado a marca-texto, a assinatura do painel. */
function Marca({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-mar"
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={tamanho * 0.64} height={tamanho * 0.64} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
        <rect x="12" y="13" width="5.5" height="4" rx="1.2" fill="#FFD23F" stroke="none" />
      </svg>
    </span>
  )
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase()
}

function estaAtivo(caminho: string, href: string): boolean {
  // A raiz só vale em igualdade exata; as outras abas valem para as subrotas
  // (`/cadastros/clientes` continua destacando Cadastros).
  return href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/')
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-tinta px-4 pb-5 pt-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-2">
          <Marca />
          <span className="font-display text-[21px] font-bold leading-none tracking-tight">Agenda Fiscal</span>
        </div>
        <p className="mt-3 px-2 text-[13px] leading-snug text-white/60">{dataCurta}</p>

        <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
          {ITENS.map(({ href, rotulo, Icone }) => {
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
                {ativo && <span aria-hidden="true" className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-sol" />}
                <Icone className={ativo ? 'text-sol' : 'text-white/60 group-hover:text-white'} />
                {rotulo}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/5 p-3">
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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-linha bg-papel/95 px-4 backdrop-blur lg:hidden">
        <Marca tamanho={32} />
        <span className="font-display text-lg font-bold tracking-tight">Agenda Fiscal</span>
        <form action={trocar} className="ml-auto">
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
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-linha bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = estaAtivo(caminho, href)
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
