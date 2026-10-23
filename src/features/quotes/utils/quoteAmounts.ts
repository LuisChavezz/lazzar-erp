/**
 * Lo que aporta un cargo capturado (flete, seguros, anticipo) a los totales EN
 * VIVO: un valor negativo o no numérico es inválido —el campo ya muestra su
 * error— y cuenta 0, para que el total y el saldo nunca se calculen con él
 * (EC-563, CO-07).
 */
export const nonNegativeAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};
