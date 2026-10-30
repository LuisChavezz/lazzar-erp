import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { BanIcon, CheckCircleIcon, EditIcon } from "@/src/components/Icons";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { useCostCenterRowActionsContext } from "../hooks/useCostCenterRowActions";

const columnHelper = createColumnHelper<CostCenter>();

/** Texto con que la fila se nombra: `nombre` y `codigo` pueden llegar vacíos en registros antiguos. */
export const getCostCenterLabel = (centro: CostCenter): string =>
  centro.nombre || centro.codigo || `#${centro.id}`;

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; los diálogos (detalle, edición y la confirmación de
 * baja/reactivación) viven en `CostCenterList`.
 *
 * NO hay acción de eliminar: el `DELETE` del backend es la MISMA baja lógica que
 * el toggle —pone `activo=false` y la fila permanece—, así que ofrecer ambos
 * sería presentar dos acciones para un solo efecto. `activo` es el único control
 * de ciclo de vida (ver `setCostCenterActivo`).
 */
const CostCenterNameCell = ({ centro }: { centro: CostCenter }) => {
  const { onViewDetail, onEdit, onToggleActivo, busyIds } = useCostCenterRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(centro) },
    {
      // La etiqueta cambia con el estatus de la fila: una sola acción que
      // recorre el ciclo de vida en los dos sentidos.
      label: centro.activo ? "Dar de baja" : "Reactivar",
      icon: centro.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(centro),
      disabled: busyIds.includes(centro.id),
    },
  ];

  return (
    <FolioActionMenu
      name={getCostCenterLabel(centro)}
      detail={{ onSelect: () => onViewDetail(centro) }}
      items={items}
      active={centro.activo}
    />
  );
};

/**
 * Columnas del catálogo de centros de costo. No dependen de nada: callbacks y
 * "en vuelo" llegan al menú por `CostCenterRowActionsProvider`, así una acción
 * no remonta las celdas.
 */
export const getColumns = () => {
  const columns = [
    // Los campos de texto usan accessor de FUNCIÓN colapsando el vacío a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y un `null` (`typeof null === "object"`) la sacaría de la
    // búsqueda en TODAS. `codigo` y `nombre` pueden llegar vacíos en registros
    // antiguos y `descripcion` es nullable de verdad en el modelo.
    columnHelper.accessor((row) => row.nombre ?? "", {
      id: "nombre",
      header: "Nombre",
      size: 260,
      cell: ({ row }) => <CostCenterNameCell centro={row.original} />,
    }),
    columnHelper.accessor((row) => row.codigo ?? "", {
      id: "codigo",
      header: "Código",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
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

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto), con ficha "Estatus: …". Código y
 * descripción no llevan filtro: son casi únicos por fila, los cubre la búsqueda.
 */
export const COST_CENTER_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<CostCenter>>> = {
  nombre: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
};
