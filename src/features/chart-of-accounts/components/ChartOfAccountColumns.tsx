import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { BanIcon, CheckCircleIcon, EditIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { CUENTA_CONTABLE_TIPO_CONFIG } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import { useChartOfAccountRowActionsContext } from "../hooks/useChartOfAccountRowActions";

const columnHelper = createColumnHelper<CuentaContable>();

/** Texto con que la fila se nombra: `nombre` y `codigo` pueden llegar vacíos en registros antiguos. */
export const getChartOfAccountLabel = (cuenta: CuentaContable): string =>
  cuenta.nombre || cuenta.codigo || `#${cuenta.id}`;

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; los diálogos (detalle, edición y la confirmación de
 * activar/desactivar) viven en `ChartOfAccountList`.
 *
 * NO hay acción de eliminar: el DELETE del backend es físico y `cuenta_padre` es
 * `PROTECT`. `activo` es el único control de ciclo de vida.
 */
const ChartOfAccountNameCell = ({ cuenta }: { cuenta: CuentaContable }) => {
  const { onViewDetail, onEdit, onToggleActivo, busyIds } = useChartOfAccountRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(cuenta) },
    {
      label: cuenta.activo ? "Desactivar" : "Activar",
      icon: cuenta.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(cuenta),
      disabled: busyIds.includes(cuenta.id),
    },
  ];

  return (
    <FolioActionMenu
      name={getChartOfAccountLabel(cuenta)}
      detail={{ onSelect: () => onViewDetail(cuenta) }}
      items={items}
      active={cuenta.activo}
    />
  );
};

/**
 * Columnas del plan de cuentas. No dependen de nada: callbacks y "en vuelo"
 * llegan al menú por `ChartOfAccountRowActionsProvider`, así una acción no
 * remonta las celdas.
 */
export const getColumns = () => {
  const columns = [
    // Los campos de texto usan accessor de FUNCIÓN colapsando el vacío a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y un `null` (`typeof null === "object"`) la sacaría de la
    // búsqueda en TODAS. `codigo` y `nombre` pueden llegar vacíos en registros
    // antiguos.
    columnHelper.accessor((row) => row.nombre ?? "", {
      id: "nombre",
      header: "Nombre",
      size: 280,
      cell: ({ row }) => <ChartOfAccountNameCell cuenta={row.original} />,
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
    columnHelper.accessor("tipo", {
      header: "Tipo",
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
  ] as ColumnDef<CuentaContable>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El nombre filtra por `activo` (su punto), con ficha "Registro: …".
 * - El tipo es un enum del backend: su catálogo completo, en orden, aunque
 *   ningún renglón lo tenga, y al final cualquier valor que el catálogo no cubra.
 * - Movimientos es un booleano, con las mismas etiquetas que la celda.
 * Código y nivel no llevan filtro: el código es único y el nivel lo ordena la
 * columna.
 */
export const CHART_OF_ACCOUNT_HEADER_FILTERS: Partial<
  Record<string, HeaderFilterSpec<CuentaContable>>
> = {
  nombre: { type: "boolean", filterLabel: "registro", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  tipo: { type: "options", get: (r) => r.tipo, options: optionsFromConfig(CUENTA_CONTABLE_TIPO_CONFIG) },
  acepta_movimientos: {
    type: "boolean",
    get: (r) => r.acepta_movimientos,
    yes: "Acepta",
    no: "Agrupación",
  },
};
