/**
 * Símbolo do projeto: um calendário com o dia de hoje marcado a marca-texto, a assinatura do painel.
 * O traço pinta com `currentColor`: no trilho escuro use `text-marca` (verde-água); em fundo claro, `text-mar`.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <rect x="12" y="13" width="5.5" height="4" rx="1.2" fill="var(--color-sol)" stroke="none" />
    </svg>
  )
}

/** Símbolo + nome do produto. `slogan` só entra onde há espaço (tela de identificação). */
export function Logotipo({
  tamanho = 'normal',
  slogan = false,
  className = '',
}: {
  tamanho?: 'normal' | 'grande'
  slogan?: boolean
  className?: string
}) {
  const grande = tamanho === 'grande'
  return (
    <span className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <Simbolo className={`${grande ? 'h-16' : 'h-9'} w-auto text-marca`} />
      <span className="flex flex-col items-center gap-2">
        <span className={`font-marca font-bold leading-none tracking-[0.04em] ${grande ? 'text-[34px]' : 'text-xl'}`}>
          AGENDA FISCAL
        </span>
        {slogan && (
          <span className="font-marca text-[11px] leading-snug tracking-[0.08em] text-white/70">
            VENCIMENTOS E PROCESSOS DO ESCRITÓRIO
          </span>
        )}
      </span>
    </span>
  )
}
