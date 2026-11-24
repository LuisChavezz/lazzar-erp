"use client";

import toast from "react-hot-toast";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { FolioButton } from "@/src/components/FolioButton";
import { CopyIcon } from "@/src/components/Icons";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { formatShortDate } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { Shipment } from "../interfaces/shipping.interface";
import { SHIPMENT_STATUS_CONFIG } from "../constants/shipmentStatus";
import { isShipmentCancelled } from "../utils/shipmentCancelAction";

const columnHelper = createColumnHelper<Shipment>();

/**
 * Piezas que cuentan para los totales del listado (filtro de contenido y
 * resumen de la exportación): las del envío, o `null` si está cancelado (sus
 * piezas ya regresaron al almacén, EC-945).
 */
export const shipmentPiezasVigentes = (row: Shipment): number | null =>
  isShipmentCancelled(row) ? null : shipmentContenido(row).piezas;

/** Totales del contenido, calculados del `despacho_detalle` que ya trae la fila. */
export function shipmentContenido(row: Shipment) {
  const piezas = row.despacho_detalle.reduce((acc, l) => acc + (Number.parseFloat(l.cantidad_empacada) || 0), 0);
  const cajas = new Set(row.despacho_detalle.map((l) => l.caja_numero).filter((c) => c !== null)).size;
  return { piezas, lineas: row.despacho_detalle.length, cajas };
}

/**
 * Cómo salió, en una sola etiqueta (para el filtro y la celda): la paquetería,
 * "Local", o "Sin dato" en los despachos anteriores a la captura obligatoria.
 */
export function shipmentTransporteLabel(row: Shipment): string {
  if (row.tipo_envio === "LOCAL") return "Local";
  return row.paqueteria_display || (row.guia ? "Paquetería" : "Sin dato");
}

const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

interface ShipmentColumnsCallbacks {
  onOpenDetail: (shipment: Shipment) => void;
}

/**
 * Columnas del listado de envíos. Sin columna de acciones: el detalle se abre
 * desde el folio del embarque (botón con "›"), y ahí vive "Cancelar" (EC-945).
 * El estado del envío va bajo el folio, en la primera columna. La fecha y quién
 * lo registró solo se pintan si el backend los manda.
 */
export const getShipmentColumns = ({ onOpenDetail }: ShipmentColumnsCallbacks, conFecha: boolean) =>
  [
    columnHelper.accessor("packing_folio", {
      header: "Embarque",
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <FolioButton folio={row.original.packing_folio} onClick={() => onOpenDetail(row.original)} />
          {row.original.estado && <StatusBadge status={row.original.estado} config={SHIPMENT_STATUS_CONFIG} />}
        </span>
      ),
    }),
    ...(conFecha
      ? [
          columnHelper.accessor((row) => row.fecha_creacion ?? "", {
            id: "fecha_creacion",
            header: "Salió",
            cell: ({ row }) => (
              <span className="flex flex-col leading-tight">
                <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                  {row.original.fecha_creacion
                    ? formatShortDate(row.original.fecha_creacion, { timeZone: MEXICO_TIME_ZONE })
                    : "—"}
                </span>
                {row.original.usuario_nombre && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.usuario_nombre}</span>
                )}
              </span>
            ),
          }),
        ]
      : []),
    // Pedido + cliente en una celda: el cliente es el dato que el usuario
    // reconoce; el folio enlaza al pedido 360°.
    columnHelper.accessor((row) => `${row.pedido_folio ?? ""} ${row.cliente_nombre ?? ""}`, {
      id: "cliente",
      header: "Pedido / Cliente",
      cell: ({ row }) => (
        <span className="flex min-w-0 flex-col leading-tight">
          <PedidoFolioLink
            pedidoId={row.original.pedido}
            folio={row.original.pedido_folio}
            from="shipping"
            className="font-mono text-xs font-semibold"
          />
          <span className="max-w-60 truncate text-sm text-slate-700 dark:text-slate-200" title={row.original.cliente_nombre}>
            {row.original.cliente_nombre || "—"}
          </span>
        </span>
      ),
    }),
    columnHelper.accessor((row) => `${shipmentTransporteLabel(row)} ${row.chofer_nombre ?? ""}`, {
      id: "transporte",
      header: "Transporte",
      cell: ({ row }) => <TransporteCell shipment={row.original} />,
    }),
    columnHelper.accessor("guia", {
      header: "Guía",
      cell: ({ row }) => <GuiaCell guia={row.original.guia} />,
    }),
    columnHelper.accessor((row) => shipmentContenido(row).piezas, {
      id: "contenido",
      header: "Contenido",
      meta: { align: "right" },
      cell: ({ row }) => {
        const { piezas, lineas, cajas } = shipmentContenido(row.original);
        // Cancelado: su contenido regresó al almacén; se tacha para que no se lea como enviado.
        const cancelled = isShipmentCancelled(row.original);
        return (
          <span
            className={`flex flex-col items-end leading-tight tabular-nums ${cancelled ? "line-through opacity-60" : ""}`}
            title={cancelled ? "Envío cancelado: sus piezas regresaron al almacén" : undefined}
          >
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {miles(piezas)} <span className="text-[11px] font-normal text-slate-400">pzas</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lineas} {lineas === 1 ? "línea" : "líneas"}
              {cajas > 0 && ` · ${cajas} ${cajas === 1 ? "caja" : "cajas"}`}
            </span>
          </span>
        );
      },
    }),
  ] as ColumnDef<Shipment, unknown>[];

const TRANSPORTE_TONE: Record<string, string> = {
  Local: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "Sin dato": "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

function TransporteCell({ shipment }: { shipment: Shipment }) {
  const label = shipmentTransporteLabel(shipment);
  const tone = TRANSPORTE_TONE[label] ?? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300";
  return (
    <span className="flex flex-col items-start gap-0.5 leading-tight">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
      {shipment.tipo_envio === "LOCAL" && shipment.chofer_nombre && (
        <span className="max-w-48 truncate text-[11px] text-slate-500 dark:text-slate-400" title={shipment.chofer_nombre}>
          {shipment.chofer_nombre}
        </span>
      )}
    </span>
  );
}

/** Guía en monoespaciada con botón de copiar (se pega en el rastreo de la paquetería). */
function GuiaCell({ guia }: { guia: string }) {
  if (!guia) return <span className="text-sm text-slate-400">—</span>;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(guia);
      toast.success("Guía copiada");
    } catch {
      toast.error("No se pudo copiar la guía");
    }
  };
  return (
    <span className="group inline-flex items-center gap-1.5">
      <span className="font-mono text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">{guia}</span>
      <button
        type="button"
        onClick={() => void copiar()}
        aria-label={`Copiar guía ${guia}`}
        title="Copiar guía"
        className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-sky-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/10 cursor-pointer"
      >
        <CopyIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
