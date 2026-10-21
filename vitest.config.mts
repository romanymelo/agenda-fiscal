import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    passWithNoTests: true,
    // Cada teste de banco sobe um PGlite novo e aplica as migrations: o padrão de 5s não basta.
    testTimeout: 20_000,
  },
})
