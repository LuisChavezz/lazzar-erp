import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { Shift } from "../interfaces/shift.interface";
import { trimTimeToHHMM } from "../utils/shiftTime";
import { useShiftRowActionsContext } from "../hooks/useShiftRowActions";

const columnHelper = createColumnHelper<Shift>();

interface ShiftColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; el diálogo vive en `ShiftList`. Sin "Ver detalle": los turnos no
 * tienen vista de detalle.
 */
const ShiftNameCell = ({ shift, permissions }: { shift: Shift; permissions: ShiftColumnPermissions }) => {
  const { onEdit, onDeactivate, busyIds } = useShiftRowActionsContext();

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre turnos activos — sobre
  // uno inactivo sería un no-op.
  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(shift), visible: permissions.canEdit },
    {
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => onDeactivate(shift),
      disabled: busyIds.includes(shift.id),
      visible: permissions.canDelete && shift.activo,
    },
  ];

  return <FolioActionMenu name={shift.nombre} items={items} active={shift.activo} />;
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `ShiftRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: ShiftColumnPermissions) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      size: 240,
      cell: ({ row }) => <ShiftNameCell shift={row.original} permissions={permissions} />,
    }),
    // Las horas llegan como "HH:MM:SS"; en la tabla sobran los segundos.
    columnHelper.accessor((row) => trimTimeToHHMM(row.hora_entrada), {
      id: "hora_entrada",
      header: "Entrada",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => trimTimeToHHMM(row.hora_salida), {
      id: "hora_salida",
      header: "Salida",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("dias_laborales", {
      header: "Días",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
  ] as ColumnDef<Shift>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto). Entrada y salida filtran por cada
 * hora `HH:MM` que aparece en las filas (`distinct`): no hay spec de hora del
 * día, y unos cuantos turnos comparten pocas horas, así que la lista es corta
 * y en orden (`"07:00"` < `"14:00"` también como texto). Los días filtran por
 * la cadena guardada tal cual: el backend la compara completa, y un valor
 * heredado ("L,M,M,J,V") es otro valor distinto, igual que en su filtro.
 */
export const SHIFT_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<Shift>>> = {
  nombre: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  hora_entrada: { type: "distinct", get: (r) => trimTimeToHHMM(r.hora_entrada) },
  hora_salida: { type: "distinct", get: (r) => trimTimeToHHMM(r.hora_salida) },
  dias_laborales: { type: "distinct", get: (r) => r.dias_laborales },
};
