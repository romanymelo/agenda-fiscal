// Sobe o painel com dados fictícios, num banco temporário só dele (o seu banco de verdade não é tocado).
// Cada execução começa do zero, para as datas de exemplo sempre ficarem em torno de hoje.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const banco = path.join(tmpdir(), 'agenda-fiscal-demo')
rmSync(banco, { recursive: true, force: true })

const porta = process.env.PORT ?? '3000'
console.log(`Agenda Fiscal em modo demonstração: http://localhost:${porta}`)
console.log('Escolha "Administrador" (ou qualquer pessoa da equipe) na primeira tela. Ctrl+C encerra.\n')

const next = spawn(process.execPath, [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', porta], {
  stdio: 'inherit',
  env: { ...process.env, AGENDA_FISCAL_DB: banco, AGENDA_FISCAL_DEMO: '1' },
})
next.on('exit', (codigo) => process.exit(codigo ?? 0))
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => next.kill(sinal))
