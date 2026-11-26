"use client";

import { useState } from "react";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { CheckCircleIcon, ChevronRightIcon, EmbarquesIcon, PackingIcon, PedidosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { SHIPPING_LINE_STATUS_CONFIG } from "../constants/shippingLineStatus";
import type { Shipment, ShipmentDetalleLine } from "../interfaces/shipping.interface";
import { SHIPMENT_STATUS_CONFIG } from "../constants/shipmentStatus";
import { isShipmentCancelled, shipmentCancelDialogContent } from "../utils/shipmentCancelAction";
import { CancellationInfo } from "@/src/components/CancellationInfo";
import { WmsCancelHeaderActions } from "@/src/features/wms-cancellations/components/WmsCancelHeaderActions";
import { useCanCancelWmsDocuments } from "@/src/features/wms-cancellations/hooks/useCanCancelWmsDocuments";
import { canDeliverShipment, isShipmentDelivered, shipmentDisplayStatus } from "../utils/shipmentDelivery";
import { useCanDeliverShipments } from "../hooks/useDeliverShipment";
import { ShipmentDeliverDialog } from "./ShipmentDeliverDialog";

/** Nombre del producto/variante despachado en una línea. Solo uno de los dos
 *  pares viaja no-nulo por línea, nunca ambos. Mismo criterio que
 *  `PackingDetailDialog`/`PickingDetailDialog`. */
function lineaProductoNombre(linea: ShipmentDetalleLine): string {
  return linea.producto_variante_nombre ?? linea.producto_nombre ?? "—";
}


const LineasTable = ({ items }: { items: ShipmentDetalleLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Este envío no tiene líneas registradas.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto / Variante</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium">Color</th>
          <th className="px-3 py-2 font-medium text-right">Empacada</th>
          <th className="px-3 py-2 font-medium">Ubicación</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {lineaProductoNombre(linea)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.talla_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.color_nombre ?? "—"}
          </td>
          {/* La hereda de la línea de packing que referencia. Es la cantidad
              que el despacho sacó del inventario (SALIDA del almacén actual
              del picking). */}
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatExactQuantityValue(linea.cantidad_empacada)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.ubicacion_nombre ?? "—"}
          </td>
          <td className="px-3 py-2">
            <StatusBadge status={linea.estado} config={SHIPPING_LINE_STATUS_CONFIG} />
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface ShippingDetailDialogProps {
  /** El despacho ya cargado por el listado — sin fetch propio (listado y
   *  detalle comparten el mismo `DespachoSerializer` en el backend, mismo
   *  `select_related`/`prefetch_related` en `get_queryset`, confirmado
   *  contra el checkout de `nucleo-erp`). */
  shipment: Shipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShippingDetailDialog({ shipment: row, open, onOpenChange }: ShippingDetailDialogProps) {
  // La respuesta de "Cancelar envío" (EC-945) o de "Entregar" (EC-955): las dos
  // son terminales, y bajo `?estado=ACTIVO` la fila cancelada sale del listado,
  // así que el detalle abierto se queda con lo que respondió el backend en vez
  // de volver a la copia vieja.
  const [result, setResult] = useState<Shipment | null>(null);
  const shipment = result?.id === row.id ? result : row;
  const canCancel = useCanCancelWmsDocuments();
  const canDeliver = useCanDeliverShipments();
  const [deliverOpen, setDeliverOpen] = useState(false);
  const delivered = isShipmentDelivered(shipment);
  const hasActions = canCancel || canDeliver;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      // Sin PDF propio. "Cancelar" (EC-945) con `WMS-CANCELAR` o Mesa de Control,
      // y nunca en uno entregado (el backend responde 400: es una devolución);
      // "Entregar" (EC-955) con `C-WMS-ENVIO`, en uno activo sin entrega.
      headerAction={
        hasActions ? (
          <WmsCancelHeaderActions
            available={!isShipmentCancelled(shipment) && !delivered}
            buttonLabel="Cancelar"
            content={{ ...shipmentCancelDialogContent(shipment), onSuccess: setResult }}
          >
            {canDeliver && canDeliverShipment(shipment) && (
              <Button
                variant="secondary"
                onClick={() => setDeliverOpen(true)}
                className="px-3! py-1.5! text-xs! text-sky-700! dark:text-sky-400!"
              >
                <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                Entregar
              </Button>
            )}
          </WmsCancelHeaderActions>
        ) : null
      }
      title={
        // Con acción, el encabezado de `MainDialog` ya reserva el espacio de la X.
        <div className={`flex items-center gap-2.5 ${hasActions ? "" : "pr-8"}`}>
          <EmbarquesIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Envío
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {shipment.packing_folio}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {isShipmentCancelled(shipment) && (
          <CancellationInfo
            title="Envío cancelado"
            motivo={shipment.motivo_cancelacion}
            fecha={shipment.fecha_cancelacion}
            canceladoPor={shipment.cancelado_por_nombre}
          />
        )}

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Estado del envío">
            {shipment.estado ? (
              <StatusBadge status={shipmentDisplayStatus(shipment)} config={SHIPMENT_STATUS_CONFIG} />
            ) : (
              "—"
            )}
          </InfoField>
          {/* `packing_estado` es siempre "PENDIENTE" en la práctica (no hay
              endpoint de transición sobre packing, salvo cancelarlo) — se
              muestra como texto plano, no como `StatusBadge`, para no leerse
              como un indicador de avance que en realidad no existe. */}
          <InfoField label="Estatus del embarque">{textOrDash(shipment.packing_estado)}</InfoField>
          <InfoField label="Pedido">{textOrDash(shipment.pedido_folio)}</InfoField>
          <InfoField label="Cliente">{textOrDash(shipment.cliente_nombre)}</InfoField>
          <InfoField label="Sucursal">{textOrDash(shipment.sucursal_nombre)}</InfoField>
          <InfoField label="Salió">
            {shipment.fecha_creacion
              ? formatShortDate(shipment.fecha_creacion, { timeZone: MEXICO_TIME_ZONE })
              : "—"}
          </InfoField>
          <InfoField label="Registró">{textOrDash(shipment.usuario_nombre)}</InfoField>
          {/* Entrega (#1361): `null` mientras no se registra. */}
          <InfoField label="Entregado">
            {shipment.fecha_entrega
              ? formatShortDateTime(shipment.fecha_entrega, { timeZone: MEXICO_TIME_ZONE })
              : "—"}
          </InfoField>
          <InfoField label="Registró la entrega">{textOrDash(shipment.entregado_por_nombre)}</InfoField>
          <InfoField label="Recibió">{textOrDash(shipment.recibio)}</InfoField>
          <InfoField label="Tipo de envío">{textOrDash(shipment.tipo_envio_display)}</InfoField>
          {shipment.tipo_envio === "LOCAL" ? (
            <InfoField label="Chofer">{textOrDash(shipment.chofer_nombre)}</InfoField>
          ) : (
            <>
              <InfoField label="Paquetería">{textOrDash(shipment.paqueteria_display)}</InfoField>
              <InfoField label="Guía">
                <span className="font-mono">{textOrDash(shipment.guia)}</span>
              </InfoField>
            </>
          )}
        </div>

        {/* Packing de origen */}
        <div>
          <SectionTitle>Embarque de origen</SectionTitle>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PackingIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                {shipment.packing_folio}
              </span>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PedidosIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                {textOrDash(shipment.pedido_folio)}
              </span>
            </div>
          </div>
        </div>

        {/* Líneas */}
        <div>
          <SectionTitle>Líneas del envío</SectionTitle>
          <LineasTable items={shipment.despacho_detalle} />
        </div>
      </div>
      {/* Montado aparte del botón, con el permiso: al entregar, el botón
          desaparece, pero el diálogo debe poder cerrarse con su animación. */}
      {canDeliver && (
        <ShipmentDeliverDialog
          shipment={shipment}
          open={deliverOpen}
          onOpenChange={setDeliverOpen}
          onDelivered={setResult}
          // 404: la copia de este detalle ya no sirve (el envío no existe o salió
          // del alcance), así que se cierra junto con el diálogo de la entrega.
          onNotFound={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
