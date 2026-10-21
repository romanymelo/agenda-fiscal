'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// No celular o detalhe fica embaixo do quadro: ao escolher outro cartão, leva a tela até ele.
// Na primeira abertura da página não rola; no computador o detalhe já está ao lado.
export function RolarAoDetalhe({ id, children }: { id: string | null; children: ReactNode }) {
  const alvo = useRef<HTMLDivElement>(null)
  const anterior = useRef(id)
  useEffect(() => {
    if (id && id !== anterior.current && !window.matchMedia('(min-width: 1024px)').matches) {
      alvo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    anterior.current = id
  }, [id])
  return (
    <div ref={alvo} className="scroll-mt-20 min-w-0 flex-[1_1_360px]">
      {children}
    </div>
  )
}
