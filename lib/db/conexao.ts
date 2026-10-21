import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { migrar } from './migrar'

const globalComBanco = globalThis as typeof globalThis & {
  __agendaFiscalBanco?: Promise<PGlite>
  __agendaFiscalBancoFechamentoRegistrado?: boolean
}

// Pasta de dados do PGlite; AGENDA_FISCAL_DB sobrescreve o padrão.
// No Windows o padrão fica fora do projeto, em %LOCALAPPDATA%: sincronizadores como o backup do
// Google Drive marcam as pastas do projeto como somente leitura. O Windows ignora esse atributo,
// mas o PGlite (Postgres via Emscripten) obedece e falha ao criar o arquivo de trava
// ("PGlite failed to initialize properly"). Além disso, banco em uso não deve ser sincronizado.
export function caminhoDoBanco(): string {
  if (process.env.AGENDA_FISCAL_DB) return path.resolve(process.cwd(), process.env.AGENDA_FISCAL_DB)
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'agenda-fiscal', 'pgdata')
  }
  return path.resolve(process.cwd(), 'pgdata')
}

// O PGlite grava um arquivo de trava (postmaster.pid) ao abrir e só o remove ao fechar de
// forma limpa; fechar ao receber Ctrl+C/SIGTERM evita deixar a trava órfã. Node não encerra
// sozinho quando há um handler destes registrado — por isso fechamos o banco e só então saímos.
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
      const caminho = caminhoDoBanco()
      mkdirSync(path.dirname(caminho), { recursive: true })
      const db = new PGlite(caminho)
      await migrar(db)
      return db
    } catch (erro) {
      globalComBanco.__agendaFiscalBanco = undefined
      throw erro
    }
  })()
  return globalComBanco.__agendaFiscalBanco
}
