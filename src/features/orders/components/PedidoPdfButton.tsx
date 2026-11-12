"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { renderedDocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { PedidoDetail } from "../interfaces/order.interface";
import { generatePedidoPdfBlob } from "../services/pdf/pedidoPdfBlob";
import { loadPedidoForPdf } from "../utils/loadPedidoForPdf";
import { pedidoPdfDescriptor } from "../utils/pedidoPdfDescriptor";

/**
 * "Descargar PDF" de un pedido (EC-856), en la barra de acciones de su página
 * de detalle (`PedidoDetailContent`), en las tres hojas.
 *
 * Como la orden de compra, el PDF NO se arma con el pedido que ya muestra la
 * pantalla: `loadPedidoForPdf` vuelve a pedir el detalle (`staleTime: 0`)
 * porque el folio y el estatus pueden haber cambiado, y esa respuesta ya viene
 * filtrada por rol: sin permiso de importes, el PDF sale sin ellos.
 */
export function PedidoPdfButton({ pedido }: { pedido: Pick<PedidoDetail, "id" | "folio" | "estatus"> }) {
  const queryClient = useQueryClient();

  const source = renderedDocumentPdfSource({
    fetchDetail: () => loadPedidoForPdf(queryClient, pedido.id),
    describe: (data) => pedidoPdfDescriptor(data.pedido),
    render: (data, { company }) => generatePedidoPdfBlob(data, company),
  });

  return <DocumentPdfButton descriptor={pedidoPdfDescriptor(pedido)} source={source} />;
}
