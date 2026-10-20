# Agenda Fiscal — spec de construção local

Data: 20/10/2026
Status: aprovado em conversa, aguardando revisão escrita

## 1. Objetivo

Painel interno e compartilhado do escritório de contabilidade. Quem abre vê o que vence
hoje, na semana e no mês, acompanha os processos administrativos em andamento e consulta
as particularidades de cada cliente.

Não é gestão de tarefas: não controla quem fez ou deixou de fazer o quê. A autoria
registrada é rastro de quem registrou cada informação, não cobrança de responsável.

Também não é controle de obrigações por cliente: o escritório já tem um sistema que faz
isso. Aqui as obrigações entram pelas suas regras de vencimento, para aparecerem no
calendário, e os clientes entram como cadastro de consulta.

## 2. Escopo desta fase

Construir a aplicação inteira rodando na máquina do usuário, sem Supabase e sem GitHub.
O destino continua sendo Supabase + Vercel, então o banco local é Postgres de verdade e
as migrations escritas aqui são as que serão aplicadas no Supabase depois, sem reescrita.

Critério de sucesso: com `npm run dev`, é possível se identificar, cadastrar um cliente
com particularidades, cadastrar obrigação e feriado, abrir um processo com andamentos e
anexo, ver no calendário os vencimentos calculados junto com os prazos dos processos, e
abrir o histórico de qualquer registro para ler quem alterou o quê e quando.

### Fora de escopo

- Subir para Supabase, Vercel ou GitHub remoto.
- Login real com senha (ver seção 5).
- Supabase Storage: anexos ficam em pasta local.
- Vincular obrigações a clientes, e qualquer contagem de clientes por vencimento.
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

`particularidades` é um campo de digitação livre, de várias linhas, sem estrutura
imposta: é onde a equipe escreve como a nota fiscal daquele cliente é emitida, por qual
portal, com qual observação, e o que mais for próprio dele. É o motivo principal da tela
de clientes existir.

`obrigacoes`: id, nome, esfera (`federal`, `estadual`, `municipal`, `trabalhista`),
periodicidade (`mensal`, `trimestral`, `anual`), dia_vencimento int, meses int[] (para
trimestral e anual), regra_dia_nao_util (`antecipa`, `posterga`, `dia_util_n`),
dia_util_n int, competencia_defasagem int default 0, regimes_aplicaveis text[],
observacao, base_legal, ativo, + auditoria.

`regimes_aplicaveis` é informativo, exibido no cadastro e no detalhe do vencimento: como
as obrigações não são vinculadas a clientes, nada é filtrado por ele.

`feriados`: id, data, descricao, abrangencia (`nacional`, `estadual`, `municipal`), uf,
municipio, + auditoria. `abrangencia` define a quem o feriado se aplica, confrontado com
a praça do escritório (ver 7.1): `nacional` sempre vale; `estadual` exige `uf`;
`municipal` exige `uf` e `municipio`.

`processos`: id, cliente_id, tipo, orgao, protocolo, status (`em_andamento`,
`aguardando_orgao`, `em_exigencia`, `concluido`), data_abertura, prazo,
prazo_descricao, + auditoria.

`andamentos`: id, processo_id, data, descricao, + auditoria.

`anexos`: id, processo_id, nome_arquivo, caminho_storage, + auditoria. Nesta fase o
arquivo vai para a pasta `arquivos/` e `caminho_storage` guarda o caminho relativo, com o
mesmo formato que o Supabase Storage usará depois.

`historico`: id, tabela text, registro_id uuid, acao (`criacao`, `alteracao`,
`exclusao`), campos_alterados jsonb, usuario_id uuid, **usuario_nome text**,
em timestamptz default now().

`usuario_nome` é copiado no momento do fato: o histórico precisa continuar legível se o
usuário for renomeado ou desativado.

`campos_alterados` guarda, em `alteracao`, apenas os campos que mudaram, cada um com
`antes` e `depois`. Em `criacao` guarda os valores iniciais do registro; em `exclusao`
fica nulo, porque o registro permanece no banco e já é consultável.

### 4.3 Configuração do escritório

`configuracao`: tabela de uma única linha, com `uf` e `municipio` do escritório, +
auditoria. Define a praça usada no recorte de feriados (7.1). Editável pelo admin na tela
de Cadastros. A migration inicial a preenche com AL / Maceió.

Uma tabela de uma linha, e não variável de ambiente, porque é dado do escritório que o
admin precisa poder corrigir pela interface, e porque a alteração entra no histórico como
qualquer outra.

## 5. Quem está usando

Nesta fase não há senha. Na primeira visita a aplicação mostra uma tela "Quem é você?"
que lista a equipe ativa; a pessoa se escolhe e a escolha fica num cookie. O header
passa a exibir o nome escolhido, com a opção de trocar.

Um único módulo, `lib/usuario-atual.ts`, lê esse cookie e devolve o usuário — id, nome e
papel. Toda a aplicação pergunta a autoria e a permissão só a essa função. Quando o
Supabase Auth entrar, muda essa função e nada mais: as telas, o helper de escrita e as
permissões continuam iguais.

Consequência explícita: isto identifica, não autentica. Qualquer pessoa com acesso ao
painel pode se declarar qualquer membro da equipe. É aceitável porque o painel é interno
e porque a finalidade da autoria é saber quem registrou cada informação, não impedir
fraude. A autenticação de verdade chega com o Supabase Auth.

