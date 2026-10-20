-- Dados iniciais: admin, praça do escritório e feriados nacionais fixos de 2026 e 2027.
-- Carnaval, Sexta-feira Santa e Corpus Christi são móveis: a equipe cadastra à mão.
-- Todas as linhas usam o id do admin como criado_por.

-- O admin aponta para si mesmo; a FK é verificada ao fim do comando, então fecha.
insert into usuarios (id, nome, email, papel, criado_por)
values ('7c1a3e52-4b8d-4f0a-9e26-5d3b8a1f6c01', 'Administrador', 'admin@escritorio.local', 'admin',
        '7c1a3e52-4b8d-4f0a-9e26-5d3b8a1f6c01');

insert into configuracao (uf, municipio, criado_por)
values ('AL', 'Maceió', '7c1a3e52-4b8d-4f0a-9e26-5d3b8a1f6c01');

insert into feriados (data, descricao, abrangencia, criado_por)
select (a.ano || '-' || f.dia)::date, f.descricao, 'nacional', '7c1a3e52-4b8d-4f0a-9e26-5d3b8a1f6c01'::uuid
from (values ('2026'), ('2027')) as a(ano)
cross join (values
  ('01-01', 'Confraternização Universal'),
  ('04-21', 'Tiradentes'),
  ('05-01', 'Dia do Trabalho'),
  ('09-07', 'Independência'),
  ('10-12', 'Nossa Senhora Aparecida'),
  ('11-02', 'Finados'),
  ('11-15', 'Proclamação da República'),
  ('11-20', 'Dia Nacional de Zumbi e da Consciência Negra'),
  ('12-25', 'Natal')
) as f(dia, descricao);
