/** Selo Ativo/Inativo, o mesmo em todos os cadastros (cliente, obrigação) na lista e no detalhe. */
export function SeloSituacao({ ativo, className = '' }: { ativo: boolean; className?: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ativo ? 'bg-sucesso-claro text-sucesso' : 'bg-linha text-suave'
      } ${className}`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}
