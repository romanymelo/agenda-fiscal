'use client'

import { useActionState, useState, useTransition, type FormEvent } from 'react'
import { Botao, Campo, Condicional, Selecao } from '@/components/campos'
import { ROTULO_ABRANGENCIA, type FeriadoCadastro, type Praca } from '@/lib/tipos'
import { alterarConfiguracao, alterarFeriado, criarFeriado, excluirFeriado, type Resultado } from './acoes'

const OPCOES_ABRANGENCIA = Object.entries(ROTULO_ABRANGENCIA).map(([valor, rotulo]) => ({ valor, rotulo }))

/** Feriados móveis: mudam de data a cada ano, então a equipe os cadastra à mão. O atalho só poupa a digitação do nome. */
const MOVEIS = ['Carnaval', 'Sexta-feira Santa', 'Corpus Christi']

function Mensagens({ resultado, sucesso }: { resultado: Resultado | null; sucesso: string }) {
  return (
    <>
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
    </>
  )
}

/** Formulário de feriado, para cadastrar (sem `feriado`) ou editar (com `feriado`). */
function FormularioFeriado({
  feriado,
  praca,
  inicial,
  acao,
  envio,
  sucesso,
}: {
  feriado?: FeriadoCadastro
  praca: Praca
  /** Só no cadastro: o que o atalho de feriado móvel preencheu. */
  inicial?: { descricao: string; abrangencia: string }
  acao: (f: FormData) => Promise<Resultado>
  envio: string
  sucesso: string
}) {
  // A abrangência decide se UF e município aparecem; a descrição é controlada só para o cadastro poder
  // zerá-la depois de gravar (o `reset()` devolveria o nome do atalho).
  const [abrangencia, setAbrangencia] = useState<string>(feriado?.abrangencia ?? inicial?.abrangencia ?? '')
  const [descricao, setDescricao] = useState<string>(feriado?.descricao ?? inicial?.descricao ?? '')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, iniciar] = useTransition()
  // Envio à mão, e não por `<form action>`: o React 19 reinicia o formulário depois da ação e a lista de
  // abrangência voltava a "Escolha…". Só o cadastro bem-sucedido limpa.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const dados = new FormData(form)
    iniciar(async () => {
      const r = await acao(dados)
      setResultado(r)
      if (r.ok && !feriado) {
        form.reset()
        setAbrangencia('')
        setDescricao('')
      }
    })
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          obrigatorio
          defaultValue={feriado?.data ?? ''}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Descrição"
          nome="descricao"
          obrigatorio
          autoComplete="off"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="sm:col-span-4"
        />
        <Selecao
          rotulo="Abrangência"
          nome="abrangencia"
          obrigatorio
          vazio="Escolha…"
          opcoes={OPCOES_ABRANGENCIA}
          value={abrangencia}
          onChange={(e) => setAbrangencia(e.target.value)}
          ajuda="Nacional vale em todo o país; estadual, só na UF; municipal, só no município."
          className="sm:col-span-6"
        />
        <Condicional mostra={abrangencia === 'estadual' || abrangencia === 'municipal'} className="sm:col-span-2">
          <Campo
            rotulo="UF"
            nome="uf"
            obrigatorio
            autoComplete="off"
            maxLength={2}
            defaultValue={feriado?.uf ?? praca.uf}
            ajuda="Duas letras, como AL."
          />
        </Condicional>
        <Condicional mostra={abrangencia === 'municipal'} className="sm:col-span-4">
          <Campo
            rotulo="Município"
            nome="municipio"
            obrigatorio
            autoComplete="off"
            defaultValue={feriado?.municipio ?? praca.municipio}
          />
        </Condicional>
      </div>
      <Mensagens resultado={resultado} sucesso={sucesso} />
      <Botao type="submit" disabled={enviando} className="self-start">
        {envio}
      </Botao>
    </form>
  )
}

