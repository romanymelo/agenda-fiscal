'use client'

import { Botao } from '@/components/campos'

/** Abre a janela de impressão do navegador: de lá se imprime ou se escolhe "Salvar como PDF". */
export function Imprimir({ desabilitado }: { desabilitado: boolean }) {
  return (
    <Botao variante="secundario" disabled={desabilitado} onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </Botao>
  )
}
