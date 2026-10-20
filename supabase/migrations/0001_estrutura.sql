-- Estrutura do banco da Agenda Fiscal (spec, seção 4).
-- Postgres idiomático: o mesmo arquivo roda no PGlite local e no Supabase.
-- Colunas de auditoria (4.1): criado_*, atualizado_*, excluido_*. Exclusão é sempre lógica.

-- Usuários da equipe. Nunca são apagados, só desativados (o nome sobrevive no histórico).
create table usuarios (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  email          text not null unique,
  papel          text not null default 'membro' check (papel in ('admin', 'membro')),
  ativo          boolean not null default true,
  criado_por     uuid not null references usuarios(id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references usuarios(id),
  atualizado_em  timestamptz,
  excluido_por   uuid references usuarios(id),
  excluido_em    timestamptz
);

-- Clientes do escritório.
create table clientes (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  codigo_dominio   text,  -- texto: o código pode ter zero à esquerda
  cnpj             text,
  regime           text check (regime in ('simples', 'presumido', 'real', 'mei')),
  uf               text,
  municipio        text,
  particularidades text,  -- texto livre de várias linhas
  ativo            boolean not null default true,
  criado_por       uuid not null references usuarios(id),
  criado_em        timestamptz not null default now(),
  atualizado_por   uuid references usuarios(id),
  atualizado_em    timestamptz,
  excluido_por     uuid references usuarios(id),
  excluido_em      timestamptz
);

-- Obrigações fiscais; o calendário calcula os vencimentos a partir destas regras.
create table obrigacoes (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  esfera                text not null check (esfera in ('federal', 'estadual', 'municipal', 'trabalhista')),
  periodicidade         text not null check (periodicidade in ('mensal', 'trimestral', 'anual')),
  dia_vencimento        int,
  meses                 int[],  -- para trimestral e anual
  regra_dia_nao_util    text not null check (regra_dia_nao_util in ('antecipa', 'posterga', 'dia_util_n')),
  dia_util_n            int,
  competencia_defasagem int not null default 0,
  regimes_aplicaveis    text[],  -- informativo, nada é filtrado por ele
  observacao            text,
  base_legal            text,
  ativo                 boolean not null default true,
  criado_por            uuid not null references usuarios(id),
  criado_em             timestamptz not null default now(),
  atualizado_por        uuid references usuarios(id),
  atualizado_em         timestamptz,
  excluido_por          uuid references usuarios(id),
  excluido_em           timestamptz,
  -- precisa de um dia que produza data: dia_util_n para essa regra, dia_vencimento nas demais
  check ((regra_dia_nao_util = 'dia_util_n' and dia_util_n is not null)
      or (regra_dia_nao_util <> 'dia_util_n' and dia_vencimento is not null))
);

-- Feriados; a abrangência é confrontada com a praça do escritório (tabela configuracao).
create table feriados (
  id             uuid primary key default gen_random_uuid(),
  data           date not null,
  descricao      text not null,
  abrangencia    text not null check (abrangencia in ('nacional', 'estadual', 'municipal')),
  uf             text,
  municipio      text,
  criado_por     uuid not null references usuarios(id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references usuarios(id),
  atualizado_em  timestamptz,
  excluido_por   uuid references usuarios(id),
  excluido_em    timestamptz,
  -- nacional: sem uf/municipio; estadual: exige uf; municipal: exige uf e municipio
  constraint feriados_abrangencia_ck check (
    (abrangencia = 'nacional'  and uf is null     and municipio is null) or
    (abrangencia = 'estadual'  and uf is not null and municipio is null) or
    (abrangencia = 'municipal' and uf is not null and municipio is not null)
  )
);

-- Praça do escritório. Tabela de uma única linha.
create table configuracao (
  id             uuid primary key default gen_random_uuid(),
  -- sentinela: a unicidade mais o check impedem fisicamente uma segunda linha
  linha_unica    boolean not null default true unique check (linha_unica),
  uf             text not null,
  municipio      text not null,
  criado_por     uuid not null references usuarios(id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references usuarios(id),
  atualizado_em  timestamptz,
  excluido_por   uuid references usuarios(id),
  excluido_em    timestamptz
);

-- Processos administrativos.
create table processos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes(id),
  tipo            text not null,
  orgao           text not null,
  protocolo       text,
  status          text not null default 'em_andamento'
                  check (status in ('em_andamento', 'aguardando_orgao', 'em_exigencia', 'concluido')),
  data_abertura   date not null,
  prazo           date,
  prazo_descricao text,
  criado_por      uuid not null references usuarios(id),
  criado_em       timestamptz not null default now(),
  atualizado_por  uuid references usuarios(id),
  atualizado_em   timestamptz,
  excluido_por    uuid references usuarios(id),
  excluido_em     timestamptz
);

-- Linha do tempo de andamentos de cada processo.
create table andamentos (
  id             uuid primary key default gen_random_uuid(),
  processo_id    uuid not null references processos(id),
  data           date not null,
  descricao      text not null,
  criado_por     uuid not null references usuarios(id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references usuarios(id),
  atualizado_em  timestamptz,
  excluido_por   uuid references usuarios(id),
  excluido_em    timestamptz
);

-- Anexos de processos; caminho_storage tem o mesmo formato do Supabase Storage.
create table anexos (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references processos(id),
  nome_arquivo    text not null,
  caminho_storage text not null,
  criado_por      uuid not null references usuarios(id),
  criado_em       timestamptz not null default now(),
  atualizado_por  uuid references usuarios(id),
  atualizado_em   timestamptz,
  excluido_por    uuid references usuarios(id),
  excluido_em     timestamptz
);

-- Histórico de alterações. Sem colunas de auditoria: já traz usuario_id, usuario_nome e em.
-- usuario_nome é copiado no momento do fato, para o histórico continuar legível.
create table historico (
  id               uuid primary key default gen_random_uuid(),
  tabela           text not null,
  registro_id      uuid not null,
  acao             text not null check (acao in ('criacao', 'alteracao', 'exclusao')),
  campos_alterados jsonb,
  usuario_id       uuid not null references usuarios(id),
  usuario_nome     text not null,
  em               timestamptz not null default now()
);

create index processos_status_idx on processos (status);
create index processos_cliente_id_idx on processos (cliente_id);
create index andamentos_processo_id_idx on andamentos (processo_id);
create index historico_tabela_registro_idx on historico (tabela, registro_id);
create index feriados_data_idx on feriados (data);
