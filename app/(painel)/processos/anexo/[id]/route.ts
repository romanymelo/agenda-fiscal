import { respostaDoAnexoDaTela } from '@/lib/anexos'
import { exigirUsuario } from '@/lib/usuario-atual'

/**
 * Download de um anexo. Recebe o id do anexo, nunca um caminho (ver `lib/anexos.ts`). O layout não é barreira de
 * acesso e rota não tem layout: quem confere o usuário é a própria rota (sem identificação, vai a /identificar).
 */
export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigirUsuario()
  const { id } = await params
  return respostaDoAnexoDaTela(id)
}
