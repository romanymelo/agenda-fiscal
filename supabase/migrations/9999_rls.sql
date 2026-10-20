-- Só é aplicado no Supabase; migrar() ignora arquivos com prefixo 9.
-- RLS: só usuário autenticado lê e escreve, em todas as tabelas.

alter table usuarios enable row level security;
create policy usuarios_leitura on usuarios for select to authenticated using (true);
create policy usuarios_escrita on usuarios for all to authenticated using (true) with check (true);

alter table clientes enable row level security;
create policy clientes_leitura on clientes for select to authenticated using (true);
create policy clientes_escrita on clientes for all to authenticated using (true) with check (true);

alter table obrigacoes enable row level security;
create policy obrigacoes_leitura on obrigacoes for select to authenticated using (true);
create policy obrigacoes_escrita on obrigacoes for all to authenticated using (true) with check (true);

alter table feriados enable row level security;
create policy feriados_leitura on feriados for select to authenticated using (true);
create policy feriados_escrita on feriados for all to authenticated using (true) with check (true);

alter table configuracao enable row level security;
create policy configuracao_leitura on configuracao for select to authenticated using (true);
create policy configuracao_escrita on configuracao for all to authenticated using (true) with check (true);

alter table processos enable row level security;
create policy processos_leitura on processos for select to authenticated using (true);
create policy processos_escrita on processos for all to authenticated using (true) with check (true);

alter table andamentos enable row level security;
create policy andamentos_leitura on andamentos for select to authenticated using (true);
create policy andamentos_escrita on andamentos for all to authenticated using (true) with check (true);

alter table anexos enable row level security;
create policy anexos_leitura on anexos for select to authenticated using (true);
create policy anexos_escrita on anexos for all to authenticated using (true) with check (true);

alter table historico enable row level security;
create policy historico_leitura on historico for select to authenticated using (true);
create policy historico_escrita on historico for all to authenticated using (true) with check (true);
