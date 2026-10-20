# Agenda Fiscal — spec de construção local

Data: 20/10/2026
Status: aprovado em conversa, aguardando revisão escrita

## 1. Objetivo

Painel interno e compartilhado do escritório de contabilidade. Quem abre vê o que vence
hoje, na semana e no mês, e acompanha os processos administrativos em andamento.

Não é gestão de tarefas: não controla quem fez ou deixou de fazer o quê. A autoria
registrada é rastro de quem registrou cada informação, não cobrança de responsável.

## 2. Escopo desta fase

Construir a aplicação inteira rodando na máquina do usuário, sem Supabase e sem GitHub.
O destino continua sendo Supabase + Vercel, então o banco local é Postgres de verdade e
as migrations escritas aqui são as que serão aplicadas no Supabase depois, sem reescrita.

Critério de sucesso: com `npm run dev`, é possível cadastrar usuário, cliente com
particularidades, obrigação, feriado e processo; ver os vencimentos calculados no
calendário junto com os prazos dos processos; e abrir o histórico de qualquer registro e
ler quem alterou o quê e quando.

### Fora de escopo

- Subir para Supabase, Vercel ou GitHub remoto.
- Login real com senha (ver seção 5).
- Supabase Storage: anexos ficam em pasta local.
- Notificações, e-mails, relatórios, exportações.
- Qualquer controle de tarefa, responsável ou cobrança.

## 3. Decisões de arquitetura

### 3.1 Persistência: PGlite

`@electric-sql/pglite` é o Postgres compilado para WASM, rodando dentro do processo Node,
com o banco num arquivo local. Escolhido porque a máquina não tem Docker nem psql, e
porque o SQL é Postgres real: as migrations servem ao Supabase sem adaptação.

Alternativas descartadas: Postgres em Docker (exigiria instalar o Docker Desktop apenas
para programar); SQLite ou JSON (o SQL não serviria depois, e o trabalho de migrations
seria perdido).

Consequências a tratar na implementação:

- PGlite é embarcado e de conexão única: a instância vive num singleton de módulo, para
  sobreviver ao hot reload do Next em desenvolvimento.
- As policies de RLS ficam num arquivo de migration próprio, aplicado só quando o
  Supabase entrar. Localmente, todo acesso ao banco passa por código de servidor.

### 3.2 Camada de acesso

Todo SQL vive em `lib/db/`, um arquivo de repositório por entidade, com SQL puro. Nenhuma
tela ou componente emite SQL. Escrita acontece exclusivamente em Server Actions do Next;
o navegador nunca fala com o banco.

A migração futura para Supabase troca a conexão do PGlite pela string do Postgres do
Supabase, dentro de `lib/db/conexao.ts`. As telas não sabem qual banco está atrás.

### 3.3 Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Interface em português do Brasil, datas
em dd/mm/aaaa, fuso America/Maceio. Timestamps gravados como `timestamptz` e formatados
na exibição.

### 3.4 Estrutura de pastas

```
app/                 telas: calendario, processos, cadastros, equipe
components/          componentes de interface reconstruídos dos mockups
lib/db/              conexao.ts, migrations runner, um repositorio por entidade
lib/regras/          calculo de vencimentos, dia util, feriados
lib/usuario-atual.ts quem está usando (ver 5)
supabase/migrations/ SQL versionado
arquivos/            anexos locais (fora do git)
```

## 4. Modelo de dados

### 4.1 Colunas de auditoria

Todas as tabelas de domínio recebem:

```sql
criado_por     uuid not null references usuarios(id),
criado_em      timestamptz not null default now(),
atualizado_por uuid references usuarios(id),
atualizado_em  timestamptz,
excluido_por   uuid references usuarios(id),
excluido_em    timestamptz
```

Existem para a tela mostrar "última atualização por Fulano" sem consulta extra.

### 4.2 Tabelas

`usuarios`: id, nome, email (único), papel (`admin` ou `membro`, default `membro`),
ativo (default true), + auditoria. Usuário não é apagado, é desativado — o nome precisa
sobreviver no histórico.

`clientes`: id, nome, cnpj, regime (`simples`, `presumido`, `real`, `mei`), uf,
municipio, **particularidades text**, ativo, + auditoria.

`obrigacoes`: id, nome, esfera (`federal`, `estadual`, `municipal`, `trabalhista`),
periodicidade (`mensal`, `trimestral`, `anual`), dia_vencimento int, meses int[] (para
trimestral e anual), regra_dia_nao_util (`antecipa`, `posterga`, `dia_util_n`),
dia_util_n int, competencia_defasagem int default 0, regimes_aplicaveis text[],
observacao, base_legal, ativo, + auditoria.

`obrigacoes_clientes`: obrigacao_id, cliente_id, chave primária composta, criado_por,
criado_em. Única tabela com exclusão física: o vínculo é removido de fato e o histórico
guarda o registro. Manter vínculos desfeitos poluiria a contagem de clientes no
calendário.

`feriados`: id, data, descricao, abrangencia (`nacional`, `estadual`, `municipal`), uf,
municipio, + auditoria.

`processos`: id, cliente_id, tipo, orgao, protocolo, status (`em_andamento`,
`aguardando_orgao`, `em_exigencia`, `concluido`), data_abertura, prazo,
prazo_descricao, + auditoria.

