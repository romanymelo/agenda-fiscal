import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { migrar } from './migrar'

const globalComBanco = globalThis as typeof globalThis & {
  __agendaFiscalBanco?: Promise<PGlite>
  __agendaFiscalBancoFechamentoRegistrado?: boolean
}

// Pasta de dados do PGlite; AGENDA_FISCAL_DB sobrescreve o padrão. Ambos passam por path.resolve.
export function caminhoDoBanco(): string {
  return path.resolve(process.cwd(), process.env.AGENDA_FISCAL_DB || 'pgdata')
}

// O PGlite grava um arquivo de trava (postmaster.pid) ao abrir e só o remove ao fechar de
// forma limpa. Sem isso, o próximo processo a abrir a mesma pasta demora muito para abrir
// (ou falha) por causa da trava órfã. Node não encerra sozinho ao receber Ctrl+C/SIGTERM
// quando há um handler destes registrado — por isso fechamos o banco e só então saímos.
// `once` por sinal e a flag em globalThis evitam registrar duas vezes no hot reload do dev.
function registrarFechamentoLimpo(): void {
  if (globalComBanco.__agendaFiscalBancoFechamentoRegistrado) return
  globalComBanco.__agendaFiscalBancoFechamentoRegistrado = true

  const fechar = async (sinal: NodeJS.Signals) => {
    const banco = globalComBanco.__agendaFiscalBanco
    if (banco) {
      try {
        await (await banco).close()
      } catch {
        // Encerrando mesmo assim; a pasta pode ficar com a trava órfã, mas não há como evitar.
      }
    }
    process.exit(sinal === 'SIGINT' ? 130 : 143)
  }

  process.once('SIGINT', () => void fechar('SIGINT'))
  process.once('SIGTERM', () => void fechar('SIGTERM'))
}

// Singleton em globalThis (sobrevive ao hot reload); migra na primeira chamada.
// Se a abertura ou a migração falhar, a Promise rejeitada não fica em cache.
export function obterBanco(): Promise<PGlite> {
  registrarFechamentoLimpo()
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
