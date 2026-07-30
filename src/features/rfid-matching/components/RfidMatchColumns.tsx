"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { RFID_MATCH_STATUS_CONFIG } from "../constants/rfidMatchStatus";
import { isRfidMatchComplete, unidadesEmparejadas } from "../utils/rfid-matching.utils";
import type { RfidMatch } from "../interfaces/rfid-matching.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

/**
 * Sin estado ni diálogo propios: solo dispara `onViewDetails`. El diálogo de
 * detalle vive en `RfidMatchesView` (fuera de la fila) — ver el comentario en
 * `getRfidMatchColumns` para el porqué de este cambio respecto al resto de
 * módulos del proyecto (`PickingColumns`/`DispatchColumns`/`PackingColumns`),
 * que sí montan su diálogo aquí mismo.
 */
const ActionsCell = ({
  row,
  onViewDetails,
}: {
  row: RfidMatch;
  onViewDetails: (matchId: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetails(row.id) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones del ${row.nombre}`} />
    </div>
  );
};

// ── Avance ───────────────────────────────────────────────────────────────────

/**
 * Leído sobre esperado, con barra y —si aplica— el pendiente sin asignar.
 *
 * El NÚMERO grande sigue siendo `leido_total` (el total crudo escaneado,
 * igual que "Leído" en el diálogo de detalle) con el badge "N s/a" al lado
 * para dar contexto de cuántas de esas lecturas no resolvieron. La BARRA, en
 * cambio, usa `unidadesEmparejadas` —piezas que sí se ligaron a una línea
 * esperada, acotadas a lo que cada línea pedía— y su color usa
 * `isRfidMatchComplete`, la MISMA función que decide "cuadra" en el diálogo.
 *
 * Antes la barra usaba `leido_total` crudo para ambas cosas: escanear tags
 * que no resolvían a ninguna línea llenaba la barra en verde igual que un
 * conteo genuinamente cuadrado, contradiciendo lo que el propio diálogo de
 * detalle del MISMO registro reportaba ("no cuadra todavía").
 */
const AvanceCell = ({ row }: { row: RfidMatch }) => {
  const emparejadas = unidadesEmparejadas(row);
  const progreso =
    row.esperado_total > 0 ? Math.min(100, Math.round((emparejadas / row.esperado_total) * 100)) : 0;
  const completo = isRfidMatchComplete(row);

  return (
    <div className="min-w-32">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {row.leido_total}
          <span className="text-slate-400 dark:text-slate-500"> / {row.esperado_total}</span>
        </span>
        {row.sin_asignar_total > 0 && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {row.sin_asignar_total} s/a
          </span>
        )}
      </div>
      <div className="mt-1 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${progreso}%` }}
        />
      </div>
    </div>
  );
};

const columnHelper = createColumnHelper<RfidMatch>();

/**
 * Columnas del listado de encuadres. Fábrica —no un arreglo estático— porque
 * `ActionsCell` necesita `onViewDetails` para abrir el diálogo de detalle
 * DESDE `RfidMatchesView` (no ya montado aquí mismo, ver el comentario en
 * `ActionsCell`); mismo patrón `getXColumns(callback)` que
 * `getCustomerColumns`/`getStockColumns` en el resto del proyecto.
 *
 * A diferencia de esos otros módulos maqueta (`PickingColumns`/
 * `DispatchColumns`/`PackingColumns`), donde el diálogo de detalle es de solo
 * lectura y montarlo dentro de la fila es inocuo, aquí el diálogo puede MUTAR
 * el `estado` del propio registro ("Marcar aceptado en QA"). Si ese cambio
 * saca a la fila del conjunto filtrado de `DataTable` (p. ej. con el filtro
 * "Estatus: Pendiente" activo), la fila —y con ella el diálogo montado
 * adentro— se desmonta a mitad de la interacción, antes de que el operador
 * vea el resultado. Ninguno de los otros módulos golpea este caso porque
 * ninguno tiene una acción de detalle que cambie un campo filtrable.
 *
 * Los `accessorFn` que concatenan (orden de compra + proveedor) existen para
 * que la búsqueda global de `DataTable` —que solo recorre columnas ACCESSOR—
 * encuentre también el proveedor, aunque en el renglón se presente como dato
 * secundario. El `id` de esas columnas se conserva igual al campo crudo del
 * registro porque `filterConfig` lee `fila[id]`, no el valor del accessor.
 */
export const getRfidMatchColumns = (
  onViewDetails: (matchId: number) => void,
): ColumnDef<RfidMatch>[] => [
  columnHelper.accessor("nombre", {
    header: "Encuadre",
    size: 150,
    cell: (info) => (
      <div>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {info.getValue()}
        </span>
        <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
          {info.row.original.serie}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor(
    (row) => `${row.orden_compra} ${row.orden_compra_proveedor}`,
    {
      id: "orden_compra",
      header: "Orden de compra",
      cell: (info) => (
        <div className="min-w-0">
          <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
            {info.row.original.orden_compra}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {info.row.original.orden_compra_proveedor}
          </p>
        </div>
      ),
    },
  ),
  columnHelper.accessor("almacen", {
    header: "Almacén",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("estado", {
    header: "Estatus",
    size: 130,
    cell: (info) => <StatusBadge status={info.getValue()} config={RFID_MATCH_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("leido_total", {
    id: "avance",
    header: "Leído / Esperado",
    size: 170,
    cell: ({ row }) => <AvanceCell row={row.original} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} onViewDetails={onViewDetails} />,
  }),
] as ColumnDef<RfidMatch>[];
