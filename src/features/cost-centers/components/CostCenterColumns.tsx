import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, CheckCircleIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import type { CostCenter } from "../interfaces/cost-center.interface";

const columnHelper = createColumnHelper<CostCenter>();

/**
 * Columnas del catálogo de centros de costo.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos (detalle, edición y la
 * confirmación de baja/reactivación) viven en `CostCenterList`. Una celda se
 * desmonta al ordenar, filtrar o paginar, y el toggle cambia `activo`, que es
 * justo uno de los filtros de la tabla.
 *
 * NO hay acción de eliminar: el `DELETE` del backend es la MISMA baja lógica que
 * el toggle —pone `activo=false` y la fila permanece—, así que ofrecer ambos
 * sería presentar dos acciones para un solo efecto. `activo` es el único control
 * de ciclo de vida (ver `setCostCenterActivo`).
 */
export const getColumns = (
  onViewDetail: (centro: CostCenter) => void,
  onEdit: (centro: CostCenter) => void,
  onToggleActivo: (centro: CostCenter) => void,
) => {
  const columns = [
    // Los campos de texto usan accessor de FUNCIÓN colapsando el vacío a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y un `null` (`typeof null === "object"`) la sacaría de la
    // búsqueda en TODAS. `codigo` y `nombre` pueden llegar vacíos en registros
    // antiguos y `descripcion` es nullable de verdad en el modelo.
    columnHelper.accessor((row) => row.codigo ?? "", {
      id: "codigo",
      header: "Código",
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {info.getValue() || `#${info.row.original.id}`}
        </button>
      ),
    }),
    columnHelper.accessor((row) => row.nombre ?? "", {
      id: "nombre",
      header: "Nombre",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.descripcion ?? "", {
      id: "descripcion",
      header: "Descripción",
      cell: (info) => (
        <span
          className="block max-w-xs truncate text-xs text-slate-500 dark:text-slate-400"
          // El texto libre puede ser largo: se recorta en la celda y el valor
          // completo queda en el `title` y en el diálogo de detalle.
          title={info.getValue() || undefined}
        >
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const centro = row.original;
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(centro),
          },
          { label: "Editar", icon: EditIcon, onSelect: () => onEdit(centro) },
          {
            // La etiqueta cambia con el estatus de la fila: una sola acción que
            // recorre el ciclo de vida en los dos sentidos.
            label: centro.activo ? "Dar de baja" : "Reactivar",
            icon: centro.activo ? BanIcon : CheckCircleIcon,
            onSelect: () => onToggleActivo(centro),
          },
        ];

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<CostCenter>[];

  return columns;
};
