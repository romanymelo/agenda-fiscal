import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { COR_CATEGORIA, ROTULO_CATEGORIA, ROTULO_REGIME } from '@/lib/tipos'

export function Hoje({ itens }: { itens: ItemCalendario[] }) {
  if (itens.length === 0) {
    return <p className="p-6 text-center text-suave">Nada vence neste dia com este filtro.</p>
  }
  return (
    <div className="flex flex-col gap-2.5">
      {itens.map((e, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-linha p-4"
        >
          <span
            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: COR_CATEGORIA[e.categoria].fundo, color: COR_CATEGORIA[e.categoria].texto }}
          >
            {ROTULO_CATEGORIA[e.categoria]}
          </span>
          <div className="flex min-w-[260px] flex-1 flex-col gap-0.5">
            <span className="text-[17px] font-semibold">{e.titulo}</span>
            <span className="text-sm text-suave">{e.subtitulo}</span>
            {e.regimesAplicaveis && e.regimesAplicaveis.length > 0 && (
              <span className="text-sm text-suave">
                Regimes aplicáveis (informativo): {e.regimesAplicaveis.map((r) => ROTULO_REGIME[r]).join(', ')}
              </span>
            )}
          </div>
          {e.href && (
            <Link href={e.href} className="px-1 py-2.5 text-sm font-semibold">
              Ver processo
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