`andamentos`: id, processo_id, data, descricao, + auditoria.

`anexos`: id, processo_id, nome_arquivo, caminho_storage, + auditoria. Nesta fase o
arquivo vai para a pasta `arquivos/` e `caminho_storage` guarda o caminho relativo, com o
mesmo formato que o Supabase Storage usará depois.

`historico`: id, tabela text, registro_id text, acao (`criacao`, `alteracao`,
`exclusao`), campos_alterados jsonb (antes e depois de cada campo mudado), usuario_id
uuid, **usuario_nome text**, em timestamptz default now().

`registro_id` é text para acomodar a chave composta de `obrigacoes_clientes`.
`usuario_nome` é copiado no momento do fato: o histórico precisa continuar legível se o
usuário for renomeado ou desativado.

## 5. Quem está usando

Nesta fase não há login. Um único módulo, `lib/usuario-atual.ts`, devolve o usuário fixo
cujo id vem de `.env.local`. Toda a aplicação pergunta a autoria só a essa função.

Consequência explícita: enquanto o login não existir, toda edição será atribuída a esse
mesmo usuário. O rastro é testável de ponta a ponta, mas não distingue pessoas. Quando o
Supabase Auth entrar, muda essa função e nada mais.

A checagem de papel é ligada desde já, contra esse usuário fixo, para a regra não nascer
morta.

## 6. Autoria e histórico

Um único helper de escrita na camada de repositório — `registrar()` — executa, na mesma
transação: a checagem de papel, a gravação do registro (com as colunas de auditoria
preenchidas) e a gravação da linha de histórico com o nome do usuário.

Uma função, um lugar: nenhuma tela pode esquecer de registrar a autoria.

Alternativa descartada: triggers no Postgres com `SET LOCAL app.usuario_id`. Mais
blindado, bem mais complexo, e desnecessário enquanto toda escrita passa por Server
Actions.

Exclusão é lógica em todas as tabelas de domínio: apagar a linha destruiria o rastro. As
consultas das telas filtram `excluido_em is null`.

### Permissões

- `admin`: tudo, e exclusivamente ele cadastra usuários, altera papel, desativa usuários
  e exclui qualquer registro.
- `membro`: cria e altera todo o resto; não exclui e não mexe na equipe.

## 7. Cálculo de vencimentos

Função pura em `lib/regras/vencimentos.ts`: recebe a obrigação, um intervalo de meses e a
lista de feriados, devolve as datas de vencimento. O calendário nunca grava uma linha por
mês.

- `competencia_defasagem` desloca a competência em N meses em relação ao vencimento.
- `mensal` gera todo mês; `trimestral` e `anual` apenas nos meses listados em `meses`.
- `dia_vencimento` com `regra_dia_nao_util`: `antecipa` puxa para o dia útil anterior,
  `posterga` empurra para o próximo, `dia_util_n` ignora `dia_vencimento` e usa o
  N-ésimo dia útil do mês.
- Prazo de processo entra no calendário com a cor "Processo", sem passar por este
  cálculo.

Suposição declarada: os feriados usados no cálculo são os nacionais, os estaduais de AL e
os municipais do município do escritório. Feriados municipais distintos por cliente
fariam a mesma obrigação vencer em datas diferentes para clientes diferentes; isso fica
fora desta fase.

## 8. Telas

Reconstruídas como componentes React a partir de `referencia/mockup-calendario.html` e
`referencia/mockup-processos.html`: IBM Plex Sans, acento `#0F766E`, fundo `#F3F4F6`,
cartões brancos com borda `#E5E7EB`, cores por esfera e por status conforme os mockups.
Layout empilha em telas pequenas; quadros largos rolam na horizontal.

A navegação do header passa a ter quatro itens.

1. **Calendário** (inicial): Hoje / Semana / Mês, setas de período, filtros por esfera e
   "Prazos de processos", lateral com o dia selecionado e os próximos 7 dias. Feriados
   aparecem em qualquer filtro.
2. **Processos**: quadro em quatro colunas por status, busca por cliente, órgão ou
   protocolo, "Novo processo", e detalhe lateral com dados, prazo destacado, andamentos,
   anexos e o novo bloco de histórico.
3. **Cadastros**: clientes (com o campo de particularidades), obrigações e feriados.
   Detalhe do cliente exibe particularidades e histórico.
4. **Equipe**: lista de usuários com papel e situação. Visível a todos, editável só pelo
   admin.

Os mockups não cobrem Cadastros nem Equipe; essas telas seguem a mesma linguagem visual.

## 9. Verificação

Vitest para a lógica pura e para as regras que o usuário pediu:

- cálculo de vencimento por periodicidade e por `competencia_defasagem`;
- as três regras de dia não útil, contra fins de semana e feriados;
- toda escrita gera linha de histórico com o nome do usuário;
- `membro` não exclui e não altera a equipe; só `admin` exclui.

As telas são verificadas com Playwright CLI ao fim de cada etapa, com saída reduzida.

## 10. Segurança

`.env.local` no `.gitignore`, junto com `arquivos/` e o arquivo do banco local. Quando o
Supabase entrar: apenas a `anon key` no front, `service_role` nunca no navegador, RLS
ativo em todas as tabelas e cadastro de usuários só por convite.
