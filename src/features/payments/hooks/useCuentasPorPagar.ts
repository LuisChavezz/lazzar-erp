import { useQuery } from "@tanstack/react-query";
import { getCuentasPorPagar } from "../services/actions";
import {
  CXP_ESTATUS_APLICABLES,
  type CuentaPorPagar,
} from "../interfaces/cuenta-por-pagar.interface";

/**
 * Cuentas por pagar APLICABLES de un proveedor — las que el selector del pago
 * ofrece como líneas.
 *
 * `proveedorId` acepta `null` como centinela de "sin proveedor elegido" y la
 * consulta queda deshabilitada en ese caso: sin proveedor el listado completo de
 * CxP de la empresa no significa nada para un pago, así que no se pide. Mismo
 * criterio de centinela + `enabled` que `useCorteMangaOrderDetail` y
 * `useBankAccountSummary`.
 *
 * La clave incluye el proveedor, de modo que cambiar de proveedor consulta y
 * cachea por separado en vez de reusar las CxP del anterior.
 *
 * REPARTO DEL FILTRADO. `saldo_pendiente=true` se delega al SERVIDOR (se traduce
 * a `saldo__gt=0`), porque es exacto y reduce la carga. El filtro por estatus se
 * hace en CLIENTE: el `get_queryset` compara `estatus` contra UN solo valor, así
 * que "Pendiente O Parcial" no cabe en una sola llamada — pedirlo por servidor
 * exigiría dos consultas y unirlas.
 */
export const useCuentasPorPagar = (proveedorId: number | null) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    CuentaPorPagar[]
  >({
    queryKey: ["cuentas-por-pagar", proveedorId],
    queryFn: () =>
      getCuentasPorPagar({
        proveedor: proveedorId as number,
        saldo_pendiente: true,
      }),
    enabled: proveedorId !== null && proveedorId > 0,
    // Se descartan los estatus terminales que el servidor no puede excluir en
    // una sola llamada. `select` corre sobre la respuesta cacheada, así que el
    // recorte no se recalcula en cada render.
    select: (cuentas) =>
      cuentas.filter((cuenta) => CXP_ESTATUS_APLICABLES.includes(cuenta.estatus)),
  });

  return {
    cuentasPorPagar: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
