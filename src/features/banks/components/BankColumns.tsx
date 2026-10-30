import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon, CheckCircleIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { Banco } from "../interfaces/bank.interface";
import { useBankRowActionsContext } from "../hooks/useBankRowActions";

const columnHelper = createColumnHelper<Banco>();

/** Texto con que la fila se nombra: el backend admite un banco sin nombre ni código. */
export const getBankLabel = (banco: Banco): string =>
  banco.nombre || banco.codigo || `#${banco.id}`;

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; la confirmación vive en `BankList`. Sin "Ver detalle": los bancos
 * no tienen vista de detalle.
 *
 * NO hay acción de eliminar: el DELETE del backend es un borrado FÍSICO, no
 * una baja lógica. `activo` es el único control de ciclo de vida.
 */
const BankNameCell = ({ banco }: { banco: Banco }) => {
  const { onEdit, onToggleActivo, busyIds } = useBankRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(banco) },
    {
      label: banco.activo ? "Desactivar" : "Activar",
      icon: banco.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(banco),
      disabled: busyIds.includes(banco.id),
    },
  ];

  return <FolioActionMenu name={getBankLabel(banco)} items={items} active={banco.activo} />;
};

/**
 * No dependen de nada: callbacks y "en vuelo" llegan al menú por
 * `BankRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = () => {
  const columns = [
    columnHelper.accessor((row) => row.nombre ?? "", {
      id: "nombre",
      header: "Nombre",
      size: 240,
      cell: ({ row }) => <BankNameCell banco={row.original} />,
    }),
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("swift", {
      header: "SWIFT",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("observaciones", {
      header: "Observaciones",
      cell: (info) => {
        const value = info.getValue();
        return (
          // `observaciones` es un TextField sin tope de longitud: se recorta a
          // una línea para no descuadrar la fila y el texto completo queda en el
          // `title`.
          <span
            className="block max-w-xs truncate text-slate-500 dark:text-slate-400"
            title={value ?? undefined}
          >
            {value || "—"}
          </span>
        );
      },
    }),
  ] as ColumnDef<Banco>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto), con ficha "Registro: …". Código,
 * SWIFT y observaciones no llevan filtro: los cubre la búsqueda.
 */
export const BANK_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<Banco>>> = {
  nombre: { type: "boolean", filterLabel: "registro", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
};
