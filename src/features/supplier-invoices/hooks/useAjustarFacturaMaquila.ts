import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";
import { ajustarFacturaMaquila } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

export const ajustarFacturaMaquilaMutationKey = ["ajustar-factura-maquila"] as const;

/**
 * Ajusta las líneas de una factura de maquila en Borrador (EC-919).
 *
 * La respuesta ES la factura completa (forma de lectura, igual a la del
 * listado): se escribe en la caché de cada lista de `["facturas-proveedor"]`
 * que la traiga, sin volver a pedirla. El detalle de la SM muestra el total de
 * sus facturas, así que se invalida.
 *
 * Un 400 por `estatus` (ya no es Borrador) o `salida_maquila`, o un 404, dicen
 * que la fila estaba vieja: se refresca el listado.
 */
export const useAjustarFacturaMaquila = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ajustarFacturaMaquilaMutationKey,
    mutationFn: ajustarFacturaMaquila,
    onSuccess: (factura: FacturaProveedor) => {
      queryClient.setQueriesData<FacturaProveedor[]>({ queryKey: ["facturas-proveedor"] }, (old) =>
        Array.isArray(old) ? old.map((f) => (f.id === factura.id ? factura : f)) : old,
      );
      queryClient.invalidateQueries({ queryKey: ["salidas-maquila"] });
      toast.success("Factura ajustada a la del maquilero");
    },
    onError: (error) => {
      toastDrfError(error, "No se pudo ajustar la factura.");
      if (!isAxiosError(error)) return;
      const data: unknown = error.response?.data;
      const filaVieja =
        error.response?.status === 404 ||
        (error.response?.status === 400 &&
          !!data &&
          typeof data === "object" &&
          ("estatus" in data || "salida_maquila" in data));
      if (filaVieja) queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
    },
  });
};
