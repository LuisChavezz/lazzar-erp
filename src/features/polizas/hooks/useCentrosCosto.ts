import { useQuery } from "@tanstack/react-query";
import { getCentrosCosto } from "../services/actions";
import type { CentroCosto } from "../interfaces/catalogos.interface";

/**
 * Catálogo de centros de costo ACTIVOS.
 *
 * ─── HOOK AD HOC DE ESTE MÓDULO ──────────────────────────────────────────────
 *
 * Igual que `useCuentasContables`: no existe `features/centros-costo/` ni ningún
 * otro consumidor de este endpoint, porque su pantalla de catálogo (EC-140) está
 * sin construir. CANDIDATO A EXTRACCIÓN a ese módulo cuando exista, junto con
 * `getCentrosCosto` y el tipo `CentroCosto`.
 *
 * Alimenta DOS selectores a la vez —el de la cabecera de la póliza y el de cada
 * movimiento—, que son dos campos distintos del mismo catálogo: `Poliza` y
 * `PolizaDetalle` declaran cada uno su propia FK a `CentroCosto`. Una sola
 * entrada de caché sirve a los dos.
 *
 * `activo=true` se delega al servidor.
 */
export const useCentrosCosto = () => {
  const params = { activo: true } as const;

  const { data, isLoading, isError, error, refetch } = useQuery<CentroCosto[]>({
    queryKey: ["centros-costo", params],
    queryFn: () => getCentrosCosto(params),
  });

  return {
    centrosCosto: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
  };
};
