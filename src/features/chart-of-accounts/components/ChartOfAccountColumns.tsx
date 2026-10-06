import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { BanIcon, CheckCircleIcon, ChevronRightIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { CUENTA_CONTABLE_TIPO_CONFIG } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";

const columnHelper = createColumnHelper<CuentaContable>();

const ACTIVO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: ACTIVO_INACTIVO_CFG.activo.dot },
  { value: "false", label: "Inactivo", dotClassName: ACTIVO_INACTIVO_CFG.inactivo.dot },
];

const activoFilterFn: FilterFn<CuentaContable> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

const TIPO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(CUENTA_CONTABLE_TIPO_CONFIG).map(([tipo, cfg]) => ({
    value: tipo,
    label: cfg.label ?? tipo,
    dotClassName: cfg.dot,
  })),
];

const tipoFilterFn: FilterFn<CuentaContable> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.tipo === filterValue;
};

const MOVIMIENTOS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Acepta", dotClassName: "bg-emerald-500" },
  { value: "false", label: "Agrupación", dotClassName: "bg-slate-400" },
];

const movimientosFilterFn: FilterFn<CuentaContable> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.acepta_movimientos) === filterValue;
};

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
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Código</span>
          <ColumnHeaderFilter column={column} options={ACTIVO_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: activoFilterFn,
      cell: (info) => {
        const cuenta = info.row.original;
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

        const codigo = info.getValue() || `#${cuenta.id}`;
        const statusCfg = cuenta.activo ? ACTIVO_INACTIVO_CFG.activo : ACTIVO_INACTIVO_CFG.inactivo;
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} aria-hidden="true" />
            <span className="sr-only">{statusCfg.label}</span>
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones de la cuenta ${codigo}`}
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
    columnHelper.accessor("tipo", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Tipo</span>
          <ColumnHeaderFilter column={column} options={TIPO_FILTER_OPTIONS} label="tipo" />
        </div>
      ),
      filterFn: tipoFilterFn,
      cell: (info) => {
        const tipo = info.getValue();
        const cfg = CUENTA_CONTABLE_TIPO_CONFIG[tipo];
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg?.dot ?? "bg-slate-400"}`} title={cfg?.label ?? tipo} aria-hidden="true" />
            <span className="text-slate-600 dark:text-slate-300">{cfg?.label ?? tipo}</span>
          </div>
        );
      },
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
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Movimientos</span>
          <ColumnHeaderFilter column={column} options={MOVIMIENTOS_FILTER_OPTIONS} label="movimientos" />
        </div>
      ),
      filterFn: movimientosFilterFn,
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
  ] as ColumnDef<CuentaContable>[];

  return columns;
};
