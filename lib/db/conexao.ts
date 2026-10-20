import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { migrar } from './migrar'

const globalComBanco = globalThis as typeof globalThis & { __agendaFiscalBanco?: Promise<PGlite> }

// Pasta de dados do PGlite; AGENDA_FISCAL_DB sobrescreve o padrão.
export function caminhoDoBanco(): string {
  return process.env.AGENDA_FISCAL_DB ?? path.resolve(process.cwd(), 'pgdata')
}

// Singleton em globalThis (sobrevive ao hot reload); migra na primeira chamada.
export function obterBanco(): Promise<PGlite> {
  globalComBanco.__agendaFiscalBanco ??= (async () => {
    const db = new PGlite(caminhoDoBanco())
    await migrar(db)
    return db
  })()
  return globalComBanco.__agendaFiscalBanco
}
