import { useQuery } from "@tanstack/react-query";
import { getBomBulk } from "@/src/features/bom/services/actions";
import type { BomBulkItem } from "@/src/features/bom/interfaces/bom.interface";

export const useBomBulk = (productoVarianteIds: number[]) => {
  return useQuery<BomBulkItem[]>({
    queryKey: ['bom-bulk', productoVarianteIds],
    queryFn: () => getBomBulk(productoVarianteIds),
    enabled: productoVarianteIds.length > 0,
  });
};
