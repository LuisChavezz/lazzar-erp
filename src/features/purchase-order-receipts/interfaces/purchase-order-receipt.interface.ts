import type { Receipt } from "@/src/features/receipts/interfaces/receipt.interface";

// Recepciones de tipo OC tal como las devuelve la vista de Compras
// (GET /compras/recepciones/?tipo_origen=OC). El tipo general `Receipt`
// también modela origen OP, por lo que ahí `proveedor`/`proveedor_nombre`/
// `orden_compra`/`orden_compra_folio` son nullable — en esta vista, filtrada
// server-side a OC, el backend siempre los trae. Se afirma esa garantía aquí
// en vez de forzar `|| "—"` en columnas que nunca están vacías.
export interface PurchaseOrderReceipt
  extends Omit<
    Receipt,
    "proveedor_nombre" | "orden_compra_folio" | "proveedor" | "orden_compra"
  > {
  proveedor_nombre: string;
  orden_compra_folio: string;
  proveedor: number;
  orden_compra: number;
}
