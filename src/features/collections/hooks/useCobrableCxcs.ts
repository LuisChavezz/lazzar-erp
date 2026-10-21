import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCuentasPorCobrar } from "@/src/features/accounts-receivable/services/actions";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";

/**
 * Estatus que admiten un cobro. `saldo_pendiente=true` también devuelve las
 * `Cancelada` (cancelar la factura no pone su saldo en 0), así que se filtran
 * aquí; el filtro de servidor admite un solo estatus por llamada.
 */
const ESTATUS_COBRABLES = new Set<string>(["Pendiente", "Parcial"]);

interface CobrableCxcsParams {
  clienteId: number;
  /** Moneda de la cuenta bancaria: id para el filtro de servidor, código para el de cliente. */
  moneda: { id: number; codigo: string } | null;
}

/**
 * CxC que un cobro puede aplicar: del cliente, con saldo, en la moneda de la
 * cuenta bancaria y con estatus Pendiente o Parcial.
 *
 * El SALDO tiene que ser fresco: es el importe con que se siembra cada línea y
 * el techo que valida el formulario. Por eso `refetchOnMount: "always"`: cada
 * apertura del selector (y el formulario al montarse) vuelve a pedirlo aunque
 * la caché tenga menos de 15 min. La llave es la misma raíz que
 * `useCuentasPorCobrar` (`["accounts-receivable", params]`), así que toda
 * invalidación de CxC la alcanza.
 *
 * `byId` incluye TODO lo que devolvió el servidor (no solo lo cobrable), para
 * que el formulario lea el saldo vigente de las líneas ya agregadas.
 */
export const useCobrableCxcs = ({ clienteId, moneda }: CobrableCxcsParams) => {
  const params = { cliente: clienteId, saldo_pendiente: true, moneda: moneda?.id ?? 0 };
  const { data, isLoading, isInitialError, hasLoaded } = useGuardedQuery<CuentaPorCobrar[]>(
    {
      queryKey: ["accounts-receivable", params],
      queryFn: () => getCuentasPorCobrar(params),
      enabled: clienteId > 0 && moneda !== null,
      refetchOnMount: "always",
    },
    { toastId: "cobrable-cxcs-refetch-error" },
  );

  const cuentas = data ?? [];
  return {
    cobrables: cuentas.filter(
      (cuenta) => ESTATUS_COBRABLES.has(cuenta.estatus) && cuenta.moneda_codigo === moneda?.codigo,
    ),
    byId: new Map(cuentas.map((cuenta) => [cuenta.id, cuenta])),
    hasLoaded,
    isLoading,
    isInitialError,
  };
};
