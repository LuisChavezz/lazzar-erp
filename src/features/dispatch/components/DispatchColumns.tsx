"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { DispatchDetailDialog } from "./DispatchDetailDialog";
import type { Dispatch } from "../interfaces/dispatch.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: Dispatch }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => setIsDetailOpen(true) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones del despacho de ${row.packing_folio}`} />
      {/* Montaje condicional: el diálogo no existe hasta abrirlo. Sin fetch
          propio — `row` YA es el objeto completo (`despacho_detalle`
          incluido), la misma forma que devuelve el detalle (listado y
          detalle comparten `DespachoSerializer` en el backend, confirmado
          leyendo `DespachoViewSet.get_queryset`/`get_serializer_class` en el
          checkout de `nucleo-erp` — ninguno de los dos está condicionado por
          `self.action`), así que no dispara ninguna petición nueva. */}
      {isDetailOpen && (
        <DispatchDetailDialog dispatch={row} open={true} onOpenChange={setIsDetailOpen} />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<Dispatch>();

/**
 * Columnas del listado de despacho. `Despacho` no tiene folio, estado
 * significativo ni timestamp propios (ver `dispatch.interface.ts`), así que
 * el set de columnas se apoya en los campos heredados/denormalizados que sí
 * identifican el renglón. Deliberadamente se omiten:
 * - `packing_estado`: siempre `"PENDIENTE"` en la práctica, no aporta señal.
 * - `envio_transportista_nombre`: siempre `null` (el modelo `Transportista`
 *   no tiene campo de nombre), por eso se muestra el id crudo en su lugar.
 * - Cualquier columna de fecha: no existe timestamp alguno en este modelo.
 */
export const dispatchColumns = [
  columnHelper.accessor("packing_folio", {
    header: "Packing",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("pedido_folio", {
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("cliente_nombre", {
    header: "Cliente",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("sucursal_nombre", {
    header: "Sucursal",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("envio", {
    header: "Envío",
    // `envio` es genuinamente `null` cuando el despacho se registró sin
    // envío — el caso de casi todos los despachos creados desde este
    // frontend (ver `dispatch.interface.ts`), no un dato faltante a resolver.
    cell: (info) => {
      const value = info.getValue();
      return (
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {value !== null ? `Envío #${value}` : "Sin envío"}
        </span>
      );
    },
  }),
  columnHelper.accessor("envio_transportista", {
    header: "Transportista",
    // `envio_transportista_nombre` siempre viaja `null` (ver interfaz) — se
    // muestra el id crudo con una etiqueta clara en vez de una celda vacía.
    // `envio_transportista` en sí es `null` cuando no hay envío asociado,
    // mismo criterio que la columna "Envío".
    cell: (info) => {
      const value = info.getValue();
      return (
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {value !== null ? `Transportista #${value}` : "Sin transportista"}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<Dispatch>[];
