import type { FormatarValor, Rotulos } from '@/components/historico'
import { ROTULO_STATUS, type StatusProcesso } from '@/lib/tipos'

// O que o <Historico> precisa saber de um processo: como chamar cada campo e como escrever os valores que o
// banco guarda por código. Mora aqui, na tela de processos, e não no componente.

export const ROTULOS_PROCESSO: Rotulos = {
  cliente_id: 'Cliente',
  tipo: 'Tipo',
  orgao: 'Órgão',
  protocolo: 'Protocolo',
  status: 'Situação',
  data_abertura: 'Aberto em',
  prazo: 'Prazo',
  prazo_descricao: 'Descrição do prazo',
}

/**
 * `formatar` do histórico de um processo. O `<Historico>` chama `formatar` uma vez por valor, em paralelo,
 * sem lote nem cache: por isso ele é SÍNCRONO e só lê de um `Map` (id do cliente para nome) que a página
 * carregou uma única vez. Nunca consulte o banco aqui dentro.
 */
export function formatarProcesso(nomesDeClientes: ReadonlyMap<string, string>): FormatarValor {
  return (campo, valor) => {
    if (campo === 'cliente_id' && typeof valor === 'string')
      // Cliente que não está no mapa foi excluído depois da alteração.
      return nomesDeClientes.get(valor) ?? 'Cliente excluído'
    if (campo === 'status' && typeof valor === 'string') return ROTULO_STATUS[valor as StatusProcesso]
    return undefined
  }
}
