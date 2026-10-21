import { connection } from 'next/server'
import { Suspense } from 'react'
import { Historico } from '@/components/historico'
import { listarEquipe } from '@/lib/db/usuarios'
import type { Papel } from '@/lib/tipos'
import { exigirUsuario } from '@/lib/usuario-atual'
import { AcoesDoUsuario, EditarDadosUsuario, HistoricoDoUsuario, NovoUsuario } from './formularios'
import { formatarUsuario, ROTULOS_USUARIO } from './rotulos'

export const metadata = { title: 'Equipe — Agenda Fiscal' }

const PAPEL: Record<Papel, { rotulo: string; estilo: string }> = {
  admin: { rotulo: 'Administrador', estilo: 'bg-[#E6F2F0] text-[#0F5E57]' },
  membro: { rotulo: 'Membro', estilo: 'bg-[#F3F4F6] text-[#374151]' },
}

export default function Equipe() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">Equipe</h1>
        <p className="text-sm text-[#4B5563]">Quem usa o painel e com qual papel</p>
      </div>
      {/* Lê o banco e o cookie: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-[#4B5563]">Carregando a equipe…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  )
}

async function Conteudo() {
  await connection()
  // O layout não é barreira de acesso: a página confere por conta própria.
  const voce = await exigirUsuario()
  const equipe = await listarEquipe()
  const admin = voce.papel === 'admin'
  return (
    <>
      {admin && <NovoUsuario />}
      <ul className="flex flex-col divide-y divide-[#E5E7EB] rounded-[14px] border border-[#E5E7EB] bg-white">
        {equipe.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-semibold">{u.nome}</span>
              <span className="truncate text-sm text-[#4B5563]">{u.email}</span>
              <span className="flex flex-wrap gap-2 pt-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAPEL[u.papel].estilo}`}>
                  {PAPEL[u.papel].rotulo}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.ativo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#E5E7EB] text-[#4B5563]'
                  }`}
                >
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {admin && (
                <>
                  <EditarDadosUsuario id={u.id} nome={u.nome} email={u.email} />
                  <AcoesDoUsuario
                    id={u.id}
                    nome={u.nome}
                    papel={u.papel}
                    ativo={u.ativo}
                    ehVoce={u.id === voce.id}
                  />
                </>
              )}
              <HistoricoDoUsuario
                historico={
                  <Historico tabela="usuarios" registroId={u.id} rotulos={ROTULOS_USUARIO} formatar={formatarUsuario} />
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
