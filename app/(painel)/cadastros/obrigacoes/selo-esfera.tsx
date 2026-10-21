import { COR_ESFERA, ROTULO_ESFERA, type Esfera } from '@/lib/tipos'

/** Selo com o nome da esfera e a cor dela (a mesma do calendário). */
export function SeloEsfera({ esfera, className = '' }: { esfera: Esfera; className?: string }) {
  const cor = COR_ESFERA[esfera]
  return (
    <span
      data-esfera={esfera}
      style={{ color: cor.texto, backgroundColor: cor.fundo }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      <span aria-hidden="true" style={{ backgroundColor: cor.ponto }} className="size-2 rounded-full" />
      {ROTULO_ESFERA[esfera]}
    </span>
  )
}
