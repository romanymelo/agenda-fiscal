'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState, useTransition, type FormEvent } from 'react'
import { AreaTexto, Botao, Campo, Condicional, GrupoMarcacoes, Selecao } from '@/components/campos'
import {
  ROTULO_ESFERA,
  ROTULO_PERIODICIDADE,
  ROTULO_REGIME,
  ROTULO_REGRA,
  type ObrigacaoCadastro,
} from '@/lib/tipos'
import { excluirObrigacao, type Resultado } from './acoes'
import { MESES } from './rotulos'

const opcoesDe = (rotulos: Record<string, string>) =>
  Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }))
const OPCOES_ESFERA = opcoesDe(ROTULO_ESFERA)
const OPCOES_PERIODICIDADE = opcoesDe(ROTULO_PERIODICIDADE)
const OPCOES_REGRA = opcoesDe(ROTULO_REGRA)
const OPCOES_REGIME = opcoesDe(ROTULO_REGIME)
const OPCOES_MES = MESES.map(([longo], i) => ({ valor: String(i + 1), rotulo: longo }))
const OPCOES_SITUACAO = [
  { valor: 'true', rotulo: 'Ativo' },
  { valor: 'false', rotulo: 'Inativo' },
]

/** Formulário de obrigação, para cadastrar (sem `obrigacao`) ou editar (com `obrigacao`). */
function FormularioObrigacao({
  obrigacao,
  acao,
  envio,
  sucesso,
}: {
  obrigacao?: ObrigacaoCadastro
  acao: (f: FormData) => Promise<Resultado>
  envio: string
  sucesso: string
}) {
  // A escolha de periodicidade e de regra decide quais campos aparecem.
  const [periodicidade, setPeriodicidade] = useState<string>(obrigacao?.periodicidade ?? '')
  const [regra, setRegra] = useState<string>(obrigacao?.regraDiaNaoUtil ?? '')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, iniciar] = useTransition()
  // O envio é feito à mão, e não por `<form action>`: depois de toda ação o React 19 reinicia o formulário,
  // e uma lista de escolha (esfera, periodicidade, regra) voltava a "Escolha…" mesmo depois de um erro.
  // Sem o reinício, o que a pessoa marcou e digitou fica como está; só o cadastro bem-sucedido limpa.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const dados = new FormData(form)
    iniciar(async () => {
      const r = await acao(dados)
      setResultado(r)
      if (r.ok && !obrigacao) {
        form.reset()
        setPeriodicidade('')
        setRegra('')
      }
    })
  }
  const um = (padrao: string | number | null | undefined) => (padrao == null ? '' : String(padrao))

  const usaMeses = periodicidade === 'trimestral' || periodicidade === 'anual'
  const usaN = regra === 'dia_util_n'
  const usaDia = regra === 'antecipa' || regra === 'posterga'
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Campo
          rotulo="Nome"
          nome="nome"
          obrigatorio
          autoComplete="off"
          defaultValue={um(obrigacao?.nome)}
          className="sm:col-span-6"
        />
        <Selecao
          rotulo="Esfera"
          nome="esfera"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_ESFERA}
          defaultValue={um(obrigacao?.esfera)}
          className="sm:col-span-3"
        />
        <Selecao
          rotulo="Periodicidade"
          nome="periodicidade"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_PERIODICIDADE}
          value={periodicidade}
          onChange={(e) => setPeriodicidade(e.target.value)}
          className="sm:col-span-3"
        />
        <Condicional mostra={usaMeses} className="sm:col-span-6">
          <GrupoMarcacoes
            rotulo="Meses de vencimento"
            nome="meses"
            obrigatorio
            opcoes={OPCOES_MES}
            defaultValue={(obrigacao?.meses ?? []).map(String)}
            ajuda="Os meses em que a obrigação vence. Trimestral costuma ser jan, abr, jul e out."
          />
        </Condicional>
        <Selecao
          rotulo="Regra de vencimento"
          nome="regra_dia_nao_util"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_REGRA}
          value={regra}
          onChange={(e) => setRegra(e.target.value)}
          className="sm:col-span-6"
        />
        <Condicional mostra={usaDia} className="sm:col-span-2">
          <Campo
            rotulo="Dia do vencimento"
            nome="dia_vencimento"
            type="number"
            inputMode="numeric"
            obrigatorio
            autoComplete="off"
            ajuda="De 1 a 31. Em mês mais curto vale o último dia."
            defaultValue={um(obrigacao?.diaVencimento)}
          />
        </Condicional>
        <Condicional mostra={usaN} className="sm:col-span-2">
          <Campo
            rotulo="Número do dia útil"
            nome="dia_util_n"
            type="number"
            inputMode="numeric"
            obrigatorio
            autoComplete="off"
            ajuda="10 quer dizer o 10º dia útil do mês."
            defaultValue={um(obrigacao?.diaUtilN)}
          />
        </Condicional>
        <Campo
          rotulo="Defasagem da competência (meses)"
          nome="competencia_defasagem"
          type="number"
          inputMode="numeric"
          obrigatorio
          autoComplete="off"
          ajuda="0 se a competência é o mês do vencimento; 1 se é o mês anterior; 2 se é o mês anterior ao anterior."
          defaultValue={um(obrigacao?.competenciaDefasagem ?? 0)}
          className="sm:col-span-4"
        />
        <GrupoMarcacoes
          rotulo="Regimes aplicáveis"
          nome="regimes_aplicaveis"
          opcoes={OPCOES_REGIME}
          defaultValue={obrigacao?.regimesAplicaveis ?? []}
          ajuda="Só informativo: serve de consulta e não filtra nada no calendário."
          className="sm:col-span-6"
        />
        <Campo
          rotulo="Base legal"
          nome="base_legal"
          autoComplete="off"
          defaultValue={um(obrigacao?.baseLegal)}
          className="sm:col-span-6"
        />
        <AreaTexto
          rotulo="Observação"
          nome="observacao"
          rows={4}
          defaultValue={um(obrigacao?.observacao)}
          className="sm:col-span-6"
        />
        <Selecao
          rotulo="Situação"
          nome="ativo"
          opcoes={OPCOES_SITUACAO}
          ajuda="Inativa é a obrigação que deixou de existir: some da lista e do calendário, mas o cadastro e o histórico ficam."
          defaultValue={um(obrigacao && !obrigacao.ativo ? 'false' : 'true')}
          className="sm:col-span-6"
        />
      </div>
      {resultado?.erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {resultado.erro}
        </p>
      )}
      {resultado?.ok && (
        <p role="status" className="text-sm font-medium text-[#166534]">
          {sucesso}
        </p>
      )}
      <Botao type="submit" disabled={enviando} className="self-start">
        {envio}
      </Botao>
    </form>
  )
}