/** "Novo feriado": o botão e os atalhos dos móveis abrem o formulário de cadastro, no próprio lugar. */
export function NovoFeriado({ ano, praca }: { ano: number; praca: Praca }) {
  const [aberto, setAberto] = useState(false)
  // A chave refaz o formulário quando um atalho preenche os campos.
  const [modelo, setModelo] = useState<{ chave: number; descricao: string; abrangencia: string }>({
    chave: 0,
    descricao: '',
    abrangencia: '',
  })
  return (
    <div className="flex flex-col gap-3">
      <Botao
        variante={aberto ? 'secundario' : 'primario'}
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="self-start"
      >
        {aberto ? 'Fechar' : 'Novo feriado'}
      </Botao>
      <section
        aria-label={`Feriados móveis de ${ano}`}
        className="flex flex-col gap-2 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
      >
        <h2 className="text-base font-bold">Feriados móveis de {ano}</h2>
        <p className="text-sm text-[#4B5563]">
          Os feriados fixos já vêm cadastrados. Os móveis mudam de data todo ano: confira a data e cadastre à mão.
        </p>
        <div className="flex flex-wrap gap-2">
          {MOVEIS.map((nome) => (
            <Botao
              key={nome}
              variante="secundario"
              onClick={() => {
                setModelo((m) => ({ chave: m.chave + 1, descricao: nome, abrangencia: 'nacional' }))
                setAberto(true)
              }}
            >
              {nome}
            </Botao>
          ))}
        </div>
      </section>
      {aberto && (
        <section
          aria-label="Novo feriado"
          className="flex flex-col gap-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 sm:p-5"
        >
          <h2 className="text-base font-bold">Novo feriado</h2>
          <FormularioFeriado
            key={modelo.chave}
            praca={praca}
            inicial={modelo}
            acao={criarFeriado}
            envio="Cadastrar feriado"
            sucesso="Feriado cadastrado."
          />
        </section>
      )}
    </div>
  )
}

/** Editar e (só para o administrador) excluir um feriado da lista. Quem decide o `admin` é a página. */
export function AcoesFeriado({ feriado, praca, admin }: { feriado: FeriadoCadastro; praca: Praca; admin: boolean }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          {aberto ? 'Fechar edição' : 'Editar'}
        </Botao>
        {admin && <ExcluirFeriado feriado={feriado} />}
      </div>
      {aberto && (
        <section
          aria-label="Editar feriado"
          className="flex flex-col gap-4 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <FormularioFeriado
            feriado={feriado}
            praca={praca}
            acao={(f) => alterarFeriado(feriado.id, f)}
            envio="Salvar alterações"
            sucesso="Alterações salvas."
          />
        </section>
      )}
    </div>
  )
}

/** Exclusão (lógica). Só o administrador recebe este botão. */
function ExcluirFeriado({ feriado }: { feriado: FeriadoCadastro }) {
  const [erro, excluir] = useActionState(async (): Promise<string | null> => {
    const r = await excluirFeriado(feriado.id)
    return r.ok ? null : (r.erro ?? 'Não foi possível excluir.')
  }, null)
  return (
    <form
      action={excluir}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir o feriado ${feriado.descricao}? Ele deixa de valer no cálculo dos vencimentos.`))
          e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <Botao type="submit" variante="perigo">
        Excluir
      </Botao>
      {erro && (
        <p role="alert" className="text-sm font-medium text-[#B91C1C]">
          {erro}
        </p>
      )}
    </form>
  )
}

/** "Alterar praça": só o administrador recebe este botão. */
export function EditarPraca({ praca }: { praca: Praca }) {
  const [aberto, setAberto] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, iniciar] = useTransition()
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const dados = new FormData(e.currentTarget)
    iniciar(async () => setResultado(await alterarConfiguracao(dados)))
  }
  return (
    <div className="flex flex-col gap-3">
      <Botao variante="secundario" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="self-start">
        {aberto ? 'Fechar' : 'Alterar praça'}
      </Botao>
      {aberto && (
        <form onSubmit={enviar} aria-label="Alterar praça do escritório" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <Campo
              rotulo="UF"
              nome="uf"
              obrigatorio
              autoComplete="off"
              maxLength={2}
              defaultValue={praca.uf}
              className="sm:col-span-2"
            />
            <Campo
              rotulo="Município"
              nome="municipio"
              obrigatorio
              autoComplete="off"
              defaultValue={praca.municipio}
              className="sm:col-span-4"
            />
          </div>
          <Mensagens resultado={resultado} sucesso="Praça atualizada." />
          <Botao type="submit" disabled={enviando} className="self-start">
            Salvar praça
          </Botao>
        </form>
      )}
    </div>
  )
}
