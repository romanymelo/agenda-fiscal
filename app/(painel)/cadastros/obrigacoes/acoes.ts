'use server'

import { revalidatePath } from 'next/cache'
import { buscarObrigacao } from '@/lib/db/obrigacoes'
import { alterar, criar, excluir, exigirPermissao, SemPermissao } from '@/lib/db/escrita'
import {
  booleano,
  ErroDeFormulario,
  inteiroOuNulo,
  inteiros,
  lista,
  texto,
  textoOuNulo,
} from '@/lib/formulario'
import { ROTULO_ESFERA, ROTULO_PERIODICIDADE, ROTULO_REGIME, ROTULO_REGRA } from '@/lib/tipos'
import { contextoAtual } from '@/lib/usuario-atual'
import { validarObrigacao } from './validacao'

/** Padrão das Server Actions do projeto: devolver `{ ok?, erro? }` em vez de lançar para erro esperado. */
export type Resultado = { ok?: true; erro?: string }

// Traduz o que o helper e os conversores podem lançar. O que não for conhecido sobe:
// erro de programação não deve virar mensagem de formulário.
function traduzir(e: unknown): Resultado {
  if (e instanceof SemPermissao) return { erro: e.message }
  if (e instanceof ErroDeFormulario) return { erro: e.message }
  throw e
}

const escolha = (valor: string | undefined, validos: object) =>
  valor !== undefined && valor !== '' && Object.keys(validos).includes(valor)

// Lê o formulário. Campo obrigatório que veio vazio é erro; na alteração, campo que nem veio
// (`undefined`) é "não mexa". Opcionais usam `textoOuNulo`: vazio limpa a coluna.
function ler(form: FormData, criacao: boolean): { erro: string } | { dados: Record<string, unknown> } {
  try {
    const nome = texto(form, 'nome')
    const esfera = texto(form, 'esfera')
    const periodicidade = texto(form, 'periodicidade')
    const regra = texto(form, 'regra_dia_nao_util')
    const falta = (v: string | undefined) => (criacao ? !v : v === '')
    if (falta(nome)) return { erro: 'Informe o nome da obrigação.' }
    if (falta(esfera) || (esfera !== undefined && !escolha(esfera, ROTULO_ESFERA)))
      return { erro: 'Escolha a esfera.' }
    if (falta(periodicidade) || (periodicidade !== undefined && !escolha(periodicidade, ROTULO_PERIODICIDADE)))
      return { erro: 'Escolha a periodicidade.' }
    if (falta(regra) || (regra !== undefined && !escolha(regra, ROTULO_REGRA)))
      return { erro: 'Escolha o que acontece quando o dia cai em dia não útil.' }

    // Os campos dependem da periodicidade e da regra, e o banco exige `dia_util_n` na regra `dia_util_n` e
    // `dia_vencimento` nas outras. Por isso, ao receber a periodicidade ou a regra, o campo que deixou de
    // valer é limpo (`null`) na mesma gravação em que o outro é preenchido: trocar de regra numa obrigação
    // existente não deixa o valor antigo para trás, que o check do banco recusaria.
    const meses = periodicidade === undefined ? undefined : periodicidade === 'mensal' ? null : inteiros(form, 'meses')
    let diaVencimento: number | null | undefined
    let diaUtilN: number | null | undefined
    if (regra !== undefined) {
      const informado = (campo: string) => inteiroOuNulo(form, campo) ?? null
      diaUtilN = regra === 'dia_util_n' ? informado('dia_util_n') : null
      diaVencimento = regra === 'dia_util_n' ? null : informado('dia_vencimento')
    }
    const defasagem = inteiroOuNulo(form, 'competencia_defasagem')
    if (criacao ? defasagem == null : defasagem === null)
      return { erro: 'Informe a defasagem da competência (0 quando é o próprio mês do vencimento).' }
    const regimes = lista(form, 'regimes_aplicaveis')
    if (regimes.some((r) => !Object.keys(ROTULO_REGIME).includes(r))) return { erro: 'Regime tributário inválido.' }

    const erro = validarObrigacao({
      periodicidade,
      meses,
      regra_dia_nao_util: regra,
      dia_vencimento: diaVencimento,
      dia_util_n: diaUtilN,
      competencia_defasagem: defasagem,
    })
    if (erro) return { erro }

    // O navegador envia a quebra de linha como \r\n: grava-se sempre \n. `null` (limpar) passa direto.
    const bruta = textoOuNulo(form, 'observacao')
    return {
      dados: {
        nome,
        esfera,
        periodicidade,
        meses,
        regra_dia_nao_util: regra,
        dia_vencimento: diaVencimento,
        dia_util_n: diaUtilN,
        competencia_defasagem: defasagem,
        // Caixa de marcação sem nada marcado não envia campo: só um formulário completo (que traz a
        // periodicidade) pode limpar os regimes; uma alteração parcial deixa como está.
        regimes_aplicaveis: periodicidade === undefined ? undefined : regimes.length ? regimes : null,
        observacao: typeof bruta === 'string' ? bruta.replace(/\r\n?/g, '\n') : bruta,
        base_legal: textoOuNulo(form, 'base_legal'),
        ativo: booleano(form, 'ativo'),
      },
    }
  } catch (e) {
    if (e instanceof ErroDeFormulario) return { erro: e.message }
    throw e
  }
}

// Na exclusão só a lista é atualizada: a página da obrigação excluída não pode se refazer (viraria 404)
// antes de a tela sair dela.
function atualizarLista() {
  revalidatePath('/cadastros/obrigacoes')
}

export async function criarObrigacao(form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  const lido = ler(form, true)
  if ('erro' in lido) return lido
  try {
    await criar(ctx, 'obrigacoes', lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}

export async function alterarObrigacao(id: string, form: FormData): Promise<Resultado> {
  const ctx = await contextoAtual()
  // O helper não filtra `excluido_em`: quem recebe um id de fora confere antes de editar.
  if (!(await buscarObrigacao(ctx.db, id))) return { erro: 'Obrigação não encontrada.' }
  const lido = ler(form, false)
  if ('erro' in lido) return lido
  try {
    await alterar(ctx, 'obrigacoes', id, lido.dados)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  revalidatePath('/cadastros/obrigacoes/[id]', 'page')
  return { ok: true }
}

/** Exclusão lógica; só o administrador. O histórico da obrigação continua legível. */
export async function excluirObrigacao(id: string): Promise<Resultado> {
  const ctx = await contextoAtual()
  try {
    // A permissão vem antes de conferir o id: quem não pode não descobre nada.
    exigirPermissao(ctx.usuario, 'obrigacoes', 'exclusao')
    if (!(await buscarObrigacao(ctx.db, id))) return { erro: 'Obrigação não encontrada.' }
    await excluir(ctx, 'obrigacoes', id)
  } catch (e) {
    return traduzir(e)
  }
  atualizarLista()
  return { ok: true }
}
