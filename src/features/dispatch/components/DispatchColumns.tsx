"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
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
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
  // visibilidad/orden de columna que guarda `DataTable`.
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
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
  // Mismo `accessorFn` que `pedido_folio` y por el mismo motivo (ver el bloque
  // de arriba), con un matiz propio de ser columna NUMÉRICA: lo buscable es el
  // ID CRUDO (`3`), no la etiqueta renderizada (`"Envío #3"`). Por eso el
  // accessor devuelve el id en texto y la celda sigue leyendo el valor sin
  // formatear de `row.original` para armar su etiqueta — el accessor cambia
  // qué participa en la búsqueda, no qué se ve.
  columnHelper.accessor((row) => (row.envio !== null ? String(row.envio) : ""), {
    id: "envio",
    header: "Envío",
    // `envio` es genuinamente `null` cuando el despacho se registró sin
    // envío — el caso de casi todos los despachos creados desde este
    // frontend (ver `dispatch.interface.ts`), no un dato faltante a resolver.
    //
    // `sortingFn` explícito: el accessor de arriba devuelve el id como texto
    // (necesario para la búsqueda), pero TanStack auto-detecta el comparador
    // muestreando valores — si el muestreo cae solo en filas sin envío (`""`),
    // decide un comparador de texto y ordena "10" antes que "2". Se compara el
    // número crudo directamente para que el orden sea siempre numérico.
    sortingFn: (rowA, rowB) => (rowA.original.envio ?? -Infinity) - (rowB.original.envio ?? -Infinity),
    cell: (info) => {
      const value = info.row.original.envio;
      return (
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {value !== null ? `Envío #${value}` : "Sin envío"}
        </span>
      );
    },
  }),
  // Mismo criterio numérico que la columna "Envío", incluido el `sortingFn`
  // explícito (mismo motivo: evitar que TanStack caiga en comparación de texto).
  columnHelper.accessor(
    (row) => (row.envio_transportista !== null ? String(row.envio_transportista) : ""),
    {
      id: "envio_transportista",
      header: "Transportista",
      // `envio_transportista_nombre` siempre viaja `null` (ver interfaz) — se
      // muestra el id crudo con una etiqueta clara en vez de una celda vacía.
      // `envio_transportista` en sí es `null` cuando no hay envío asociado,
      // mismo criterio que la columna "Envío".
      sortingFn: (rowA, rowB) =>
        (rowA.original.envio_transportista ?? -Infinity) -
        (rowB.original.envio_transportista ?? -Infinity),
      cell: (info) => {
        const value = info.row.original.envio_transportista;
        return (
          <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {value !== null ? `Transportista #${value}` : "Sin transportista"}
          </span>
        );
      },
    }
  ),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<Dispatch>[];
