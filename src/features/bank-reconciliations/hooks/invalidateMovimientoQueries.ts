import type { QueryClient } from "@tanstack/react-query";

/**
 * Refresca lo que muestra el ESTATUS de los movimientos bancarios tras cerrar o
 * cancelar una conciliación: cerrar los marca `Conciliado` y cancelar una
 * `Cerrada` los regresa a `Pendiente` (nucleo-erp #827). La app no tiene un
 * listado de movimientos; los pintan el resumen de la cuenta
 * (`["bank-account-summary", id]`: sus últimos movimientos y los cargos del mes,
 * que el backend suma solo sobre los `Pendiente`) y los movimientos de un pago
 * (`["movimientos-por-pago", id]`). Por RAÍZ: la respuesta no dice qué cuentas
 * ni qué pagos tocó, y una invalidación solo vuelve a pedir lo montado.
 */
export const invalidateMovimientoQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bank-account-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["movimientos-por-pago"] }),
  ]);
