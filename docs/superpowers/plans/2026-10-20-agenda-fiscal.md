# Agenda Fiscal — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, rodando localmente, o painel interno do escritório: calendário de vencimentos calculados, quadro de processos, cadastros com particularidades por cliente, equipe, e autoria registrada em toda escrita.

**Architecture:** Next.js App Router com escrita exclusivamente em Server Actions. Todo SQL fica em `lib/db/`, um repositório por entidade, atrás de um único helper de escrita que grava auditoria e histórico na mesma transação. As regras de vencimento são funções puras sobre datas em texto `YYYY-MM-DD`, sem dependência de fuso. O banco local é PGlite — Postgres em WASM — alimentado pelas mesmas migrations SQL que irão para o Supabase.

**Tech Stack:** Next.js (App Router) + React + TypeScript, Tailwind CSS, `@electric-sql/pglite`, Vitest, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-10-20-agenda-fiscal-design.md`

## Global Constraints

- Interface, mensagens, commits e comentários em português do Brasil.
- Datas exibidas em dd/mm/aaaa; fuso America/Maceio.
- Datas puras circulam como texto `YYYY-MM-DD` (tipo `Data`). Nenhuma função de regra recebe `Date`.
- Fonte IBM Plex Sans; acento `#0F766E`; fundo `#F3F4F6`; cartões brancos com borda `#E5E7EB`.
- Cores por esfera: Federal `#1E40AF`/`#DBEAFE`/`#2563EB`; Estadual `#9A3412`/`#FFEDD5`/`#EA580C`; Municipal `#5B21B6`/`#EDE9FE`/`#7C3AED`; Trabalhista `#166534`/`#DCFCE7`/`#16A34A`; Processo `#FFFFFF`/`#1F2937`; Feriado `#374151`/`#E5E7EB`/`#9CA3AF`.
- Cores por status de processo: Em andamento `#2563EB`/`#DBEAFE`/`#1E40AF`; Aguardando órgão `#D97706`/`#FEF3C7`/`#92400E`; Em exigência `#E11D48`/`#FFE4E6`/`#9F1239`; Concluído `#16A34A`/`#DCFCE7`/`#166534`.
- Nenhum componente ou arquivo em `app/` ou `components/` emite SQL. Escrita só em Server Action.
- Toda consulta de tela filtra `excluido_em is null`.
- Exclusão é sempre lógica. Nenhum `DELETE` no código, exceto o que as migrations definem.
- `.env.local`, `arquivos/` e `pgdata/` ficam fora do git.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Saída de Playwright sempre reduzida: só falhas e resumo.

## Review Focus

Cinco comportamentos que a spec implica sem descrever, cada um com o teste atribuído à tarefa que tem o código:

1. **`dia_vencimento` maior que o mês** — obrigação com dia 31 em mês de 30 dias, ou dia 29 em fevereiro comum, deve cair no último dia do mês, nunca transbordar para o mês seguinte. (Tarefa 2)
2. **`dia_util_n` além dos dias úteis do mês** — pedir o 25º dia útil deve devolver o último dia útil do mês, não uma data do mês seguinte. (Tarefa 3)
3. **Antecipação e postergação encadeadas** — se a véspera também é feriado, o ajuste continua recuando; idem avançando. Um único passo não basta. (Tarefa 3)
4. **Usuário do cookie desativado ou inexistente** — alguém identificado ontem, desativado hoje, não escreve: a escrita é recusada e a pessoa volta para "Quem é você?". (Tarefa 7)
5. **Nome de arquivo de anexo hostil** — `../../etc/passwd` ou nome com barra não pode escapar da pasta `arquivos/`: o arquivo é gravado com nome gerado e o nome original vive só na coluna `nome_arquivo`. (Tarefa 12)

---

## Estrutura de arquivos

**Regras puras** (sem I/O, testadas em isolamento)
- `lib/tipos.ts` — tipos do domínio, compartilhados por tudo
- `lib/regras/data.ts` — aritmética de data pura sobre `YYYY-MM-DD`
- `lib/regras/feriados-aplicaveis.ts` — normalização de texto e recorte por praça
- `lib/regras/dia-util.ts` — dia útil, anterior, seguinte, N-ésimo
- `lib/regras/vencimentos.ts` — datas de vencimento de uma obrigação

**Banco**
- `lib/db/conexao.ts` — singleton do PGlite
- `lib/db/migrar.ts` — aplica as migrations em ordem
- `lib/db/escrita.ts` — `criar` / `alterar` / `excluir`, com papel, auditoria e histórico
- `lib/db/{usuarios,clientes,obrigacoes,feriados,configuracao,processos,historico}.ts` — leitura por entidade
- `supabase/migrations/0001_estrutura.sql`, `0002_dados_iniciais.sql`, `9999_rls.sql`

**Identificação**
- `lib/usuario-atual.ts` — lê o cookie, valida, expõe o usuário
- `app/identificar/page.tsx` + `app/identificar/acoes.ts`

**Telas**
- `app/layout.tsx`, `components/header.tsx`
- `app/page.tsx` + `components/calendario/*`
- `app/processos/page.tsx` + `components/processos/*`
- `app/cadastros/{clientes,obrigacoes,feriados}/page.tsx` + `acoes.ts` em cada
- `app/equipe/page.tsx` + `acoes.ts`
- `components/historico.tsx` — bloco de histórico reutilizado por clientes e processos
- `components/campos.tsx` — input, select, textarea e botão no estilo dos mockups

---

### Task 1: Scaffold e verificação

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.ts`, `lib/tipos.ts`
- Modify: `.gitignore`, `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: nada.
- Produces: `lib/tipos.ts` com os tipos usados por todas as tarefas:
  `Papel = 'admin' | 'membro'`; `Esfera = 'federal' | 'estadual' | 'municipal' | 'trabalhista'`;
  `Periodicidade = 'mensal' | 'trimestral' | 'anual'`;
  `RegraDiaNaoUtil = 'antecipa' | 'posterga' | 'dia_util_n'`;
  `Abrangencia = 'nacional' | 'estadual' | 'municipal'`;
  `StatusProcesso = 'em_andamento' | 'aguardando_orgao' | 'em_exigencia' | 'concluido'`;
  `Acao = 'criacao' | 'alteracao' | 'exclusao'`;
  `type Data = string` (`'YYYY-MM-DD'`);
  `type Praca = { uf: string; municipio: string }`;
  `type Usuario = { id: string; nome: string; email: string; papel: Papel; ativo: boolean }`;
  `type Feriado = { data: Data; descricao: string; abrangencia: Abrangencia; uf: string | null; municipio: string | null }`;
  `type Obrigacao = { id: string; nome: string; esfera: Esfera; periodicidade: Periodicidade; diaVencimento: number; meses: number[] | null; regraDiaNaoUtil: RegraDiaNaoUtil; diaUtilN: number | null; competenciaDefasagem: number }`

  Os tipos `Cliente`, `Processo`, `Andamento` e `Anexo` entram neste mesmo arquivo nas
  Tarefas 9 e 12, quando as colunas que cada tela consome ficarem fixadas. Todo tipo de
  domínio vive em `lib/tipos.ts`, em camelCase, mesmo que a coluna no banco seja
  snake_case — a conversão é responsabilidade do repositório.

