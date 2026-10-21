-- Todo cliente do escritório tem regime, UF e município: o banco passa a exigir, em vez de a tela
-- tratar um estado que não existe. Migration nova (e não edição do 0001), que já está registrado nos
-- bancos existentes. Se algum banco tiver cliente sem esses dados, preencha-os antes de aplicar.
alter table clientes alter column regime set not null;
alter table clientes alter column uf set not null;
alter table clientes alter column municipio set not null;
