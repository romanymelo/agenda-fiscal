# Agenda Fiscal

Painel interno da equipe de um escritório de contabilidade: mostra o que vence hoje, na semana e
no mês, e acompanha os processos administrativos em andamento. Não é gestão de tarefas — é um
painel de consulta e registro, com autoria e histórico em toda escrita.

Esta fase do projeto roda inteiramente na máquina local, sem Supabase: o banco é o
[PGlite](https://pglite.dev) (Postgres em WASM), guardado num arquivo em `pgdata/`, e os anexos
ficam na pasta local `arquivos/`. O destino final é Supabase + Vercel; as migrations em
`supabase/migrations/` já são as que serão aplicadas lá, sem reescrita.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Na primeira visita a aplicação pede para escolher quem está usando
("Quem é você?"); a equipe inicial tem um usuário administrador:

- **Nome:** Administrador
- **E-mail:** admin@escritorio.local

Não há senha nesta fase (ver a spec, seção 5): quem acessa o painel escolhe seu próprio nome na
lista da equipe, e a escolha fica num cookie.

## Testes

```bash
npm test
```

Roda a suíte do Vitest (regras de negócio, camada de banco e Server Actions). Para checar tipos e
lint:

```bash
npx tsc --noEmit
npm run lint
```

## Pastas que não vão para o Git

- `pgdata/` — arquivo de dados do PGlite.
- `arquivos/` — anexos enviados pelos processos.
- `.env.local` — variáveis de ambiente locais.
