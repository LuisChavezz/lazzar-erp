"use client";

import { ChevronRightIcon, PackingIcon, PedidosIcon, RouteIcon } from "@/src/components/Icons";
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
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { PACKING_STATUS_CONFIG } from "../constants/packingStatus";
import type { Packing, PackingDetalleLine } from "../interfaces/packing.interface";
import { PackingPdfButton } from "./PackingPdfButton";
import { CancellationInfo } from "@/src/components/CancellationInfo";
import { WmsCancelHeaderActions } from "@/src/features/wms-cancellations/components/WmsCancelHeaderActions";
import { isPackingCancelled, packingCancelDialogContent } from "../utils/packingCancelAction";

/** Nombre del producto/variante empacado en una línea. Solo uno de los dos
 *  pares viaja no-nulo por línea, nunca ambos. Mismo criterio que el
 *  detalle de picking (`PickingDetailContent`). */
function lineaProductoNombre(linea: PackingDetalleLine): string {
  return linea.producto_variante_nombre ?? linea.producto_nombre ?? "—";
}

const LineasTable = ({ items }: { items: PackingDetalleLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Este embarque no tiene líneas registradas.</EmptyLines>;
  }
  // Embarques anteriores al empaque por cajas no traen `caja_numero`.
  const conCaja = items.some((l) => l.caja_numero != null);
  // Ordenadas por caja para leer el contenido de cada una de corrido.
  const ordenadas = conCaja
    ? [...items].sort((a, b) => (a.caja_numero ?? Infinity) - (b.caja_numero ?? Infinity))
    : items;

  return (
    <LineItemsTable
      head={
        <>
          {conCaja && <th className="px-3 py-2 font-medium">Caja</th>}
          <th className="px-3 py-2 font-medium">Producto / Variante</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium text-right">Solicitada</th>
          <th className="px-3 py-2 font-medium text-right">Asignada</th>
          <th className="px-3 py-2 font-medium text-right">Surtida</th>
          <th className="px-3 py-2 font-medium text-right">Empacada</th>
          <th className="px-3 py-2 font-medium">Ubicación</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
        </>
      }
    >
      {ordenadas.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          {conCaja && (
            <td className="px-3 py-2 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {linea.caja_numero ?? "—"}
            </td>
          )}
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {lineaProductoNombre(linea)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.talla_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.cantidad_solicitada)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.cantidad_asignada)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.cantidad_surtida)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatExactQuantityValue(linea.cantidad_empacada)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.ubicacion_nombre ?? "—"}
          </td>
          <td className="px-3 py-2">
            <StatusBadge status={linea.estado} config={PACKING_STATUS_CONFIG} />
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface PackingDetailDialogProps {
  /** El packing ya cargado por el listado — sin fetch propio (listado y
   *  detalle comparten el mismo `PackingSerializer` en el backend). */
  packing: Packing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackingDetailDialog({ packing, open, onOpenChange }: PackingDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      // "Descargar PDF" junto al título (EC-858) y, con `WMS-CANCELAR`,
      // "Cancelar" (EC-945); el encabezado de `MainDialog` ya reserva la X.
      headerAction={<PackingHeaderActions packing={packing} />}
      title={
        <div className="flex items-center gap-2.5">
          <PackingIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Embarque
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {packing.folio}
            </p>
          </div>
        </div>
      }
    >
      <PackingDetailContent packing={packing} />
    </MainDialog>
  );
}

/**
 * Acciones del encabezado del detalle de un embarque: "Cancelar" (EC-945) y
 * "Descargar PDF" (EC-858). La comparten el diálogo del listado y el de por id.
 */
export function PackingHeaderActions({ packing }: { packing: Packing }) {
  return (
    <WmsCancelHeaderActions
      available={!isPackingCancelled(packing)}
      buttonLabel="Cancelar"
      content={packingCancelDialogContent(packing)}
    >
      <PackingPdfButton packing={packing} />
    </WmsCancelHeaderActions>
  );
}

/**
 * Cuerpo del detalle de packing, extraído para que el diálogo original y el
 * envoltorio por id (`PackingDetailByIdDialog`) compartan un ÚNICO `MainDialog`
 * y solo intercambien el contenido (loader → cuerpo), sin remontar el modal.
 */
export function PackingDetailContent({ packing }: { packing: Packing }) {
  return (
      <div className="space-y-5">
        {isPackingCancelled(packing) && (
          <CancellationInfo
            title="Embarque cancelado"
            motivo={packing.motivo_cancelacion}
            fecha={packing.fecha_cancelacion}
            canceladoPor={packing.cancelado_por_nombre}
          />
        )}

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Estatus">
            <StatusBadge status={packing.estado} config={PACKING_STATUS_CONFIG} />
          </InfoField>
          <InfoField label="Operador">{textOrDash(packing.operador_nombre)}</InfoField>
          <InfoField label="Cajas">
            <span className="tabular-nums">{packing.numero_cajas}</span>
          </InfoField>
          <InfoField label="Peso Total">
            <span className="tabular-nums">
              {formatExactQuantityValue(packing.peso_total)} kg
            </span>
          </InfoField>
          {packing.fecha_inicio && (
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(packing.fecha_inicio)} · {formatShortTime(packing.fecha_inicio)}
              </span>
            </InfoField>
          )}
          {packing.fecha_fin && (
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(packing.fecha_fin)} · {formatShortTime(packing.fecha_fin)}
              </span>
            </InfoField>
          )}
          {packing.observaciones && (
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              {packing.observaciones}
            </InfoField>
          )}
        </div>

        {/* Picking → Pedido */}
        <div>
          <SectionTitle>Surtido de origen</SectionTitle>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <RouteIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {packing.picking_folio}
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  {textOrDash(packing.picking_estado)} · {textOrDash(packing.picking_almacen_nombre)}
                </span>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PedidosIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                {textOrDash(packing.pedido_folio)}
              </span>
            </div>
          </div>
        </div>

        {/* Cajas */}
        {(packing.cajas?.length ?? 0) > 0 && (
          <div>
            <SectionTitle>Cajas</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {packing.cajas!.map((caja) => {
                const piezas = packing.packing_detalle
                  .filter((l) => l.caja_numero === caja.numero)
                  .reduce((acc, l) => acc + (Number.parseFloat(l.cantidad_empacada) || 0), 0);
                return (
                  <div
                    key={caja.id ?? caja.numero}
                    className="min-w-32 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-xs"
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Caja {caja.numero}
                      <span className="font-normal text-slate-500 dark:text-slate-400"> de {packing.cajas!.length}</span>
                    </p>
                    <p className="tabular-nums text-slate-500 dark:text-slate-400">
                      {piezas.toLocaleString("es-MX", { maximumFractionDigits: 4 })} pzas
                      {caja.peso && Number.parseFloat(caja.peso) > 0 && <> · {formatExactQuantityValue(caja.peso)} kg</>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Líneas */}
        <div>
          <SectionTitle>Líneas del embarque</SectionTitle>
          <LineasTable items={packing.packing_detalle} />
        </div>
      </div>
  );
}
