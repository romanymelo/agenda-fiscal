import { ROTULO_ABRANGENCIA, type Abrangencia } from '@/lib/tipos'

/** Selo de abrangência do feriado, na cor de feriado dos mockups (texto #374151, fundo #E5E7EB, ponto #9CA3AF). */
export function SeloAbrangencia({ abrangencia, className = '' }: { abrangencia: Abrangencia; className?: string }) {
  return (
    <span
      data-abrangencia={abrangencia}
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#E5E7EB] px-2.5 py-0.5 text-xs font-semibold text-[#374151] ${className}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-[#9CA3AF]" />
      {ROTULO_ABRANGENCIA[abrangencia]}
    </span>
  )
}
