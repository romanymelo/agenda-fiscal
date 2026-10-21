import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // O mesmo atalho "@/" do tsconfig, para os testes das Server Actions em app/.
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    passWithNoTests: true,
    // Cada teste de banco sobe um PGlite novo e aplica as migrations: o padrão de 5s não basta.
    testTimeout: 20_000,
  },
})
