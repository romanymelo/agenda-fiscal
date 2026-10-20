# Agenda Fiscal — painel interno do escritório

Web app de uso interno da equipe de um escritório de contabilidade. Painel visual e compartilhado:
quem abre vê o que vence hoje, na semana e no mês, e acompanha os processos administrativos em andamento.

**Não é gestão de tarefas**: não controla quem fez ou deixou de fazer o quê. É um painel de consulta e registro.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: PostgreSQL, Auth (login por e-mail da equipe), Storage (anexos)
- Deploy na Vercel, código no GitHub
- Idioma da interface: português do Brasil. Datas no formato dd/mm/aaaa, fuso America/Maceio.

## Referência visual

A pasta `referencia/` tem os mockups aprovados (`mockup-calendario.html` e `mockup-processos.html`).
Eles foram feitos num formato de protótipo próprio (não rodam sozinhos): use como referência de layout,
cores, textos e comportamento, e reconstrua as telas como componentes React.

- Fonte IBM Plex Sans; cor principal #0F766E; fundo #F3F4F6; cartões brancos com borda #E5E7EB.
- Cores por esfera: Federal azul, Estadual laranja, Municipal roxo, Trabalhista verde, Processo grafite, Feriado cinza.
- Deve funcionar bem no celular (layout empilha em telas pequenas).

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
  dia_vencimento, meses (para trimestral/anual), regra_dia_nao_util (antecipa, posterga, dia_util_n),
  competencia_defasagem (ex.: EFD-Contribuições vence no mês seguinte ao seguinte), regimes_aplicaveis, observacao, base_legal
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
