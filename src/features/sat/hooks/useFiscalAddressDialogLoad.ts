import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";
import { fiscalAddressQueryOptions } from "./useCompanyFiscalAddress";

export type FiscalAddressDialogLoad =
  | { status: "loading" }
  | { status: "ready"; id: number; address: FiscalAddress }
  | { status: "error"; error: unknown };

/**
 * Relee el domicilio fiscal al abrir el diálogo de edición (EC-860): la caché
 * puede tener hasta 15 min y otra pestaña u otro administrador pudo guardar
 * entretanto. El formulario se monta con lo que llega (`ready`), que también
 * refresca la vista porque pasa por la misma llave de caché.
 *
 * Hace el papel de `useDialogSession`: la copia del registro se toma una vez
 * por apertura y no se mueve mientras el diálogo sigue abierto ni durante su
 * animación de salida. No usa ese hook porque la copia no existe al abrir:
 * llega después, con la respuesta. `id` cambia en cada apertura y sirve de
 * `key` del formulario.
 */
export const useFiscalAddressDialogLoad = (companyId: number | null) => {
  const queryClient = useQueryClient();
  const [load, setLoad] = useState<FiscalAddressDialogLoad>({ status: "loading" });
  // Apertura vigente: una respuesta de una apertura anterior se descarta.
  const requestRef = useRef(0);

  const reload = async () => {
    const requestId = ++requestRef.current;
    setLoad({ status: "loading" });
    try {
      const address = await queryClient.fetchQuery({
        ...fiscalAddressQueryOptions(companyId),
        staleTime: 0,
      });
      if (requestRef.current === requestId) setLoad({ status: "ready", id: requestId, address });
    } catch (error) {
      if (requestRef.current === requestId) setLoad({ status: "error", error });
    }
  };

  return { load, reload };
};