Sem usuário escolhido, a aplicação não permite escrita — não existe registro anônimo.

A primeira migration cria um usuário admin inicial, senão não haveria como cadastrar a
equipe nem exercer as permissões de admin. A checagem de papel vale desde já, contra o
usuário escolhido no cookie.

## 6. Autoria e histórico

Um único helper de escrita na camada de repositório — `registrar()` — executa, na mesma
transação: a checagem de papel, a gravação do registro (com as colunas de auditoria
preenchidas) e a gravação da linha de histórico com o nome do usuário.

Uma função, um lugar: nenhuma tela pode esquecer de registrar a autoria.

Alternativa descartada: triggers no Postgres com `SET LOCAL app.usuario_id`. Mais
blindado, bem mais complexo, e desnecessário enquanto toda escrita passa por Server
Actions.

Exclusão é lógica em todas as tabelas: apagar a linha destruiria o rastro. As consultas
das telas filtram `excluido_em is null`.

### Permissões

- `admin`: tudo, e exclusivamente ele cadastra usuários, altera papel, desativa
  usuários, edita a configuração do escritório e exclui qualquer registro.
- `membro`: cria e altera todo o resto; não exclui e não mexe na equipe.

## 7. Cálculo de vencimentos

Função pura em `lib/regras/vencimentos.ts`: recebe a obrigação, um intervalo de meses e a
lista de feriados que vale para o escritório, devolve as datas de vencimento. O
calendário nunca grava uma linha por mês.

- `competencia_defasagem` desloca a competência em N meses em relação ao vencimento.
- `mensal` gera todo mês; `trimestral` e `anual` apenas nos meses listados em `meses`.
- `dia_vencimento` com `regra_dia_nao_util`: `antecipa` puxa para o dia útil anterior,
  `posterga` empurra para o próximo, `dia_util_n` ignora `dia_vencimento` e usa o
  N-ésimo dia útil do mês.
- Prazo de processo entra no calendário com a cor "Processo", sem passar por este
  cálculo.

### 7.1 Feriados e a praça do escritório

Como as obrigações não pertencem a clientes, a praça do cálculo é a do escritório,
guardada na tabela `configuracao` (4.3). Entram no cálculo os feriados `nacional`, os
`estadual` da UF configurada e os `municipal` daquele município. Os demais ficam
cadastrados, visíveis na tela de feriados, sem afetar as datas.

Comparação de UF e município é feita sobre texto normalizado — minúsculas e sem acentos —
para que "Maceió" e "Maceio" cadastrados em momentos diferentes não deixem de casar.

A migration inicial cadastra os feriados nacionais. Estaduais e municipais a equipe
acrescenta à mão e passam a valer no cálculo a partir daí.

## 8. Telas

Reconstruídas como componentes React a partir de `referencia/mockup-calendario.html` e
`referencia/mockup-processos.html`: IBM Plex Sans, acento `#0F766E`, fundo `#F3F4F6`,
cartões brancos com borda `#E5E7EB`, cores por esfera e por status conforme os mockups.
Layout empilha em telas pequenas; quadros largos rolam na horizontal.

A navegação do header passa a ter quatro itens, e o header ganha à direita o nome do
usuário escolhido, com a opção de trocar. Antes disso existe a tela **Quem é você?**,
que lista a equipe ativa e não faz parte da navegação.

1. **Calendário** (inicial): Hoje / Semana / Mês, setas de período, filtros por esfera e
   "Prazos de processos", lateral com o dia selecionado e os próximos 7 dias. Feriados
   aparecem em qualquer filtro.
2. **Processos**: quadro em quatro colunas por status, busca por cliente, órgão ou
   protocolo, "Novo processo", e detalhe lateral com dados, prazo destacado, andamentos,
   anexos e o novo bloco de histórico.
3. **Cadastros**: clientes, obrigações, feriados e a configuração do escritório. O
   detalhe do cliente mostra as particularidades em destaque, mais o histórico.
4. **Equipe**: lista de usuários com papel e situação. Visível a todos, editável só pelo
   admin.

### Diferenças deliberadas em relação aos mockups

Os mockups mostram a contagem de clientes por vencimento — o badge "N clientes" e o link
"Ver clientes". Ambos saem: as obrigações não são vinculadas a clientes nesta
aplicação. O espaço do badge passa a mostrar a competência da obrigação, que é a
informação útil restante.

Os mockups também não cobrem Cadastros, Equipe nem "Quem é você?"; essas telas seguem a
mesma linguagem visual.

## 9. Verificação

Vitest para a lógica pura e para as regras que o usuário pediu:

- cálculo de vencimento por periodicidade e por `competencia_defasagem`;
- as três regras de dia não útil, contra fins de semana e feriados;
- recorte de feriados pela praça do escritório: nacional sempre entra, estadual só na UF
  configurada, municipal só no município configurado, com texto normalizado;
- toda escrita gera linha de histórico com o nome do usuário escolhido;
- sem usuário escolhido, a escrita é recusada;
- `membro` não exclui e não altera a equipe; só `admin` exclui.

As telas são verificadas com Playwright CLI ao fim de cada etapa, com saída reduzida.

## 10. Segurança

`.env.local` no `.gitignore`, junto com `arquivos/` e o arquivo do banco local. Quando o
Supabase entrar: apenas a `anon key` no front, `service_role` nunca no navegador, RLS
ativo em todas as tabelas e cadastro de usuários só por convite.
