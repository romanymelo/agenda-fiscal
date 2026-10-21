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
  admin: { rotulo: 'Administrador', estilo: 'bg-mar-claro text-mar-escuro' },
  membro: { rotulo: 'Membro', estilo: 'bg-espuma text-corpo' },
}

// "Camila Bezerra" vira "CB": primeira e última palavra do nome.
function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export default function Equipe() {
  return (
    <main className="mr-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 lg:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-suave">Quem usa o painel e com qual papel</p>
      </div>
      {/* Lê o banco e o cookie: só com a requisição em mãos, atrás de um limite de Suspense. */}
      <Suspense fallback={<p className="text-sm text-suave">Carregando a equipe…</p>}>
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
      <ul className="flex flex-col divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-papel">
        {equipe.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 p-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${
                    u.ativo ? 'bg-mar-claro text-mar-escuro' : 'bg-linha text-suave'
                  }`}
                >
                  {iniciais(u.nome)}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold">{u.nome}</span>
                  <span className="truncate text-sm text-suave">{u.email}</span>
                  <span className="flex flex-wrap gap-2 pt-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAPEL[u.papel].estilo}`}>
                      {PAPEL[u.papel].rotulo}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.ativo ? 'bg-[#DCFCE7] text-sucesso' : 'bg-linha text-suave'
                      }`}
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </span>
                </div>
              </div>
              {admin && (
                <AcoesDoUsuario
                  id={u.id}
                  nome={u.nome}
                  papel={u.papel}
                  ativo={u.ativo}
                  ehVoce={u.id === voce.id}
                />
              )}
            </div>
            {/* Ações raras ficam por baixo e discretas: só abrem o painel quando a pessoa pede. */}
            <div className="flex flex-wrap items-start gap-x-2 -ml-3.5 sm:ml-0 sm:pl-11">
              {admin && <EditarDadosUsuario id={u.id} nome={u.nome} email={u.email} />}
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
