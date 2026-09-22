import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, CheckCircleIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { CUENTA_CONTABLE_TIPO_CONFIG } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";

const columnHelper = createColumnHelper<CuentaContable>();

/**
 * Columnas del plan de cuentas.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos (detalle, edición y la
 * confirmación de activar/desactivar) viven en `ChartOfAccountList`. Una celda se
 * desmonta al ordenar, filtrar o paginar, y el toggle cambia `activo`, que es
 * justo uno de los filtros de la tabla.
 *
 * NO hay acción de eliminar: el DELETE del backend es físico y `cuenta_padre` es
 * `PROTECT`. `activo` es el único control de ciclo de vida.
 */
export const getColumns = (
  onViewDetail: (cuenta: CuentaContable) => void,
  onEdit: (cuenta: CuentaContable) => void,
  onToggleActivo: (cuenta: CuentaContable) => void,
) => {
  const columns = [
    // Los campos de texto usan accessor de FUNCIÓN colapsando el vacío a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y un `null` (`typeof null === "object"`) la sacaría de la
    // búsqueda en TODAS. `codigo` puede llegar vacío en registros antiguos.
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
    columnHelper.accessor("tipo", {
      header: "Tipo",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={CUENTA_CONTABLE_TIPO_CONFIG} />
      ),
    }),
    columnHelper.accessor("nivel", {
      header: "Nivel",
      meta: { align: "center" },
      cell: (info) => (
        <div className="tabular-nums text-slate-500 dark:text-slate-400">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("acepta_movimientos", {
      header: "Movimientos",
      cell: (info) => (
        <span
          className="text-xs text-slate-500 dark:text-slate-400"
          // Una cuenta de agrupación no recibe asientos: solo suma a sus hijas.
          title={
            info.getValue()
              ? "Admite asientos directos en una póliza"
              : "Cuenta de agrupación: no recibe asientos"
          }
        >
          {info.getValue() ? "Acepta" : "Agrupación"}
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
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => {
        const cuenta = row.original;
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(cuenta),
          },
          { label: "Editar", icon: EditIcon, onSelect: () => onEdit(cuenta) },
          {
            label: cuenta.activo ? "Desactivar" : "Activar",
            icon: cuenta.activo ? BanIcon : CheckCircleIcon,
            onSelect: () => onToggleActivo(cuenta),
          },
        ];

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<CuentaContable>[];

  return columns;
};