- [ ] **Step 1: Criar o projeto**

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --use-npm
npm install @electric-sql/pglite
npm install -D vitest @playwright/test
```

- [ ] **Step 2: Configurar Vitest**

`vitest.config.ts` com ambiente `node` e `include: ['lib/**/*.test.ts']`. Adicionar `"test": "vitest run"` aos scripts.

- [ ] **Step 3: Ajustar `.gitignore`**

Acrescentar `arquivos/` e `pgdata/` às entradas existentes. Confirmar que `.env.local` já está lá.

- [ ] **Step 4: Aplicar a identidade visual no layout**

Em `app/layout.tsx`: idioma `pt-BR`, fonte IBM Plex Sans via `next/font/google` nos pesos 400/500/600/700, `<body>` com fundo `#F3F4F6` e cor de texto `#111827`. Metadata title "Agenda Fiscal".

- [ ] **Step 5: Escrever `lib/tipos.ts`**

Só os tipos listados no bloco Interfaces. Sem funções.

- [ ] **Step 6: Verificar**

Run: `npm run build && npm test`
Expected: build conclui; Vitest termina sem testes e sem erro de configuração.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Cria scaffold do Next com Tailwind, Vitest e tipos do dominio"
```

---

### Task 2: Aritmética de data

**Files:**
- Create: `lib/regras/data.ts`
- Test: `lib/regras/data.test.ts`

**Interfaces:**
- Consumes: `Data` de `lib/tipos.ts`.
- Produces: `diaDaSemana(d: Data): number` (0 = domingo); `somarDias(d: Data, n: number): Data`;
  `ultimoDiaDoMes(ano: number, mes: number): number` (mes 1–12);
  `montarData(ano: number, mes: number, dia: number): Data` — limita `dia` ao último dia do mês;
  `somarMeses(ano: number, mes: number, n: number): { ano: number; mes: number }`;
  `formatarBR(d: Data): string`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('diaDaSemana identifica domingo e sabado', () => {
  expect(diaDaSemana('2026-10-25')).toBe(0)
  expect(diaDaSemana('2026-10-24')).toBe(6)
})

test('somarDias atravessa mes e ano', () => {
  expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
  expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
})

test('ultimoDiaDoMes trata fevereiro comum e bissexto', () => {
  expect(ultimoDiaDoMes(2026, 2)).toBe(28)
  expect(ultimoDiaDoMes(2028, 2)).toBe(29)
  expect(ultimoDiaDoMes(2026, 4)).toBe(30)
})

// Review Focus 1
test('montarData limita o dia ao ultimo dia do mes', () => {
  expect(montarData(2026, 4, 31)).toBe('2026-04-30')
  expect(montarData(2026, 2, 29)).toBe('2026-02-28')
  expect(montarData(2026, 10, 20)).toBe('2026-10-20')
})

test('somarMeses vira o ano nos dois sentidos', () => {
  expect(somarMeses(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 })
  expect(somarMeses(2026, 1, -2)).toEqual({ ano: 2025, mes: 11 })
})

test('formatarBR usa dd/mm/aaaa', () => {
  expect(formatarBR('2026-10-20')).toBe('20/10/2026')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- data`
Expected: FAIL, funções não definidas.

- [ ] **Step 3: Implementar `lib/regras/data.ts`**

Toda aritmética via `Date.UTC`, nunca construtor local, para o resultado não depender do fuso da máquina. `formatarBR` é recorte de texto, não `Intl`: a data já é pura e não deve passar por conversão de fuso.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- data`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/regras/data.ts lib/regras/data.test.ts && git commit -m "Adiciona aritmetica de data pura sobre AAAA-MM-DD"
```

---

### Task 3: Feriados da praça e dia útil

**Files:**
- Create: `lib/regras/feriados-aplicaveis.ts`, `lib/regras/dia-util.ts`
- Test: `lib/regras/feriados-aplicaveis.test.ts`, `lib/regras/dia-util.test.ts`

**Interfaces:**
- Consumes: `lib/regras/data.ts`; `Data`, `Feriado`, `Praca` de `lib/tipos.ts`.
- Produces: `normalizar(texto: string): string` — minúsculas, sem acento, sem espaço nas pontas;
  `feriadosDaPraca(feriados: Feriado[], praca: Praca): Set<Data>`;
  `ehDiaUtil(d: Data, feriados: Set<Data>): boolean`;
  `diaUtilAnterior(d: Data, feriados: Set<Data>): Data`;
  `diaUtilSeguinte(d: Data, feriados: Set<Data>): Data`;
  `nEsimoDiaUtil(ano: number, mes: number, n: number, feriados: Set<Data>): Data`.

- [ ] **Step 1: Escrever os testes de recorte que falham**

```ts
const praca = { uf: 'AL', municipio: 'Maceió' }

test('nacional vale sempre; estadual so na UF; municipal so no municipio', () => {
  const r = feriadosDaPraca([
    { data: '2026-10-12', descricao: 'Aparecida', abrangencia: 'nacional', uf: null, municipio: null },
    { data: '2026-06-24', descricao: 'Sao Joao', abrangencia: 'estadual', uf: 'AL', municipio: null },
    { data: '2026-07-09', descricao: 'Revolucao', abrangencia: 'estadual', uf: 'SP', municipio: null },
    { data: '2026-12-08', descricao: 'Padroeira', abrangencia: 'municipal', uf: 'AL', municipio: 'Maceio' },
    { data: '2026-11-21', descricao: 'Outra cidade', abrangencia: 'municipal', uf: 'AL', municipio: 'Arapiraca' },
  ], praca)
  expect([...r].sort()).toEqual(['2026-06-24', '2026-10-12', '2026-12-08'])
})

test('normalizar casa acento e caixa', () => {
  expect(normalizar('Maceió')).toBe(normalizar('maceio'))
  expect(normalizar(' al ')).toBe('al')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- feriados-aplicaveis`
