'use client'

import { useId, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

// Componentes de formulário de todas as telas de cadastro. Nada aqui conhece uma tela:
// quem usa passa rótulo, nome do campo e, se houver, a mensagem de erro.

type Comuns = {
  /** Texto do rótulo, sempre presente: é ele que dá nome acessível ao controle. */
  rotulo: string
  /** Esconde o rótulo da vista, mas o mantém para leitores de tela (formulários compactos). */
  ocultarRotulo?: boolean
  /** Mensagem de erro do campo; deixa a borda vermelha e é lida junto com o controle. */
  erro?: string
  /** Dica curta abaixo do controle. */
  ajuda?: string
  /** Marca o rótulo com asterisco e liga `required` no controle. */
  obrigatorio?: boolean
}

const BASE =
  'min-h-[44px] w-full rounded-[10px] border bg-white px-3 text-base text-[#111827] sm:text-sm placeholder:text-[#9CA3AF] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0F766E] ' +
  'disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#6B7280]'

const bordaDe = (erro?: string) => (erro ? 'border-[#B91C1C]' : 'border-[#D1D5DB]')

// Rótulo + controle + ajuda + erro, com os ids ligados entre si.
function Envoltorio({
  rotulo,
  obrigatorio,
  ocultarRotulo,
  erro,
  ajuda,
  className,
  children,
}: Comuns & { className?: string; children: (a: ControleProps) => ReactNode }) {
  const id = useId()
  const idMsg = `${id}-msg`
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className={ocultarRotulo ? 'sr-only' : 'text-[13px] font-semibold text-[#1F2937]'}>
        {rotulo}
        {obrigatorio && (
          <span aria-hidden="true" className="text-[#B91C1C]">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': erro || ajuda ? idMsg : undefined,
      })}
      {erro ? (
        <p id={idMsg} role="alert" className="text-xs font-medium text-[#B91C1C]">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idMsg} className="text-xs text-[#4B5563]">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}

type ControleProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

type PropsCampo = Comuns &
  Omit<React.ComponentProps<'input'>, 'id' | 'name' | 'required' | 'aria-invalid' | 'aria-describedby'> & {
    nome: string
  }

/** Campo de uma linha (texto, e-mail, data, número…). `nome` vai para o `name` do formulário. */
export function Campo({ rotulo, obrigatorio, ocultarRotulo, erro, ajuda, nome, className, ...resto }: PropsCampo) {
  return (
    <Envoltorio {...{ rotulo, obrigatorio, ocultarRotulo, erro, ajuda, className }}>
      {(a) => <input {...resto} {...a} name={nome} required={obrigatorio} className={`${BASE} ${bordaDe(erro)}`} />}
    </Envoltorio>
  )
}

type PropsSelecao = Comuns &
  Omit<React.ComponentProps<'select'>, 'id' | 'name' | 'required' | 'aria-invalid' | 'aria-describedby' | 'children'> & {
    nome: string
    opcoes: { valor: string; rotulo: string }[]
    /** Primeira opção sem valor (ex.: "Escolha…"); sem esta prop, a lista não tem opção vazia. */
    vazio?: string
  }

/** Lista de escolha. `opcoes` traz valor (o que vai ao banco) e rótulo (o que a pessoa lê). */
export function Selecao({
  rotulo,
  obrigatorio,
  ocultarRotulo,
  erro,
  ajuda,
  nome,
  opcoes,
  vazio,
  className,
  ...resto
}: PropsSelecao) {
  return (
    <Envoltorio {...{ rotulo, obrigatorio, ocultarRotulo, erro, ajuda, className }}>
      {(a) => (
        <select {...resto} {...a} name={nome} required={obrigatorio} className={`${BASE} ${bordaDe(erro)}`}>
          {vazio !== undefined && <option value="">{vazio}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )}
    </Envoltorio>
  )
}

type PropsAreaTexto = Comuns &
  Omit<React.ComponentProps<'textarea'>, 'id' | 'name' | 'required' | 'aria-invalid' | 'aria-describedby'> & {
    nome: string
  }

/** Texto de várias linhas (observações, particularidades). Cresce na vertical pelo `rows`. */
export function AreaTexto({
  rotulo,
  obrigatorio,
  ocultarRotulo,
  erro,
  ajuda,
  nome,
  className,
  rows = 4,
  ...resto
}: PropsAreaTexto) {
  return (
    <Envoltorio {...{ rotulo, obrigatorio, ocultarRotulo, erro, ajuda, className }}>
      {(a) => (
        <textarea
          {...resto}
          {...a}
          name={nome}
          required={obrigatorio}
          rows={rows}
          className={`${BASE} min-h-[88px] resize-y py-2.5 ${bordaDe(erro)}`}
        />
      )}
    </Envoltorio>
  )
}

type PropsGrupo = Omit<Comuns, 'ocultarRotulo'> & {
  /** Mesmo `name` de todas as caixas: o FormData devolve os marcados com `getAll(nome)`. */
  nome: string
  opcoes: { valor: string; rotulo: string }[]
  /** Valores que começam marcados (não controlado, como `defaultValue`). */
  defaultValue?: string[]
  disabled?: boolean
  className?: string
}

/**
 * Várias caixas de marcação sob um mesmo rótulo (ex.: regimes aplicáveis, meses). Vira um
 * `<fieldset>` com `<legend>`; cada caixa é um alvo de toque de 44px e a grade empilha no celular.
 * `obrigatorio` só marca o rótulo: o HTML não sabe exigir "ao menos uma", então quem valida é a ação.
 */
export function GrupoMarcacoes({
  rotulo,
  obrigatorio,
  erro,
  ajuda,
  nome,
  opcoes,
  defaultValue = [],
  disabled,
  className,
}: PropsGrupo) {
  const idMsg = `${useId()}-msg`
  return (
    <fieldset
      disabled={disabled}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro || ajuda ? idMsg : undefined}
      className={`flex min-w-0 flex-col gap-1.5 ${className ?? ''}`}
    >
      <legend className="mb-1.5 text-[13px] font-semibold text-[#1F2937]">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden="true" className="text-[#B91C1C]">
            {' '}
            *
          </span>
        )}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[10px] border bg-white px-3 text-base text-[#111827] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[#0F766E] has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-[#F3F4F6] has-[:disabled]:text-[#6B7280] sm:text-sm ${bordaDe(erro)}`}
          >
            <input
              type="checkbox"
              name={nome}
              value={o.valor}
              defaultChecked={defaultValue.includes(o.valor)}
              className="size-4 shrink-0 accent-[#0F766E]"
            />
            {o.rotulo}
          </label>
        ))}
      </div>
      {erro ? (
        <p id={idMsg} role="alert" className="text-xs font-medium text-[#B91C1C]">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idMsg} className="text-xs text-[#4B5563]">
          {ajuda}
        </p>
      ) : null}
    </fieldset>
  )
}

const VARIANTES = {
  primario: 'border-transparent bg-[#0F766E] text-white hover:bg-[#0F5E57]',
  secundario: 'border-[#D1D5DB] bg-white text-[#1F2937] hover:bg-[#F3F4F6]',
  perigo: 'border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]',
} as const

type PropsBotao = React.ComponentProps<'button'> & {
  variante?: keyof typeof VARIANTES
}

/**
 * Botão de formulário. Dentro de um `<form action={…}>` ele se desabilita sozinho enquanto o
 * envio está em andamento; fora de formulário, só obedece a `disabled`.
 */
export function Botao({ variante = 'primario', type = 'button', disabled, className, ...resto }: PropsBotao) {
  const { pending } = useFormStatus()
  return (
    <button
      {...resto}
      type={type}
      disabled={disabled || pending}
      className={
        `inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-[18px] text-sm font-semibold ` +
        `transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ` +
        `disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className ?? ''}`
      }
    />
  )
}
