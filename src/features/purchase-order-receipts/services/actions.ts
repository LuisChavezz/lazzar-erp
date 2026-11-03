import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import type { PurchaseOrderReceiptKpis } from "../interfaces/purchase-order-receipt-kpis.interface";

/**
 * Una PÁGINA de recepciones de compra (`?limit=&offset=` → `{count, next,
 * previous, results}`) con los filtros, la búsqueda y el orden de la tabla en
 * modo servidor (`usePurchaseOrderReceiptsTable`). `tipo_origen=OC` va FIJO
 * aquí y no en la URL: esta vista es solo de recepciones de OC, y así también
 * lo lleva la exportación, que reusa esta acción.
 *
 * El backend garantiza que toda fila con `tipo_origen=OC` trae proveedor y
 * orden de compra (a diferencia del tipo `Receipt` general, que también modela
 * OP), por eso se afirma aquí el tipo más angosto, `PurchaseOrderReceipt`.
 */
export const getPurchaseOrderReceiptsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<PurchaseOrderReceipt>> => {
  const { data } = await v1_api.get<PaginatedListResponse<PurchaseOrderReceipt>>(
    "/compras/recepciones/",
    { params: { ...params, tipo_origen: "OC" } },
  );
  return data;
};

/**
 * Indicadores de recepciones de compra (`GET /compras/recepciones/kpis/`,
 * EC-434), calculados por el backend. Sin params: el endpoint no acepta
 * ninguno.
 */
export const getPurchaseOrderReceiptKpis = async (): Promise<PurchaseOrderReceiptKpis> => {
  const response = await v1_api.get<PurchaseOrderReceiptKpis>("/compras/recepciones/kpis/");
  return response.data;
};
