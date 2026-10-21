import { rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { nomeSeguro, salvarAnexo } from './arquivos'

// Os testes gravam de verdade em arquivos/ (a pasta local dos anexos, fora do Git); cada um apaga o que criou.
const gravados: string[] = []
afterEach(async () => {
  await Promise.all(gravados.splice(0).map((p) => rm(path.resolve('arquivos', p), { force: true })))
})
async function salvar(original: string, conteudo: string): Promise<string> {
  const caminho = await salvarAnexo(original, Buffer.from(conteudo))
  gravados.push(caminho)
  return caminho
}

test('nomeSeguro nao deixa o caminho escapar da pasta', () => {
  for (const n of ['../../etc/passwd', 'a/b.pdf', 'C:\\x.pdf', '..', '.', ''])
    expect(nomeSeguro(n)).not.toMatch(/[\\/]|^\.\.?$/)
})

test('nomeSeguro preserva a extensao', () => {
  expect(nomeSeguro('auto-de-infracao.pdf')).toMatch(/\.pdf$/)
})

test('salvarAnexo grava dentro de arquivos/ e devolve caminho relativo', async () => {
  const p = await salvar('../../fuga.pdf', 'x')
  expect(path.resolve('arquivos', p).startsWith(path.resolve('arquivos') + path.sep)).toBe(true)
  expect(path.isAbsolute(p)).toBe(false)
  // O nome em disco é gerado: nada do que o usuário enviou entra nele, só a extensão da lista branca.
  expect(p).toMatch(/^[0-9a-f-]{36}\.pdf$/)
})

test('dois anexos de mesmo nome nao se sobrescrevem', async () => {
  const a = await salvar('nota.pdf', '1')
  const b = await salvar('nota.pdf', '2')
  expect(a).not.toBe(b)
})
