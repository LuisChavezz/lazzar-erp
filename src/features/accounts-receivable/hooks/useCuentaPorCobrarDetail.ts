import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getCuentaPorCobrarDetail } from "../services/actions";
import type { CuentaPorCobrarDetail } from "../interfaces/accounts-receivable-detail.interface";

/**
 * useCuentaPorCobrarDetail
 *
 * Lee el detalle de UNA cuenta por cobrar (`GET /finanzas/cuentas-por-cobrar/{id}/`).
 *
 * `id: number` con `0` como valor centinela de "sin selección" (`enabled: id >
 * 0`): los ids de CxC son autoincrementales de Django y arrancan en 1. El
 * diálogo se monta solo al abrirse y SIEMPRE con un id real, así que renderizar
 * la tabla no dispara ninguna petición de detalle: `enabled` es la segunda
 * barrera, no la única.
 *
 * La llave NO cuelga del prefijo `["accounts-receivable"]` del listado: ese
 * prefijo es exactamente el que invalida la mutación de "Registrar CxC"
 * (`useRegisterPendingInvoice`), y refrescar el detalle abierto no tiene nada
 * que ver con haber dado de alta OTRA cuenta. La invalidan los cobros
 * (`invalidateCobroEffects`), que sí mueven su saldo.
 *
 * **El 404 es un error DEFINITIVO** (`isDefinitiveError` de `useGuardedQuery`):
 * no se reintenta, no avisa por toast y no conserva lo ya cargado. El backend lo
 * responde tanto para un id inexistente como para uno de otra empresa. Se
 * expone como `isNotFound`; `isInitialError` cubre cualquier otro fallo sin
 * datos, y un refetch fallido con datos los conserva y avisa por toast.
 */
export const useCuentaPorCobrarDetail = (id: number) => {
  const { data, isInitialError, isDefinitiveError, error } = useGuardedQuery<CuentaPorCobrarDetail>(
    {
      queryKey: ["accounts-receivable-detail", id],
      queryFn: () => getCuentaPorCobrarDetail(id),
      enabled: id > 0,
      retry: retryUnlessClientError,
    },
    {
      toastId: "accounts-receivable-detail-refetch-error",
      errorMessage: "No se pudo actualizar la cuenta por cobrar. Mostrando datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );

  return { data, isNotFound: isDefinitiveError, isInitialError, error };
};
