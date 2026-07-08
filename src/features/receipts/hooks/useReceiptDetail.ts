import { useQuery } from "@tanstack/react-query";
import { getReceiptDetail } from "../services/actions";
import type { ReceiptDetail } from "../interfaces/receipt.interface";

// Hook compartido para el detalle de una recepción. Es intencionalmente genérico
// (no filtra por `tipo_origen`), por lo que las futuras vistas de WMS y Producción
// lo reutilizan tal cual. `enabled: id !== null && id > 0` mantiene la consulta
// deshabilitada mientras no haya una recepción seleccionada (id = null).
export const useReceiptDetail = (id: number | null) => {
  return useQuery<ReceiptDetail>({
    queryKey: ["receipt-detail", id],
    queryFn: () => getReceiptDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