Expected: FAIL.

- [ ] **Step 3: Implementar `lib/regras/feriados-aplicaveis.ts`**

`normalizar` via `String.prototype.normalize('NFD')` com remoção dos diacríticos. Feriado `estadual` sem `uf`, ou `municipal` sem `municipio`, é ignorado — cadastro incompleto não desloca vencimento.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- feriados-aplicaveis`
Expected: PASS, 2 testes.

- [ ] **Step 5: Escrever os testes de dia útil que falham**

```ts
// 2026-10-24 sabado, 25 domingo, 26 segunda; 12/10 feriado (segunda)
const fer = new Set(['2026-10-12'])

test('ehDiaUtil recusa fim de semana e feriado', () => {
  expect(ehDiaUtil('2026-10-24', fer)).toBe(false)
  expect(ehDiaUtil('2026-10-12', fer)).toBe(false)
  expect(ehDiaUtil('2026-10-20', fer)).toBe(true)
})

test('diaUtilAnterior e diaUtilSeguinte pulam o fim de semana', () => {
  expect(diaUtilAnterior('2026-10-25', fer)).toBe('2026-10-23')
  expect(diaUtilSeguinte('2026-10-24', fer)).toBe('2026-10-26')
})

// Review Focus 3
test('o ajuste encadeia quando a vespera tambem nao e util', () => {
  const emenda = new Set(['2026-10-23', '2026-10-22'])
  expect(diaUtilAnterior('2026-10-24', emenda)).toBe('2026-10-21')
  expect(diaUtilSeguinte('2026-10-10', new Set(['2026-10-12', '2026-10-13']))).toBe('2026-10-14')
})

test('nEsimoDiaUtil conta a partir do dia 1 e pula feriado', () => {
  expect(nEsimoDiaUtil(2026, 10, 1, fer)).toBe('2026-10-01')
  expect(nEsimoDiaUtil(2026, 10, 10, fer)).toBe('2026-10-15')
})

// Review Focus 2
test('nEsimoDiaUtil alem do mes devolve o ultimo dia util', () => {
  expect(nEsimoDiaUtil(2026, 10, 25, fer)).toBe('2026-10-30')
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- dia-util`
Expected: FAIL.

- [ ] **Step 7: Implementar `lib/regras/dia-util.ts`**

`diaUtilAnterior` e `diaUtilSeguinte` recuam ou avançam em laço até achar dia útil. `nEsimoDiaUtil` percorre os dias do mês contando os úteis e devolve o último útil encontrado se `n` exceder a contagem.

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- dia-util`
Expected: PASS, 5 testes.

- [ ] **Step 9: Commit**

```bash
git add lib/regras/ && git commit -m "Adiciona recorte de feriados por praca e regras de dia util"
```

---

### Task 4: Cálculo de vencimentos

**Files:**
- Create: `lib/regras/vencimentos.ts`
- Test: `lib/regras/vencimentos.test.ts`

**Interfaces:**
- Consumes: `lib/regras/data.ts`, `lib/regras/dia-util.ts`; `Obrigacao`, `Data` de `lib/tipos.ts`.
- Produces: `type Vencimento = { obrigacaoId: string; nome: string; esfera: Esfera; data: Data; competencia: string }`
  com `competencia` em `'MM/AAAA'`;
  `vencimentosDaObrigacao(o: Obrigacao, de: { ano: number; mes: number }, ate: { ano: number; mes: number }, feriados: Set<Data>): Vencimento[]`
  — ordenado por data.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const base = { id: 'o1', nome: 'DAS', esfera: 'federal' as const, periodicidade: 'mensal' as const,
  diaVencimento: 20, meses: null, regraDiaNaoUtil: 'posterga' as const, diaUtilN: null, competenciaDefasagem: 1 }
const mes = { ano: 2026, mes: 10 }

test('mensal gera um vencimento no mes, com competencia defasada', () => {
  const r = vencimentosDaObrigacao(base, mes, mes, new Set())
  expect(r).toEqual([{ obrigacaoId: 'o1', nome: 'DAS', esfera: 'federal', data: '2026-10-20', competencia: '09/2026' }])
})

test('defasagem de dois meses recua a competencia', () => {
  const r = vencimentosDaObrigacao({ ...base, competenciaDefasagem: 2 }, mes, mes, new Set())
  expect(r[0].competencia).toBe('08/2026')
})

test('trimestral gera apenas nos meses listados', () => {
  const o = { ...base, periodicidade: 'trimestral' as const, meses: [1, 4, 7, 10] }
  const r = vencimentosDaObrigacao(o, { ano: 2026, mes: 8 }, { ano: 2027, mes: 1 }, new Set())
  expect(r.map(v => v.data)).toEqual(['2026-10-20', '2027-01-20'])
})

test('anual sem meses nao gera nada', () => {
  expect(vencimentosDaObrigacao({ ...base, periodicidade: 'anual', meses: null }, mes, mes, new Set())).toEqual([])
})

test('posterga empurra o sabado para a segunda', () => {
  const o = { ...base, diaVencimento: 24 }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set())[0].data).toBe('2026-10-26')
})

test('antecipa puxa o domingo para a sexta', () => {
  const o = { ...base, diaVencimento: 25, regraDiaNaoUtil: 'antecipa' as const }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set())[0].data).toBe('2026-10-23')
})

test('dia_util_n ignora diaVencimento', () => {
  const o = { ...base, diaVencimento: 1, regraDiaNaoUtil: 'dia_util_n' as const, diaUtilN: 10 }
  expect(vencimentosDaObrigacao(o, mes, mes, new Set(['2026-10-12']))[0].data).toBe('2026-10-15')
})

// Review Focus 1
test('dia 31 em mes de 30 dias cai no ultimo dia do mes', () => {
  const o = { ...base, diaVencimento: 31 }
  const r = vencimentosDaObrigacao(o, { ano: 2026, mes: 4 }, { ano: 2026, mes: 4 }, new Set())
  expect(r[0].data).toBe('2026-04-30')
})