/** "Nova obrigação": o botão abre o formulário de cadastro, no próprio lugar. */
export function NovaObrigacao({ criar }: { criar: (f: FormData) => Promise<Resultado> }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Botao
        variante={aberto ? 'secundario' : 'primario'}
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="self-start"
      >
        {aberto ? 'Fechar' : 'Nova obrigação'}
      </Botao>
      {aberto && (
        <section
          aria-label="Nova obrigação"
          className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
        >
          <h2 className="text-base font-bold">Nova obrigação</h2>
          <FormularioObrigacao acao={criar} envio="Cadastrar obrigação" sucesso="Obrigação cadastrada." />
        </section>
      )}
    </div>
  )
}

/** "Editar": o botão abre o formulário com os dados atuais. */
export function EditarObrigacao({
  obrigacao,
  alterar,
}: {
  obrigacao: ObrigacaoCadastro
  alterar: (id: string, f: FormData) => Promise<Resultado>
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar edição' : 'Editar'}
      </Botao>
      {aberto && (
        <section
          aria-label="Editar obrigação"
          className="flex flex-col gap-4 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <FormularioObrigacao
            obrigacao={obrigacao}
            acao={(f) => alterar(obrigacao.id, f)}
            envio="Salvar alterações"
            sucesso="Alterações salvas."
          />
        </section>
      )}
    </div>
  )
}

/** Exclusão (lógica). Só o administrador recebe este botão; quem decide é a página. */
export function ExcluirObrigacao({ id, nome }: { id: string; nome: string }) {
  const router = useRouter()
  const [erro, excluir] = useActionState(async (): Promise<string | null> => {
    const r = await excluirObrigacao(id)
    if (r.ok) {
      router.replace('/cadastros/obrigacoes')
      return null
    }
    return r.erro ?? 'Não foi possível excluir.'
  }, null)
  return (
    <form
      action={excluir}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir a obrigação ${nome}? Ela sai da lista e do calendário; o histórico fica guardado.`))
          e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <Botao type="submit" variante="perigo" className="self-start">
        Excluir obrigação
      </Botao>
      {erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
    </form>
  )
}
