import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { caminhoDoBanco, obterBanco } from './conexao'

let pasta: string
let anterior: string | undefined

beforeEach(() => {
  pasta = mkdtempSync(path.join(tmpdir(), 'agenda-fiscal-conexao-'))
  anterior = process.env.AGENDA_FISCAL_DB
  process.env.AGENDA_FISCAL_DB = pasta
})

afterEach(() => {
  process.env.AGENDA_FISCAL_DB = anterior
  rmSync(pasta, { recursive: true, force: true })
})

test('obterBanco registra o fechamento limpo uma unica vez, mesmo chamado varias vezes', async () => {
  const antesSigint = process.listenerCount('SIGINT')
  const antesSigterm = process.listenerCount('SIGTERM')

  await obterBanco()
  await obterBanco()
  await obterBanco()

  // O handler de fechamento limpo tem de existir e ser registrado uma vez so por processo,
  // mesmo com o hot reload chamando obterBanco de novo.
  expect(process.listenerCount('SIGINT')).toBe(antesSigint + 1)
  expect(process.listenerCount('SIGTERM')).toBe(antesSigterm + 1)
})

// O backup do Google Drive (e outros sincronizadores) marca as pastas do projeto como somente
// leitura. O Windows ignora isso, mas o PGlite (Postgres via Emscripten) obedece e falha ao
// criar o arquivo de trava. Por isso, no Windows, o banco fica fora da pasta do projeto.
test.skipIf(process.platform !== 'win32')(
  'no Windows, sem AGENDA_FISCAL_DB, o banco fica em LOCALAPPDATA, fora do projeto',
  () => {
    delete process.env.AGENDA_FISCAL_DB
    const esperado = path.join(process.env.LOCALAPPDATA!, 'agenda-fiscal', 'pgdata')
    expect(caminhoDoBanco()).toBe(esperado)
    expect(caminhoDoBanco().startsWith(process.cwd())).toBe(false)
  },
)

test('AGENDA_FISCAL_DB continua tendo prioridade sobre o padrao', () => {
  process.env.AGENDA_FISCAL_DB = pasta
  expect(caminhoDoBanco()).toBe(path.resolve(pasta))
})
