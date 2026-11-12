"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { ProductionOrderOnboarding } from "../interfaces/production-order.interface";
import { generateProductionOrderPdfBlob } from "../services/pdf/productionOrderPdfBlob";
import { productionOrderPdfDescriptor } from "../utils/productionOrderPdf";
import { productionOrderPdfSource } from "../utils/productionOrderPdfSource";

/**
 * "Descargar PDF" de una orden de producción (EC-857), en la barra de acciones
 * de su página de detalle. Disponible en todos los estatus; una OP cancelada
 * sale con la marca de la base. Solo en la página: no va en el diálogo que se
 * abre desde el pedido 360°.
 */
export function ProductionOrderPdfButton({
  op,
}: {
  op: Pick<ProductionOrderOnboarding, "op_id" | "folio_op" | "estatus_op">;
}) {
  return (
    <DocumentPdfButton
      descriptor={productionOrderPdfDescriptor(op)}
      source={productionOrderPdfSource({ opId: op.op_id, render: generateProductionOrderPdfBlob })}
    />
  );
}