test('intervalo de varios meses vem ordenado por data', () => {
  const r = vencimentosDaObrigacao(base, { ano: 2026, mes: 10 }, { ano: 2026, mes: 12 }, new Set())
  expect(r.map(v => v.data)).toEqual(['2026-10-20', '2026-11-20', '2026-12-21'])
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- vencimentos`
Expected: FAIL.

- [ ] **Step 3: Implementar `vencimentosDaObrigacao`**

Para cada mês do intervalo: pular se `periodicidade` não é `mensal` e `meses` não contém o mês (ou é nulo). Montar a data com `montarData` — é ela que resolve o dia além do mês. Aplicar a regra: `antecipa` → `diaUtilAnterior` se não for útil; `posterga` → `diaUtilSeguinte` se não for útil; `dia_util_n` → `nEsimoDiaUtil` com `diaUtilN`. Competência é o mês do vencimento menos `competenciaDefasagem`, via `somarMeses`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- vencimentos`
Expected: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/regras/vencimentos* && git commit -m "Adiciona calculo de vencimentos a partir das regras da obrigacao"
```

---

### Task 5: Banco, migrations e dados iniciais

**Files:**
- Create: `supabase/migrations/0001_estrutura.sql`, `supabase/migrations/0002_dados_iniciais.sql`, `supabase/migrations/9999_rls.sql`, `lib/db/conexao.ts`, `lib/db/migrar.ts`
- Test: `lib/db/migrar.test.ts`

**Interfaces:**
- Consumes: `@electric-sql/pglite`.
- Produces: `obterBanco(): Promise<PGlite>` — singleton guardado em `globalThis`, sobrevive ao hot reload, aplica as migrations na primeira chamada;
  `migrar(db: PGlite): Promise<void>` — idempotente, registra o que aplicou em `migrations_aplicadas`;
  `caminhoDoBanco(): string` — `pgdata/` por padrão, sobrescrito por `AGENDA_FISCAL_DB`.

- [ ] **Step 1: Escrever `0001_estrutura.sql`**

Criar as tabelas da seção 4.2 da spec, com os nomes e tipos de lá: `usuarios`, `clientes`, `obrigacoes`, `feriados`, `configuracao`, `processos`, `andamentos`, `anexos`, `historico`. Todas, menos `historico`, recebem o bloco de auditoria da seção 4.1:

```sql
criado_por     uuid not null references usuarios(id),
criado_em      timestamptz not null default now(),
atualizado_por uuid references usuarios(id),
atualizado_em  timestamptz,
excluido_por   uuid references usuarios(id),
excluido_em    timestamptz
```

Restrições a não esquecer: `check` em cada enum de texto; `usuarios.email` único; `configuracao` com `check (linha_unica)` garantindo uma só linha; `clientes.codigo_dominio` text; `clientes.particularidades` text; `feriados` com `check` exigindo `uf` quando `abrangencia = 'estadual'` e `uf` mais `municipio` quando `'municipal'`. Índices em `processos(status)`, `processos(cliente_id)`, `andamentos(processo_id)`, `historico(tabela, registro_id)`, `feriados(data)`.

- [ ] **Step 2: Escrever `0002_dados_iniciais.sql`**

Usuário admin inicial (nome "Administrador", e-mail do escritório, papel `admin`), com `criado_por` apontando para o próprio id — gere o uuid literal no arquivo para isso fechar. A linha de `configuracao` com UF `AL` e município `Maceió`. Os feriados nacionais de 2026 e 2027: 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12.

- [ ] **Step 3: Escrever `9999_rls.sql`**

`alter table ... enable row level security` e as policies de leitura e escrita para usuário autenticado, em todas as tabelas. Primeira linha do arquivo, em comentário: só é aplicado no Supabase; `migrar()` ignora arquivos com prefixo `9`.

- [ ] **Step 4: Escrever o teste que falha**

```ts
test('migrar cria as tabelas e os dados iniciais', async () => {
  const db = new PGlite()
  await migrar(db)
  const t = await db.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public'")
  const nomes = t.rows.map(r => r.table_name)
  for (const n of ['usuarios', 'clientes', 'obrigacoes', 'feriados', 'configuracao',
                   'processos', 'andamentos', 'anexos', 'historico'])
    expect(nomes).toContain(n)

  const admin = await db.query("select papel from usuarios where papel = 'admin'")
  expect(admin.rows).toHaveLength(1)
  const cfg = await db.query<{ uf: string }>('select uf from configuracao')
  expect(cfg.rows).toEqual([{ uf: 'AL' }])
  const fer = await db.query("select 1 from feriados where data = '2026-10-12'")
  expect(fer.rows).toHaveLength(1)
})

test('migrar duas vezes nao quebra nem duplica', async () => {
  const db = new PGlite()
  await migrar(db)
  await migrar(db)
  const r = await db.query('select count(*)::int as n from usuarios')
  expect(r.rows[0]).toEqual({ n: 1 })
})

test('rls nao e aplicado localmente', async () => {
  const db = new PGlite()
  await migrar(db)
  const r = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'clientes'")
  expect(r.rows[0].relrowsecurity).toBe(false)
})
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test -- migrar`
Expected: FAIL.

- [ ] **Step 6: Implementar `migrar.ts` e `conexao.ts`**

`migrar` lê os `.sql` de `supabase/migrations/` em ordem alfabética, ignora os que começam com `9`, aplica cada um numa transação e grava o nome em `migrations_aplicadas` (criada por ele mesmo antes de tudo). `conexao.ts` guarda a instância em `globalThis` e chama `migrar` uma única vez.

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test -- migrar`
Expected: PASS, 3 testes.

- [ ] **Step 8: Commit**

```bash
git add supabase/ lib/db/ && git commit -m "Adiciona migrations, dados iniciais e conexao PGlite"
```

---

### Task 6: Helper de escrita com autoria e histórico

**Files:**
- Create: `lib/db/escrita.ts`, `lib/db/historico.ts`
- Test: `lib/db/escrita.test.ts`

**Interfaces:**
- Consumes: `obterBanco`/`migrar` da Tarefa 5; `Usuario`, `Acao` de `lib/tipos.ts`.
- Produces: `type Contexto = { db: PGlite; usuario: Usuario }`;
  `criar<T>(ctx: Contexto, tabela: string, dados: Record<string, unknown>): Promise<T>`;
  `alterar<T>(ctx: Contexto, tabela: string, id: string, dados: Record<string, unknown>): Promise<T>`;
  `excluir(ctx: Contexto, tabela: string, id: string): Promise<void>`;
  `class SemPermissao extends Error`;
  e, em `historico.ts`, `historicoDe(db: PGlite, tabela: string, registroId: string): Promise<LinhaHistorico[]>`
  com `LinhaHistorico = { acao: Acao; usuarioNome: string; em: string; camposAlterados: Record<string, { antes: unknown; depois: unknown }> | null }`,
  mais recente primeiro.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// helper do teste: banco migrado + contexto com papel escolhido
test('criar grava auditoria e historico com o nome do usuario', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar(ctx, 'clientes', { nome: 'Padaria', codigo_dominio: '0042' })
  expect(c.criado_por).toBe(ctx.usuario.id)
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h).toHaveLength(1)
  expect(h[0].acao).toBe('criacao')
  expect(h[0].usuarioNome).toBe('Ana')
})

