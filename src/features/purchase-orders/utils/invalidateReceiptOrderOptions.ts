import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalida la lista de órdenes que ofrece el alta de recepción
 * (`["receipt-onboarding-data"]`, feature `receipts`). El backend solo lista
 * ahí las OC recibibles (autorizadas o parcialmente recibidas), así que toda
 * transición de estatus de una OC la desactualiza: confirmarla la agrega,
 * cancelarla o editarla (regresa a pendiente y recrea sus renglones) la quita.
 * Sin esto, esa caché (15 min) seguiría mostrando la lista anterior.
 *
 * Invalidación simple a propósito (no `reset`/`remove`): el selector vuelve a
 * pedir la lista al montarse.
 */
export const invalidateReceiptOrderOptions = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
