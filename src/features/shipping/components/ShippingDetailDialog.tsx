"use client";

import { ChevronRightIcon, EmbarquesIcon, PackingIcon, PedidosIcon } from "@/src/components/Icons";
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

/** Nombre del producto/variante despachado en una línea. Solo uno de los dos
 *  pares viaja no-nulo por línea, nunca ambos. Mismo criterio que
 *  `PackingDetailDialog`/`PickingDetailDialog`. */
function lineaProductoNombre(linea: ShipmentDetalleLine): string {
  return linea.producto_variante_nombre ?? linea.producto_nombre ?? "—";
}

/**
 * `envio`/`envio_transportista` en formato de texto. Mismo criterio y misma
 * copia EXACTA que `ShippingColumns.tsx` ("Sin guía"/"Sin transportista")
 * para que el listado y el detalle no digan cosas distintas del mismo dato.
 */
function envioLabel(value: number | null): string {
  return value !== null ? `Guía #${value}` : "Sin guía";
}
function transportistaLabel(value: number | null): string {
  return value !== null ? `Transportista #${value}` : "Sin transportista";
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
          {/* Informativa: `Despacho` no decrementa ni valida esta cantidad,
              solo la hereda de la línea de packing que referencia. */}
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

export function ShippingDetailDialog({ shipment, open, onOpenChange }: ShippingDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
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
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          {/* `packing_estado` es siempre "PENDIENTE" en la práctica (no hay
              endpoint de transición sobre packing) — se muestra como texto
              plano, no como `StatusBadge`, para no leerse como un indicador
              de avance que en realidad no existe. */}
          <InfoField label="Estatus del packing">{textOrDash(shipment.packing_estado)}</InfoField>
          <InfoField label="Pedido">{textOrDash(shipment.pedido_folio)}</InfoField>
          <InfoField label="Cliente">{textOrDash(shipment.cliente_nombre)}</InfoField>
          <InfoField label="Sucursal">{textOrDash(shipment.sucursal_nombre)}</InfoField>
          <InfoField label="Guía">{envioLabel(shipment.envio)}</InfoField>
          <InfoField label="Transportista">
            {transportistaLabel(shipment.envio_transportista)}
          </InfoField>
        </div>

        {/* Packing de origen */}
        <div>
          <SectionTitle>Packing de origen</SectionTitle>
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
    </MainDialog>
  );
}
