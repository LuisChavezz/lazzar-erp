import { useQuery } from "@tanstack/react-query";
import { getCuentasContables } from "../services/actions";
import type { CuentaContable } from "../interfaces/catalogos.interface";

/**
 * Catálogo de cuentas contables SELECCIONABLES en un movimiento de póliza.
 *
 * ─── HOOK AD HOC DE ESTE MÓDULO ──────────────────────────────────────────────
 *
 * No existe `features/cuentas-contables/` ni ningún otro hook que lea este
 * endpoint: la pantalla de catálogo (EC-139) está sin construir. Vive aquí
 * porque los selectores de la póliza lo necesitan hoy.
 *
 * CANDIDATO A EXTRACCIÓN: cuando EC-139 exista, este hook, su acción
 * (`getCuentasContables`) y su tipo (`CuentaContable`) deben MUDARSE a ese
 * módulo y `polizas` importarlos, igual que `payments` hace con `banks`. La
 * llave de caché ya es la genérica del recurso (`["cuentas-contables", params]`)
 * y no una llave privada de pólizas, precisamente para que la mudanza no obligue
 * a invalidar nada distinto.
 *
 * ─── EL FILTRO ES DEL SERVIDOR ───────────────────────────────────────────────
 *
 * `acepta_movimientos=true` y `activo=true` se delegan al `get_queryset`, que
 * los aplica exactamente (no son una aproximación en cliente). Son los dos
 * filtros que definen "cuenta que admite un asiento directo": una cuenta de
 * agrupación (`acepta_movimientos=false`, las que solo suman a sus hijas) no
 * puede recibir un cargo o un abono, y una inactiva no debe ofrecerse.
 *
 * El backend NO impone esta regla —`PolizaDetalle.cuenta_contable` acepta
 * cualquier cuenta de la empresa—, así que el filtro del selector es lo único
 * que impide el asiento contra una cuenta de agrupación.
 */
export const useCuentasContables = () => {
  const params = { acepta_movimientos: true, activo: true } as const;

  const { data, isLoading, isError, error, refetch } = useQuery<CuentaContable[]>({
    queryKey: ["cuentas-contables", params],
    queryFn: () => getCuentasContables(params),
  });

  return {
    cuentasContables: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
  };
};
