import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { migrar } from './migrar'

const globalComBanco = globalThis as typeof globalThis & { __agendaFiscalBanco?: Promise<PGlite> }

// Pasta de dados do PGlite; AGENDA_FISCAL_DB sobrescreve o padrão. Ambos passam por path.resolve.
export function caminhoDoBanco(): string {
  return path.resolve(process.cwd(), process.env.AGENDA_FISCAL_DB || 'pgdata')
}

// Singleton em globalThis (sobrevive ao hot reload); migra na primeira chamada.
// Se a abertura ou a migração falhar, a Promise rejeitada não fica em cache.
export function obterBanco(): Promise<PGlite> {
  globalComBanco.__agendaFiscalBanco ??= (async () => {
    try {
      const db = new PGlite(caminhoDoBanco())
      await migrar(db)
      return db
    } catch (erro) {
      globalComBanco.__agendaFiscalBanco = undefined
      throw erro
    }
  })()
  return globalComBanco.__agendaFiscalBanco
}
