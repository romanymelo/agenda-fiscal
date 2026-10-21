import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { obterBanco } from './conexao'

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

  // Sem o fechamento limpo, o PGlite fica com a trava (postmaster.pid) orfa ao sair, e o
  // proximo processo a abrir a mesma pasta demora muito ou falha (ver o comentario em
  // registrarFechamentoLimpo, em conexao.ts). Registrar o handler mais de uma vez por
  // instancia de processo e o unico jeito de regredir isso sem mudar esse numero.
  expect(process.listenerCount('SIGINT')).toBe(antesSigint + 1)
  expect(process.listenerCount('SIGTERM')).toBe(antesSigterm + 1)
})
