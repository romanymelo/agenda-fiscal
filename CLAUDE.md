# Agenda Fiscal — painel interno do escritório

Web app de uso interno da equipe de um escritório de contabilidade. Painel visual e compartilhado:
quem abre vê o que vence hoje, na semana e no mês, e acompanha os processos administrativos em andamento.

**Fase atual**: construção local, sem Supabase. O banco é o PGlite (Postgres em WASM) rodando no
próprio processo Node; no Windows os dados ficam em `%LOCALAPPDATA%\agenda-fiscal\pgdata`, fora do
projeto, porque o backup do Google Drive sobre `C:\Projetos` marca as pastas como somente leitura e o
PGlite (Emscripten) obedece esse atributo e falha ao abrir. Os anexos ficam em `arquivos/`. Supabase, Vercel e
GitHub remoto entram numa fase seguinte, sem reescrever as migrations SQL já versionadas.

**Não é gestão de tarefas**: não controla quem fez ou deixou de fazer o quê. É um painel de consulta e registro.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: PostgreSQL, Auth (login por e-mail da equipe), Storage (anexos)
- Deploy na Vercel, código no GitHub
- Idioma da interface: português do Brasil. Datas no formato dd/mm/aaaa, fuso America/Maceio.

## Referência visual

A pasta `referencia/` tem os mockups aprovados (`mockup-calendario.html` e `mockup-processos.html`).
Eles foram feitos num formato de protótipo próprio (não rodam sozinhos): use como referência de layout,
textos e comportamento. O visual foi redesenhado depois (identidade "Maré"), então onde o mockup e o
código divergirem em cor de fundo, navegação e títulos, vale o código.

- Cor principal #0F766E (mantida); fundo espuma #EAF1F0; tinta #0E2A31 (texto e trilho de navegação);
  cartões brancos com borda #D7E3E2; amarelo-sol #FFD23F só para "hoje" e urgência.
- Tipografia: IBM Plex Sans no corpo; Bricolage Grotesque (`font-display`) em títulos e números grandes.
- Cores só pelos tokens de `app/globals.css` (`bg-espuma`, `text-suave`, `bg-mar`...), nunca hex solto.
- Cores por esfera e por situação são fixas, em `lib/tipos.ts`: Federal azul, Estadual laranja, Municipal roxo,
  Trabalhista verde, Processo grafite, Feriado cinza.
- Navegação: trilho lateral escuro no computador; barra de abas fixa embaixo no celular.
- Ações raras (editar, excluir, histórico) ficam discretas e só abrem o painel quando pedidas.
- Deve funcionar bem no celular (layout empilha em telas pequenas; o quadro de processos vira carrossel).

## Telas

1. **Calendário** (tela inicial)
   - Alternância Hoje / Semana / Mês, setas de período anterior/próximo.
   - Filtros por esfera e "Prazos de processos".
   - Clicar num dia mostra o detalhe na lateral; lateral também lista "Próximos 7 dias".
   - Mostra vencimentos das obrigações e prazos dos processos juntos.
2. **Processos**
   - Quadro em colunas por status: Em andamento, Aguardando órgão, Em exigência, Concluído.
   - Busca por cliente, órgão ou protocolo; botão "Novo processo".
   - Detalhe: órgão, protocolo, abertura, última atualização, prazo destacado, linha do tempo de andamentos, anexos.
3. **Cadastros**: clientes, obrigações, feriados e configuração do escritório.
   - Cliente tem um campo `particularidades` de digitação livre (como a nota fiscal é emitida, portal, etc.).
4. **Equipe**: usuários do escritório, com papel. Só o admin edita.

## Modelo de dados (Supabase)

- `usuarios`: id, nome, email, papel (admin, membro), ativo
- `clientes`: id, nome, codigo_dominio (texto, pode ter zero à esquerda), cnpj,
  regime (simples, presumido, real, mei), uf, municipio, particularidades, ativo
- `obrigacoes`: id, nome, esfera (federal, estadual, municipal, trabalhista), periodicidade (mensal, trimestral, anual),
  dia_vencimento, meses (para trimestral/anual), regra_dia_nao_util (antecipa, posterga, dia_util_n), dia_util_n,
  competencia_defasagem (ex.: EFD-Contribuições vence no mês seguinte ao seguinte), regimes_aplicaveis, observacao,
  base_legal, ativo, + colunas de auditoria (criado_por, criado_em, atualizado_por, atualizado_em, excluido_por, excluido_em)
- `feriados`: data, descricao, abrangencia (nacional, estadual, municipal), uf, municipio
- `configuracao`: linha única com uf e municipio do escritório (define a praça do recorte de feriados)
- `historico`: tabela, registro_id, acao, campos_alterados, usuario_id, usuario_nome, em
- `processos`: id, cliente_id, tipo, orgao, protocolo, status, data_abertura, prazo, prazo_descricao, criado_por, atualizado_em
- `andamentos`: id, processo_id, data, descricao, criado_por
- `anexos`: id, processo_id, nome_arquivo, caminho_storage, enviado_por

Regras:
- O calendário calcula as datas de vencimento a partir das regras (não grava uma linha por mês), ajustando
  fins de semana e feriados conforme `regra_dia_nao_util`.
- Obrigações não são vinculadas a clientes: isso já é feito em outro sistema do escritório.
- Prazo de processo entra automaticamente no calendário com a cor "Processo".
- Toda escrita (criação, alteração, exclusão) grava o usuário e gera linha em `historico`. Exclusão é lógica.
- RLS ativo em todas as tabelas: só usuários autenticados do escritório leem e escrevem.
- Cadastro de usuários só por convite (sem cadastro aberto).
- Migrations SQL versionadas em `supabase/migrations/`.

## Segurança

- Chaves do Supabase em `.env.local` (nunca no Git). Apenas a `anon key` no front; a `service_role` nunca vai para o navegador.
- `.env.local` no `.gitignore`.

## Como trabalhar

- Construir em etapas pequenas e testáveis; mostrar o plano antes de cada etapa grande.
- Testes de navegador com Playwright CLI (não usar o MCP do Playwright).
- Mensagens e comentários em português.
