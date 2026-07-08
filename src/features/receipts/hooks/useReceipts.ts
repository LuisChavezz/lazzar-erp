import { useQuery } from "@tanstack/react-query";
import { getReceipts } from "../services/actions";
import type { Receipt } from "../interfaces/receipt.interface";

export const useReceipts = () => {
  return useQuery<Receipt[]>({
    queryKey: ["receipts"],
    // Envuelto en una arrow para no pasarle el QueryFunctionContext de
    // TanStack como `tipo_origen` ahora que la acción acepta ese parámetro
    // opcional. Sin filtro → comportamiento idéntico al anterior.
    queryFn: () => getReceipts(),
  });
};