test('alterar registra apenas os campos que mudaram, com antes e depois', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar(ctx, 'clientes', { nome: 'Padaria', particularidades: 'NF pelo portal' })
  await alterar(ctx, 'clientes', c.id, { particularidades: 'NF pelo emissor proprio' })
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h[0].acao).toBe('alteracao')
  expect(h[0].camposAlterados).toEqual({
    particularidades: { antes: 'NF pelo portal', depois: 'NF pelo emissor proprio' } })
})

test('alterar sem mudanca efetiva nao gera linha de historico', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar(ctx, 'clientes', { nome: 'Padaria' })
  await alterar(ctx, 'clientes', c.id, { nome: 'Padaria' })
  expect(await historicoDe(ctx.db, 'clientes', c.id)).toHaveLength(1)
})

test('membro nao exclui', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const c = await criar(ctx, 'clientes', { nome: 'Padaria' })
  await expect(excluir(ctx, 'clientes', c.id)).rejects.toThrow(SemPermissao)
})

test('admin exclui logicamente e o registro sobrevive', async () => {
  const ctx = await ctxCom('admin', 'Chefe')
  const c = await criar(ctx, 'clientes', { nome: 'Padaria' })
  await excluir(ctx, 'clientes', c.id)
  const r = await ctx.db.query('select excluido_por, excluido_em from clientes where id = $1', [c.id])
  expect(r.rows).toHaveLength(1)
  expect(r.rows[0].excluido_por).toBe(ctx.usuario.id)
  const h = await historicoDe(ctx.db, 'clientes', c.id)
  expect(h[0].acao).toBe('exclusao')
  expect(h[0].camposAlterados).toBeNull()
})

test('membro nao mexe na equipe', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  await expect(criar(ctx, 'usuarios', { nome: 'Novo', email: 'n@e.com' })).rejects.toThrow(SemPermissao)
})

test('membro nao altera a configuracao do escritorio', async () => {
  const ctx = await ctxCom('membro', 'Ana')
  const cfg = await ctx.db.query<{ id: string }>('select id from configuracao')
  await expect(alterar(ctx, 'configuracao', cfg.rows[0].id, { uf: 'SP' })).rejects.toThrow(SemPermissao)
})

