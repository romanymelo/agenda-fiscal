import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'

const PASTA = path.resolve(process.cwd(), 'supabase', 'migrations')

// Aplica as migrations pendentes, em ordem de nome. Arquivos com prefixo 9 (RLS) ficam de fora:
// só valem no Supabase. Cada arquivo roda numa transação, junto com o seu registro.
export async function migrar(db: PGlite): Promise<void> {
  await db.exec(
    'create table if not exists migrations_aplicadas (nome text primary key, aplicada_em timestamptz not null default now())',
  )
  const feitas = await db.query<{ nome: string }>('select nome from migrations_aplicadas')
  const jaAplicadas = new Set(feitas.rows.map((r) => r.nome))

  const arquivos = readdirSync(PASTA)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('9'))
    .sort()

  for (const arquivo of arquivos) {
    if (jaAplicadas.has(arquivo)) continue
    const sql = readFileSync(path.join(PASTA, arquivo), 'utf8')
    await db.transaction(async (tx) => {
      await tx.exec(sql)
      await tx.query('insert into migrations_aplicadas (nome) values ($1)', [arquivo])
    })
  }
}
