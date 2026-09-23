import type { OrderStockDetail } from "@/src/features/orders/interfaces/order-stock-detail.interface";

// Cobertura de una talla: la existencia cubre, cubre en parte o no hay existencia.
export type SizeCoverage = "full" | "partial" | "none";

// Cobertura de una línea. `no-sizes` = línea sin tallas (p. ej. muestras): no
// hay nada que comparar, así que no cuenta como cubierta ni como faltante.
export type LineCoverage = SizeCoverage | "no-sizes";

// Extiende la línea de detalle con una clave estable para listas React.
// La clave combina producto + color + índice para evitar colisiones entre variantes.
export interface NormalizedOrderStockDetail extends OrderStockDetail {
  key: string;
}

// Props del diálogo de revisión de inventario de pedidos (Mesa de Control).
// Neutras a propósito: no dependen del tipo de fila de ninguna tabla.
export interface OrderStockReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  folio: string | null;
  clientName: string | null;
  createdAt: string | null;
}