test('falha na gravacao do historico desfaz a escrita', async () => {
  // historico com coluna renomeada em runtime: a transacao inteira volta
  const ctx = await ctxCom('membro', 'Ana')
  await ctx.db.exec('alter table historico rename column acao to acao_x')
  await expect(criar(ctx, 'clientes', { nome: 'Padaria' })).rejects.toThrow()
  const r = await ctx.db.query('select count(*)::int as n from clientes')
  expect(r.rows[0]).toEqual({ n: 0 })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- escrita`
Expected: FAIL.

- [ ] **Step 3: Implementar `escrita.ts`**

As três funções abrem uma transação, checam o papel, gravam o registro com as colunas de auditoria e inserem em `historico` antes de confirmar. A checagem de papel é uma tabela de regras no topo do arquivo — `usuarios` e `configuracao` exigem `admin` em qualquer ação; `excluir` exige `admin` em qualquer tabela —, não um `if` espalhado por função. `alterar` lê o registro antes, compara campo a campo e só grava se houver diferença. Nomes de tabela e coluna entram na query por lista branca derivada do `information_schema`; valores sempre por parâmetro.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- escrita`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/db/escrita* lib/db/historico.ts && git commit -m "Adiciona helper unico de escrita com papel, auditoria e historico"
```

---

### Task 7: Identificação e header

**Files:**
- Create: `lib/usuario-atual.ts`, `app/identificar/page.tsx`, `app/identificar/acoes.ts`, `components/header.tsx`, `lib/db/usuarios.ts`
- Modify: `app/layout.tsx`
- Test: `lib/usuario-atual.test.ts`

**Interfaces:**
- Consumes: Tarefas 5 e 6.
- Produces: `usuarioAtual(): Promise<Usuario | null>` — lê o cookie `agenda_fiscal_usuario`, busca no banco e devolve `null` se não existir, estiver inativo ou excluído;
  `exigirUsuario(): Promise<Usuario>` — `redirect('/identificar')` quando `usuarioAtual()` é nulo;
  `escolherUsuario(id: string): Promise<void>` — Server Action, grava o cookie e redireciona para `/`;
  `sairDaIdentificacao(): Promise<void>`;
  em `lib/db/usuarios.ts`: `listarUsuarios(db, { apenasAtivos?: boolean }): Promise<Usuario[]>`, `buscarUsuario(db, id): Promise<Usuario | null>`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('usuario ativo no cookie e devolvido', async () => { /* cookie com id do admin → objeto com papel admin */ })

// Review Focus 4
test('usuario desativado depois de escolhido nao vale mais', async () => {
  // admin desativa Ana; usuarioAtual() com o cookie de Ana devolve null
})

test('usuario excluido logicamente nao vale mais', async () => { /* excluido_em preenchido → null */ })
test('cookie com id inexistente devolve null', async () => { /* uuid aleatorio → null */ })
test('sem cookie devolve null', async () => { /* → null */ })
```

Extraia a leitura do cookie para um parâmetro ou injeção simples, para o teste rodar sem servidor Next.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- usuario-atual`
Expected: FAIL.

- [ ] **Step 3: Implementar `lib/usuario-atual.ts` e `lib/db/usuarios.ts`**

A consulta exige `ativo = true and excluido_em is null` — a validação é uma condição SQL, não um filtro em memória.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- usuario-atual`
Expected: PASS, 5 testes.

- [ ] **Step 5: Construir a tela "Quem é você?"**

`app/identificar/page.tsx` lista a equipe ativa em cartões brancos com borda `#E5E7EB`, um por pessoa, com nome e papel; clicar chama `escolherUsuario`. Título "Quem é você?" e uma linha explicando que a escolha serve para registrar quem anotou cada informação. Sem campo de senha.

- [ ] **Step 6: Construir o header**

`components/header.tsx` reproduz o header dos mockups: ícone de calendário com check em `#0F766E`, "Agenda Fiscal", navegação com Calendário, Processos, Cadastros e Equipe (ativo com fundo `#E6F2F0` e texto `#0F5E57`), data de hoje em pt-BR, e à direita o nome do usuário com um botão "Trocar" que chama `sairDaIdentificacao`. Usado pelo `app/layout.tsx` em todas as rotas, exceto `/identificar`.

- [ ] **Step 7: Verificar no navegador**

Run: `npm run build && npm run dev` e, em outro terminal, um script Playwright que abre `/`, confirma o redirecionamento para `/identificar`, clica no admin, confirma que o header mostra o nome e que `/` responde 200.
Expected: passa; saída reduzida.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Adiciona identificacao por escolha na equipe e header com troca de usuario"
```

---

### Task 8: Tela Equipe

**Files:**
- Create: `app/equipe/page.tsx`, `app/equipe/acoes.ts`, `components/campos.tsx`
- Test: `app/equipe/acoes.test.ts`

**Interfaces:**
- Consumes: Tarefas 6 e 7.
- Produces: Server Actions `criarUsuario(form: FormData)`, `alterarUsuario(id: string, form: FormData)`, `desativarUsuario(id: string)`;
  em `components/campos.tsx`: `Campo`, `Selecao`, `AreaTexto`, `Botao` — componentes de formulário com o estilo dos mockups, reutilizados por todas as telas de cadastro.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('admin cadastra usuario e a acao fica no historico', async () => { /* criarUsuario → usuario existe, historico tem criacao */ })
test('membro recebe SemPermissao ao cadastrar usuario', async () => { /* → rejects */ })
test('email repetido devolve erro tratado, nao excecao de banco', async () => { /* mensagem em portugues */ })
test('desativar nao apaga a linha', async () => { /* ativo = false, linha presente */ })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- equipe`
Expected: FAIL.

- [ ] **Step 3: Implementar as Server Actions**

Cada uma chama `exigirUsuario`, monta o contexto e delega ao helper da Tarefa 6; `SemPermissao` e violação de unicidade voltam como mensagem em português para a tela, não como exceção crua.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- equipe`
Expected: PASS, 4 testes.

- [ ] **Step 5: Construir a tela**

Lista em cartão branco: nome, e-mail, papel e situação; selo de papel no estilo das tags dos mockups. Formulário de novo usuário e edição de papel visíveis só para `admin`; para `membro`, a lista é só leitura, sem botões.

- [ ] **Step 6: Verificar no navegador**

Run: script Playwright — identifica-se como admin, cadastra "Ana" como membro, confirma que aparece na lista; troca para Ana, confirma que os botões de edição desapareceram.
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Adiciona tela Equipe com papeis e campos de formulario compartilhados"
```

---

### Task 9: Cadastro de clientes

**Files:**
- Create: `app/cadastros/clientes/page.tsx`, `app/cadastros/clientes/[id]/page.tsx`, `app/cadastros/clientes/acoes.ts`, `lib/db/clientes.ts`, `components/historico.tsx`
- Test: `lib/db/clientes.test.ts`

**Interfaces:**
- Consumes: Tarefas 6, 7 e 8.
- Produces: `type Cliente = { id: string; nome: string; codigoDominio: string | null; cnpj: string | null; regime: Regime; uf: string; municipio: string; particularidades: string | null; ativo: boolean; atualizadoEm: string | null; atualizadoPorNome: string | null }` e `type Regime = 'simples' | 'presumido' | 'real' | 'mei'`, ambos em `lib/tipos.ts`;
  `listarClientes(db, busca?: string): Promise<Cliente[]>` — busca por nome, `codigo_dominio` ou CNPJ, texto normalizado, ignorando excluídos;
  `buscarCliente(db, id): Promise<Cliente | null>`;
  Server Actions `criarCliente(form)`, `alterarCliente(id, form)`, `excluirCliente(id)`;
  `components/historico.tsx`: `<Historico tabela={...} registroId={...} />`, Server Component que lê via `historicoDe`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('busca acha por nome, codigo do dominio e cnpj', async () => {
  // cliente nome 'Padaria Trigo de Ouro', codigo_dominio '0042', cnpj '12345678000199'
  expect(await listarClientes(db, 'trigo')).toHaveLength(1)
  expect(await listarClientes(db, '0042')).toHaveLength(1)
  expect(await listarClientes(db, '123456')).toHaveLength(1)
})

test('busca ignora acento e caixa', async () => { /* 'MACEIO' acha cliente de Maceió */ })
test('codigo do dominio preserva zero a esquerda', async () => { /* volta '0042', nao 42 */ })
test('cliente excluido sai da lista mas o historico continua legivel', async () => {
  /* excluirCliente → listarClientes vazio; historicoDe tem criacao e exclusao */
})
test('particularidades aceita varias linhas', async () => { /* texto com \n volta identico */ })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- clientes`
Expected: FAIL.

- [ ] **Step 3: Implementar `lib/db/clientes.ts` e as ações**

A busca compara contra texto normalizado no SQL (`unaccent` não existe no PGlite: use `lower()` mais `translate()` dos acentos, ou normalize o termo em JS e compare com a coluna normalizada pela mesma função SQL). CNPJ é comparado por dígitos, sem máscara.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- clientes`
Expected: PASS, 5 testes.

- [ ] **Step 5: Construir a lista e o detalhe**

Lista com campo de busca ("Nome, código do Domínio ou CNPJ") e botão "Novo cliente"; cada linha mostra nome, código do Domínio e CNPJ. Detalhe em cartão branco: dados em `dl` de duas colunas como no mockup de processos, **particularidades em destaque** num bloco próprio de texto corrido com as quebras de linha preservadas, e abaixo o `<Historico />`. Botão de exclusão só para `admin`.

- [ ] **Step 6: Verificar no navegador**

Run: script Playwright — cadastra cliente com particularidades em três linhas, confirma que o detalhe mostra as três linhas e que o histórico lista "criou"; altera as particularidades e confirma que o histórico passa a mostrar a alteração com o nome do usuário.
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Adiciona cadastro de clientes com particularidades, busca e historico"
```

---

### Task 10: Cadastro de obrigações

**Files:**
- Create: `app/cadastros/obrigacoes/page.tsx`, `app/cadastros/obrigacoes/acoes.ts`, `lib/db/obrigacoes.ts`
- Test: `lib/db/obrigacoes.test.ts`

**Interfaces:**
- Consumes: Tarefas 6, 7 e 8.
- Produces: `listarObrigacoes(db): Promise<Obrigacao[]>` — no formato que `vencimentosDaObrigacao` consome, com `meses` como `number[] | null`;
  Server Actions `criarObrigacao(form)`, `alterarObrigacao(id, form)`, `excluirObrigacao(id)`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('obrigacao volta no formato que o calculo consome', async () => {
  // criada trimestral com meses [1,4,7,10] → listarObrigacoes devolve meses: [1,4,7,10] e camelCase
})
test('trimestral sem meses e recusada com mensagem em portugues', async () => { /* → erro tratado */ })
test('dia_util_n sem o N e recusada com mensagem em portugues', async () => { /* → erro tratado */ })
test('dia de vencimento fora de 1..31 e recusado', async () => { /* → erro tratado */ })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- obrigacoes`
Expected: FAIL.

- [ ] **Step 3: Implementar**

As validações ficam numa função `validarObrigacao(dados): string | null` no mesmo arquivo das ações, chamada antes do helper de escrita — a mesma função serve ao formulário e ao teste.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- obrigacoes`
Expected: PASS, 4 testes.

- [ ] **Step 5: Construir a tela**

Lista agrupada por esfera, com a cor da esfera. Formulário com todos os campos da spec; os campos `meses` e `dia_util_n` só aparecem quando a periodicidade ou a regra os exige. Mostrar `regimes_aplicaveis`, `observacao` e `base_legal` no detalhe, com uma nota de que os regimes são informativos.

- [ ] **Step 6: Verificar no navegador**

Run: script Playwright — cadastra "EFD-Contribuições" mensal, dia 10, regra `dia_util_n` com N 10, defasagem 2; confirma que aparece na lista com a esfera Federal.
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Adiciona cadastro de obrigacoes com validacao das regras de vencimento"
```

---

### Task 11: Feriados e configuração do escritório

**Files:**
- Create: `app/cadastros/feriados/page.tsx`, `app/cadastros/feriados/acoes.ts`, `lib/db/feriados.ts`, `lib/db/configuracao.ts`
- Test: `lib/db/feriados.test.ts`

**Interfaces:**
- Consumes: Tarefas 3, 6 e 7.
- Produces: `listarFeriados(db, ano: number): Promise<Feriado[]>`;
  `obterConfiguracao(db): Promise<Praca & { id: string }>`;
  Server Actions `criarFeriado(form)`, `excluirFeriado(id)`, `alterarConfiguracao(form)`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('feriados nacionais de 2026 vem dos dados iniciais', async () => { /* 12/10/2026 presente */ })
test('estadual sem uf e recusado com mensagem em portugues', async () => { /* → erro tratado */ })
test('municipal sem municipio e recusado com mensagem em portugues', async () => { /* → erro tratado */ })
test('feriado de outra praca nao entra no conjunto do calculo', async () => {
  // cadastra municipal AL/Arapiraca; feriadosDaPraca com AL/Maceió nao o inclui
})
test('membro nao altera a configuracao', async () => { /* → SemPermissao */ })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- feriados`
Expected: FAIL.

- [ ] **Step 3: Implementar**

As validações de abrangência existem nos dois lugares: `check` no banco (Tarefa 5) e função de validação antes da escrita, para a mensagem chegar em português à tela.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- feriados`
Expected: PASS, 5 testes.

- [ ] **Step 5: Construir a tela**

Feriados do ano em lista, com seletor de ano e selo de abrangência; os campos UF e município aparecem conforme a abrangência escolhida. Na mesma tela, um cartão "Praça do escritório" com UF e município, editável só pelo admin, e uma linha explicando que só os feriados dessa praça deslocam vencimentos.

- [ ] **Step 6: Verificar no navegador**

Run: script Playwright — cadastra feriado municipal AL/Maceió em 08/12/2026 e confirma que aparece na lista do ano com o selo Municipal.
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Adiciona cadastro de feriados e praca do escritorio"
```

---

### Task 12: Processos, andamentos e anexos

**Files:**
- Create: `app/processos/page.tsx`, `app/processos/acoes.ts`, `lib/db/processos.ts`, `lib/arquivos.ts`, `components/processos/quadro.tsx`, `components/processos/detalhe.tsx`
- Test: `lib/db/processos.test.ts`, `lib/arquivos.test.ts`

**Interfaces:**
- Consumes: Tarefas 6, 7, 9.
- Produces: em `lib/tipos.ts`, `type Processo = { id: string; clienteId: string; clienteNome: string; tipo: string; orgao: string; protocolo: string | null; status: StatusProcesso; dataAbertura: Data; prazo: Data | null; prazoDescricao: string | null; atualizadoEm: string | null }`, `type Andamento = { id: string; data: Data; descricao: string; criadoPorNome: string }` e `type Anexo = { id: string; nomeArquivo: string; caminhoStorage: string; criadoPorNome: string }`;
  `listarProcessos(db, busca?: string): Promise<Processo[]>` — busca por nome do cliente, órgão ou protocolo;
  `buscarProcesso(db, id): Promise<(Processo & { andamentos: Andamento[]; anexos: Anexo[] }) | null>`;
  Server Actions `criarProcesso(form)`, `alterarProcesso(id, form)`, `mudarStatus(id, status)`, `adicionarAndamento(processoId, form)`, `enviarAnexo(processoId, form)`, `excluirProcesso(id)`;
  em `lib/arquivos.ts`: `nomeSeguro(original: string): string` e `salvarAnexo(original: string, conteudo: Buffer): Promise<string>` devolvendo o caminho relativo gravado.

- [ ] **Step 1: Escrever os testes de arquivo que falham**

```ts
// Review Focus 5
test('nomeSeguro nao deixa o caminho escapar da pasta', () => {
  for (const n of ['../../etc/passwd', 'a/b.pdf', 'C:\\x.pdf', '..', '.', ''])
    expect(nomeSeguro(n)).not.toMatch(/[\\/]|^\.\.?$/)
})

test('nomeSeguro preserva a extensao', () => {
  expect(nomeSeguro('auto-de-infracao.pdf')).toMatch(/\.pdf$/)
})

test('salvarAnexo grava dentro de arquivos/ e devolve caminho relativo', async () => {
  const p = await salvarAnexo('../../fuga.pdf', Buffer.from('x'))
  expect(path.resolve('arquivos', p).startsWith(path.resolve('arquivos'))).toBe(true)
})

test('dois anexos de mesmo nome nao se sobrescrevem', async () => {
  const a = await salvarAnexo('nota.pdf', Buffer.from('1'))
  const b = await salvarAnexo('nota.pdf', Buffer.from('2'))
  expect(a).not.toBe(b)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- arquivos`
Expected: FAIL.

- [ ] **Step 3: Implementar `lib/arquivos.ts`**

O nome gravado em disco é gerado — uuid mais a extensão validada contra lista branca. O nome que o usuário enviou vive só na coluna `nome_arquivo`, e é ele que a tela mostra. `nomeSeguro` nunca é concatenado com caminho vindo de fora.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- arquivos`
Expected: PASS, 4 testes.

- [ ] **Step 5: Escrever os testes de processo que falham**

```ts
test('busca acha por cliente, orgao e protocolo', async () => { /* tres buscas, um resultado cada */ })
test('mudar status registra alteracao no historico com o nome do usuario', async () => { /* antes/depois de status */ })
test('andamento aparece em ordem cronologica no detalhe', async () => { /* duas datas, ordem crescente */ })
test('processo sem prazo nao gera item de calendario', async () => { /* prazo nulo → ausente */ })
test('membro nao exclui processo', async () => { /* → SemPermissao */ })
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- processos`
Expected: FAIL.

- [ ] **Step 7: Implementar `lib/db/processos.ts` e as ações**

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- processos`
Expected: PASS, 5 testes.

- [ ] **Step 9: Construir a tela**

Reproduzir `referencia/mockup-processos.html`: quadro de quatro colunas em fundo `#E9EBEE` com contador em pill branco, cartões com órgão, tipo, cliente e chip de prazo — preto quando o prazo é dos próximos 7 dias, âmbar quando há prazo adiante, cinza quando não há. Detalhe lateral com selo de status, `dl` de dados, faixa âmbar de prazo com "Já aparece no calendário da equipe", linha do tempo de andamentos (último ponto preenchido no acento), "Adicionar andamento", anexos com ícone de arquivo, e o `<Historico />`. Busca e "Novo processo" no cabeçalho.

- [ ] **Step 10: Verificar no navegador**

Run: script Playwright — cria processo em exigência com prazo, adiciona andamento, envia um anexo com nome `../fuga.pdf`, confirma que o detalhe mostra o nome original e que o arquivo gravado está dentro de `arquivos/`.
Expected: passa.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Adiciona quadro de processos com andamentos, anexos e historico"
```

---

### Task 13: Calendário

**Files:**
- Create: `app/page.tsx`, `lib/calendario.ts`, `components/calendario/{controles,mes,semana,hoje,lateral}.tsx`
- Test: `lib/calendario.test.ts`

**Interfaces:**
- Consumes: Tarefas 4, 10, 11, 12.
- Produces: `type ItemCalendario = { data: Data; categoria: 'federal' | 'estadual' | 'municipal' | 'trabalhista' | 'processo' | 'feriado'; titulo: string; subtitulo: string; href?: string }`;
  `itensDoPeriodo(db, de: Data, ate: Data): Promise<ItemCalendario[]>` — junta vencimentos calculados, prazos de processos e feriados, ordenado por data.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('junta vencimento de obrigacao, prazo de processo e feriado', async () => {
  // uma obrigacao federal dia 20, um processo com prazo 22, feriado 12/10
  const r = await itensDoPeriodo(db, '2026-10-01', '2026-10-31')
  expect(r.map(i => [i.data, i.categoria])).toEqual([
    ['2026-10-12', 'feriado'], ['2026-10-20', 'federal'], ['2026-10-22', 'processo']])
})

test('subtitulo do vencimento traz a competencia', async () => { /* 'Competência 09/2026' */ })
test('obrigacao excluida logicamente nao gera item', async () => { /* ausente */ })
test('processo concluido com prazo passado nao aparece como prazo pendente', async () => { /* ausente */ })
test('feriado da praca aparece; de outra praca nao', async () => { /* municipal Arapiraca ausente */ })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- calendario`
Expected: FAIL.

- [ ] **Step 3: Implementar `lib/calendario.ts`**

Carrega obrigações, feriados e a praça uma vez, monta o conjunto com `feriadosDaPraca`, chama `vencimentosDaObrigacao` por obrigação para o intervalo pedido, acrescenta prazos de processos não concluídos e os feriados da praça. Prazo de processo leva `href` para o processo.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- calendario`
Expected: PASS, 5 testes.

- [ ] **Step 5: Construir a tela**

Reproduzir `referencia/mockup-calendario.html`: cabeçalho com título do período, resumo "N vencimentos hoje · N nos próximos 7 dias", setas de período e alternância Hoje/Semana/Mês num pill cinza; chips de filtro por esfera e "Prazos de processos", com feriados sempre visíveis. Visão Mês em grade de sete colunas, células de 112px, dias de outro mês esmaecidos e inertes, fim de semana em `#FAFAFA`, hoje com o número em círculo do acento, dia selecionado com borda de 2px. Visão Semana em sete colunas altas. Visão Hoje em linhas largas. Lateral com o dia selecionado e "Próximos 7 dias", mais a nota sobre prazos de processos.

Onde o mockup mostra "N clientes" e "Ver clientes", exibir a competência da obrigação — conforme a seção 8 da spec.

- [ ] **Step 6: Verificar no navegador**

Run: script Playwright em três larguras (1440, 820, 390): abre `/`, alterna as três visões, aplica o filtro Federal e confirma que o feriado continua visível; confirma que não há rolagem horizontal da página em 390px.
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Adiciona calendario com as tres visoes, filtros e lateral"
```

---

## Verificação final

- [ ] `npm test` — toda a suíte passa
- [ ] `npm run build` — sem erro de tipo
- [ ] Playwright: percurso completo numa sessão — identificar-se, cadastrar cliente com particularidades, cadastrar obrigação, ver o vencimento no calendário, abrir processo com andamento e anexo, conferir o histórico de cada registro
- [ ] `git log --oneline` — um commit por tarefa, em português
