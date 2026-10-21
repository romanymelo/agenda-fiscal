import Link from 'next/link'
import type { ItemCalendario } from '@/lib/calendario'
import { ROTULO_CATEGORIA, ROTULO_REGIME } from '@/lib/tipos'
import { corBarra, corRotulo } from './estilo'

export function Hoje({ itens }: { itens: ItemCalendario[] }) {
  if (itens.length === 0) {
    return <p className="p-8 text-center text-suave">Nada vence neste dia com este filtro.</p>
  }
  return (
    <div className="flex flex-col gap-2.5">
      {itens.map((e, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border-l-4 bg-sutil p-4"
          style={{ borderLeftColor: corBarra(e.categoria) }}
        >
          <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-semibold" style={{ color: corRotulo(e.categoria) }}>
              {ROTULO_CATEGORIA[e.categoria]}
            </span>
            <span className="font-display text-[22px] font-semibold leading-tight">{e.titulo}</span>
            <span className="text-sm text-suave">{e.subtitulo}</span>
            {e.regimesAplicaveis && e.regimesAplicaveis.length > 0 && (
              <span className="text-sm text-suave">
                Regimes aplicáveis (informativo): {e.regimesAplicaveis.map((r) => ROTULO_REGIME[r]).join(', ')}
              </span>
            )}
          </div>
          {e.href && (
            <Link
              href={e.href}
              className="rounded-full border border-linha-forte bg-papel px-4 py-2 text-sm font-semibold text-mar-escuro transition-colors hover:bg-mar-claro"
            >
              Ver processo
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
