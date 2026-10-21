# Agenda Fiscal

Painel interno da equipe de um escritório de contabilidade: mostra o que vence hoje, na semana e
no mês, e acompanha os processos administrativos em andamento. Não é gestão de tarefas — é um
painel de consulta e registro, com autoria e histórico em toda escrita.

Esta fase do projeto roda inteiramente na máquina local, sem Supabase: o banco é o
[PGlite](https://pglite.dev) (Postgres em WASM), e os anexos ficam na pasta local `arquivos/`.
No Windows, os dados do banco ficam em `%LOCALAPPDATA%\agenda-fiscal\pgdata`, fora do projeto
(a variável `AGENDA_FISCAL_DB` muda o local). Motivo: sincronizadores como o backup do Google
Drive marcam as pastas do projeto como somente leitura, e o PGlite deixa de abrir o banco. O destino final é Supabase + Vercel; as migrations em
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

- `pgdata/` — dados do PGlite, quando ficam no projeto (fora do Windows, ou via `AGENDA_FISCAL_DB`).
- `arquivos/` — anexos enviados pelos processos.
- `.env.local` — variáveis de ambiente locais.
