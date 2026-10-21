import { connection } from 'next/server'
import { Suspense } from 'react'
import { sairDaIdentificacao } from '@/app/identificar/acoes'
import { Header } from '@/components/header'
import { exigirUsuario } from '@/lib/usuario-atual'

/**
 * Grupo de rotas `(painel)`: tudo que vive sob o header. `/identificar` fica fora dele,
 * e é assim que a tela de identificação não ganha header — sem `if` de caminho.
 * O parêntese não entra na URL, então a página do grupo continua respondendo em `/`.
 */
export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  // A identificação é dado de requisição (cookie): precisa ficar atrás de um limite de
  // Suspense, senão a rota não pode ser pré-renderizada (cacheComponents está ligado).
  // O esqueleto tem a altura exata do header real (106px + borda empilhado, h-16 + borda em
  // linha única), para não deslocar a página quando o conteúdo chega.
  return (
    <Suspense
      fallback={<div className="h-[106px] border-b border-[#E5E7EB] bg-white lg:h-16" />}
    >
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
      <Header nome={usuario.nome} hoje={dataDeHoje()} trocar={sairDaIdentificacao} />
      {children}
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
