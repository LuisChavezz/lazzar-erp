import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { BanIcon, CheckCircleIcon, ChevronRightIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import type { CostCenter } from "../interfaces/cost-center.interface";

const columnHelper = createColumnHelper<CostCenter>();

const ACTIVO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: ACTIVO_INACTIVO_CFG.activo.dot },
  { value: "false", label: "Inactivo", dotClassName: ACTIVO_INACTIVO_CFG.inactivo.dot },
];

const activoFilterFn: FilterFn<CostCenter> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

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
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Código</span>
          <ColumnHeaderFilter column={column} options={ACTIVO_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: activoFilterFn,
      cell: (info) => {
        const centro = info.row.original;
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

        const codigo = info.getValue() || `#${centro.id}`;
        const statusCfg = centro.activo ? ACTIVO_INACTIVO_CFG.activo : ACTIVO_INACTIVO_CFG.inactivo;
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} aria-hidden="true" />
            <span className="sr-only">{statusCfg.label}</span>
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones del centro de costo ${codigo}`}
              align="start"
              trigger={
                <button type="button" title="Ver acciones" className="group inline-flex items-center gap-1 cursor-pointer">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {codigo}
                  </span>
                  <ChevronRightIcon
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </button>
              }
            />
          </div>
        );
      },
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
  ] as ColumnDef<CostCenter>[];

  return columns;
};
