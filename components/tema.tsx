'use client'

import { useSyncExternalStore } from 'react'

// O tema é o atributo `data-theme` da <html>, posto antes da primeira pintura pelo script de
// app/layout.tsx. Aqui só se lê esse atributo e se troca; a escolha fica no navegador (localStorage).
type Tema = 'light' | 'dark'

function assinar(aviso: () => void) {
  const olho = new MutationObserver(aviso)
  olho.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => olho.disconnect()
}

const temaAtual = (): Tema => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function trocar() {
  const proximo: Tema = temaAtual() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = proximo
  try {
    localStorage.setItem('tema', proximo === 'dark' ? 'escuro' : 'claro')
  } catch {
    // Sem armazenamento (janela privada): o tema vale até recarregar.
  }
}

const traco = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Icone({ tema }: { tema: Tema }) {
  // Mostra para onde a troca leva: no claro, a lua; no escuro, o sol.
  return tema === 'light' ? (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...traco}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...traco}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  )
}

/** Botão de claro/escuro. Fica sobre fundo escuro nos dois temas (trilho e cabeçalho do celular). */
export function AlternarTema({ comRotulo = false, className = '' }: { comRotulo?: boolean; className?: string }) {
  const tema = useSyncExternalStore(assinar, temaAtual, () => 'light' as Tema)
  const rotulo = tema === 'light' ? 'Usar tema escuro' : 'Usar tema claro'
  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={rotulo}
      title={rotulo}
      className={`flex cursor-pointer items-center gap-3 rounded-lg text-[15px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white ${className}`}
    >
      <Icone tema={tema} />
      {comRotulo && (tema === 'light' ? 'Tema escuro' : 'Tema claro')}
    </button>
  )
}
