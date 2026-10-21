/** Selo Ativo/Inativo, o mesmo em todos os cadastros (cliente, obrigação) na lista e no detalhe. */
export function SeloSituacao({ ativo, className = '' }: { ativo: boolean; className?: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ativo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#E5E7EB] text-[#4B5563]'
      } ${className}`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}
