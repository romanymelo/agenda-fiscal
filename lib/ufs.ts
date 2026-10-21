/** As 27 unidades federativas. UF digitada fora desta lista nunca casaria com a praça de ninguém. */
export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

export const ufValida = (uf: string): boolean => (UFS as readonly string[]).includes(uf)
