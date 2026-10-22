import type { PGlite } from '@electric-sql/pglite'
import { montarData, somarDias } from '../regras/data'
import type { Data, Usuario } from '../tipos'
import { alterar, criar, type Contexto } from './escrita'

// Dados de demonstração, todos inventados (clientes, CNPJs e protocolos fictícios), para quem abre o projeto
// ver o painel funcionando sem cadastrar nada. Só entra com `npm run demo` (AGENDA_FISCAL_DEMO=1) e só num
// banco ainda sem clientes. As datas são relativas a hoje, então o calendário e o quadro sempre parecem vivos.
// Tudo passa pelo mesmo helper de escrita do app, então autoria e histórico saem como em uso real.

const hojeEmMaceio = (): Data => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date())

export async function carregarDadosDemo(db: PGlite): Promise<void> {
  const existentes = await db.query<{ n: number }>('select count(*)::int as n from clientes')
  if (existentes.rows[0].n > 0) return

  const hoje = hojeEmMaceio()
  const dia = (n: number): Data => somarDias(hoje, n)

  const admin = (await db.query<Usuario>("select id, nome, email, papel, ativo from usuarios where papel = 'admin' order by criado_em limit 1")).rows[0]
  const comoAdmin: Contexto = { db, usuario: admin }

  const novoUsuario = (nome: string, email: string, papel: 'admin' | 'membro') =>
    criar<Usuario>(comoAdmin, 'usuarios', { nome, email, papel })
  const camila = await novoUsuario('Camila Bezerra', 'camila@exemplo.com.br', 'membro')
  const rafael = await novoUsuario('Rafael Tenório', 'rafael@exemplo.com.br', 'admin')
  const julia = await novoUsuario('Júlia Lessa', 'julia@exemplo.com.br', 'membro')
  const como = (u: Usuario): Contexto => ({ db, usuario: u })

  // ---- Obrigações (as regras que o calendário usa para calcular os vencimentos)
  const obrigacoes = [
    { nome: 'DAS – Simples Nacional', esfera: 'federal', periodicidade: 'mensal', dia_vencimento: 20, regra_dia_nao_util: 'posterga', competencia_defasagem: 1, regimes_aplicaveis: ['simples', 'mei'], base_legal: 'Resolução CGSN nº 140/2018' },
    { nome: 'DCTFWeb', esfera: 'federal', periodicidade: 'mensal', dia_vencimento: 15, regra_dia_nao_util: 'antecipa', competencia_defasagem: 1, regimes_aplicaveis: ['presumido', 'real'] },
    { nome: 'EFD-Contribuições', esfera: 'federal', periodicidade: 'mensal', regra_dia_nao_util: 'dia_util_n', dia_util_n: 10, competencia_defasagem: 2, regimes_aplicaveis: ['presumido', 'real'], observacao: 'Vence no 10º dia útil do segundo mês seguinte à competência.' },
    { nome: 'FGTS Digital', esfera: 'trabalhista', periodicidade: 'mensal', dia_vencimento: 20, regra_dia_nao_util: 'antecipa', competencia_defasagem: 1, regimes_aplicaveis: ['simples', 'presumido', 'real'] },
    { nome: 'ICMS', esfera: 'estadual', periodicidade: 'mensal', dia_vencimento: 10, regra_dia_nao_util: 'posterga', competencia_defasagem: 1, regimes_aplicaveis: ['presumido', 'real'] },
    { nome: 'SPED Fiscal', esfera: 'estadual', periodicidade: 'mensal', dia_vencimento: 20, regra_dia_nao_util: 'posterga', competencia_defasagem: 1, regimes_aplicaveis: ['presumido', 'real'] },
    { nome: 'ISS', esfera: 'municipal', periodicidade: 'mensal', dia_vencimento: 10, regra_dia_nao_util: 'posterga', competencia_defasagem: 1, regimes_aplicaveis: ['simples', 'presumido', 'real'] },
    { nome: 'ECF – Escrituração Contábil Fiscal', esfera: 'federal', periodicidade: 'anual', meses: [7], dia_vencimento: 31, regra_dia_nao_util: 'antecipa', competencia_defasagem: 0, regimes_aplicaveis: ['presumido', 'real'] },
  ]
  for (const o of obrigacoes) await criar(comoAdmin, 'obrigacoes', o)

  // ---- Clientes (nomes e números inventados)
  const clientes: Record<string, string> = {}
  const novoCliente = async (chave: string, c: Record<string, unknown>, por: Usuario = admin) => {
    clientes[chave] = (await criar<{ id: string }>(como(por), 'clientes', { uf: 'AL', municipio: 'Maceió', ...c })).id
  }
  await novoCliente('padaria', { nome: 'Padaria Pão Quente Ltda', codigo_dominio: '0012', cnpj: '12.345.678/0001-00', regime: 'simples', particularidades: 'NFS-e emitida pelo portal da prefeitura até o dia 5.\nCertificado digital A1 vence em março.' }, camila)
  await novoCliente('clinica', { nome: 'Clínica Vida Plena', codigo_dominio: '0027', cnpj: '23.456.789/0001-00', regime: 'presumido', particularidades: 'Retenção de ISS pelos tomadores.\nEnviar a guia ao cliente por e-mail.' }, camila)
  await novoCliente('mercadinho', { nome: 'Mercadinho Sol Nascente', codigo_dominio: '0035', cnpj: '34.567.890/0001-00', regime: 'simples', municipio: 'Arapiraca', particularidades: 'Emite NF-e (modelo 55) e NFC-e. Em caso de queda do sistema, emitir em contingência.' }, julia)
  await novoCliente('autopecas', { nome: 'Auto Peças Beira Mar', codigo_dominio: '0041', cnpj: '45.678.901/0001-00', regime: 'real' }, julia)
  await novoCliente('distribuidora', { nome: 'Distribuidora Litoral Norte', codigo_dominio: '0048', cnpj: '56.789.012/0001-00', regime: 'presumido' }, rafael)
  await novoCliente('studio', { nome: 'Studio Bella Pele', codigo_dominio: '0053', regime: 'mei', municipio: 'Rio Largo', particularidades: 'Declaração anual do MEI feita todo mês de maio.' }, camila)
  await novoCliente('oficina', { nome: 'Oficina Rio Branco', codigo_dominio: '0060', cnpj: '67.890.123/0001-00', regime: 'simples' }, julia)
  await novoCliente('acougue', { nome: 'Açougue São João', codigo_dominio: '0066', cnpj: '78.901.234/0001-00', regime: 'simples', municipio: 'Marechal Deodoro' }, camila)
  await novoCliente('construtora', { nome: 'Construtora Ponta Verde', codigo_dominio: '0071', cnpj: '89.012.345/0001-00', regime: 'real', particularidades: 'Obras com ISS retido na fonte.\nControle de CNO por obra.' }, rafael)
  await novoCliente('papelaria', { nome: 'Papelaria Central', codigo_dominio: '0009', regime: 'simples', ativo: false }, rafael)

  // ---- Processos, com andamentos
  type Andamento = [Data, string]
  const processos: {
    cliente: string
    tipo: string
    orgao: string
    protocolo?: string
    status: string
    abertura: number
    prazo?: number
    prazoDescricao?: string
    por: Usuario
    andamentos?: Andamento[]
  }[] = [
    { cliente: 'padaria', tipo: 'Pedido de parcelamento de débitos', orgao: 'Receita Federal', protocolo: '10010.123456/2026-11', status: 'em_andamento', abertura: -20, prazo: 3, prazoDescricao: 'Responder à intimação', por: camila, andamentos: [[dia(-19), 'Pedido protocolado no e-CAC.'], [dia(-6), 'Recebida intimação para juntar comprovantes de pagamento das últimas parcelas.']] },
    { cliente: 'clinica', tipo: 'Inscrição municipal', orgao: 'Prefeitura de Maceió', protocolo: 'SEMEC-2026/48812', status: 'aguardando_orgao', abertura: -35, prazo: 14, prazoDescricao: 'Retorno da vistoria', por: camila, andamentos: [[dia(-34), 'Documentos entregues no balcão.'], [dia(-10), 'Vistoria agendada pelo órgão.']] },
    { cliente: 'mercadinho', tipo: 'Impugnação de auto de infração', orgao: 'SEFAZ-AL', protocolo: '12456/2026', status: 'em_exigencia', abertura: -50, prazo: -2, prazoDescricao: 'Apresentar os documentos solicitados', por: julia, andamentos: [[dia(-49), 'Impugnação apresentada dentro do prazo legal.'], [dia(-15), 'Órgão pediu cópia das notas fiscais de entrada.']] },
    { cliente: 'autopecas', tipo: 'Restituição de ICMS', orgao: 'SEFAZ-AL', protocolo: '2026.0453.0087', status: 'em_andamento', abertura: -12, prazo: 25, prazoDescricao: 'Prazo para recurso', por: julia, andamentos: [[dia(-11), 'Pedido de restituição protocolado com planilha de apuração.']] },
    { cliente: 'distribuidora', tipo: 'Alteração contratual', orgao: 'Junta Comercial (JUCEAL)', protocolo: 'AL2026-00912', status: 'aguardando_orgao', abertura: -8, por: rafael },
    { cliente: 'studio', tipo: 'Desenquadramento do MEI', orgao: 'Receita Federal', status: 'concluido', abertura: -60, por: camila, andamentos: [[dia(-58), 'Comunicação de desenquadramento enviada pelo Portal do Simples.'], [dia(-40), 'Confirmado o desenquadramento a partir do mês seguinte.']] },
    { cliente: 'oficina', tipo: 'Licença de funcionamento', orgao: 'Corpo de Bombeiros', protocolo: 'CBM-AL 7731/2026', status: 'em_andamento', abertura: -5, prazo: 6, prazoDescricao: 'Vistoria agendada', por: julia, andamentos: [[dia(-4), 'Projeto de prevenção protocolado.']] },
    { cliente: 'construtora', tipo: 'Certidão negativa de débitos municipais', orgao: 'Prefeitura de Maceió', protocolo: 'CND-2026-5520', status: 'concluido', abertura: -22, por: rafael, andamentos: [[dia(-21), 'Pedido feito pelo portal.'], [dia(-9), 'Certidão emitida e enviada ao cliente.']] },
    { cliente: 'acougue', tipo: 'Regularização de alvará sanitário', orgao: 'Vigilância Sanitária', protocolo: 'VISA-33018', status: 'em_exigencia', abertura: -18, prazo: 9, prazoDescricao: 'Entregar o laudo técnico', por: camila, andamentos: [[dia(-17), 'Requerimento protocolado.'], [dia(-3), 'Exigência: laudo técnico das câmaras frias.']] },
  ]
  for (const p of processos) {
    const ctx = como(p.por)
    const criado = await criar<{ id: string }>(ctx, 'processos', {
      cliente_id: clientes[p.cliente],
      tipo: p.tipo,
      orgao: p.orgao,
      protocolo: p.protocolo ?? null,
      status: p.status === 'concluido' ? 'em_andamento' : p.status,
      data_abertura: dia(p.abertura),
      prazo: p.prazo === undefined ? null : dia(p.prazo),
      prazo_descricao: p.prazoDescricao ?? null,
    })
    for (const [data, descricao] of p.andamentos ?? []) await criar(ctx, 'andamentos', { processo_id: criado.id, data, descricao })
    // Concluir pelo `alterar` deixa a conclusão no histórico, de onde vem a data de "Concluído em".
    if (p.status === 'concluido') await alterar(ctx, 'processos', criado.id, { status: 'concluido' })
  }

  // Um feriado municipal da praça do escritório, para a tela de Feriados ter o que mostrar além dos automáticos.
  await criar(comoAdmin, 'feriados', {
    data: montarData(Number(hoje.slice(0, 4)), 8, 27),
    descricao: 'Nossa Senhora dos Prazeres',
    abrangencia: 'municipal',
    uf: 'AL',
    municipio: 'Maceió',
  })
}
