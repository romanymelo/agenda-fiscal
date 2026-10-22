import { connection } from 'next/server'
import { Suspense } from 'react'
import { sairDaIdentificacao } from '@/app/identificar/acoes'
import { Navegacao } from '@/components/navegacao'
import { exigirUsuario } from '@/lib/usuario-atual'

/**
 * Grupo de rotas `(painel)`: tudo que vive sob a navegação (trilho no desktop, abas no celular).
 * `/identificar` fica fora dele, e é assim que a tela de identificação não ganha navegação —
 * sem `if` de caminho.
 * O parêntese não entra na URL, então a página do grupo continua respondendo em `/`.
 */
export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  // A identificação é dado de requisição (cookie): precisa ficar atrás de um limite de
  // Suspense, senão a rota não pode ser pré-renderizada (cacheComponents está ligado).
  // O esqueleto reserva o trilho lateral (desktop), para a página não se deslocar quando ele chega.
  return (
    <Suspense fallback={<div aria-hidden="true" className="fixed inset-y-0 left-0 hidden w-60 bg-trilho lg:block" />}>
      <Painel>{children}</Painel>
    </Suspense>
  )
}

async function Painel({ children }: { children: React.ReactNode }) {
  // Nada aqui pode ser pré-renderizado: a identificação vem do cookie, o banco é local e a
  // data é a de hoje. `connection()` diz que isto só roda com a requisição em mãos.
  await connection()
  const usuario = await exigirUsuario()
  return (
    <>
      <Navegacao nome={usuario.nome} hoje={dataDeHoje()} trocar={sairDaIdentificacao} />
      {/* O trilho é fixo (lg+): o conteúdo sobra à direita dele. No celular, sobra espaço para a barra de abas. */}
      <div className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 print:p-0">{children}</div>
    </>
  )
}

// "Terça-feira, 20 de outubro de 2026", no fuso do escritório.
function dataDeHoje(): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeZone: 'America/Maceio',
  }).format(new Date())
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
