import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { DeleteIcon, EditIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency, NO_CURRENCY_FORMAT, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate, formatShortDate } from "@/src/utils/formatDate";
import { ESTADO_OPORTUNIDAD_CFG } from "../constants/opportunityChoices";
import { useOpportunityRowActionsContext } from "../hooks/useOpportunityRowActions";
import type { Opportunity } from "../interfaces/opportunity.interface";
import {
  OpportunityClienteHeader,
  OpportunityEstadoHeader,
  OpportunityVendedorHeader,
} from "./OpportunityHeaderFilters";

const columnHelper = createColumnHelper<Opportunity>();

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/** Menú de fila: solo presentacional, los diálogos viven en `OpportunityList`. */
function OpportunityRowActionsMenu({ opportunity }: { opportunity: Opportunity }) {
  const { onEdit, onDelete } = useOpportunityRowActionsContext();

  const menuItems: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(opportunity) },
    { label: "Dar de baja", icon: DeleteIcon, onSelect: () => onDelete(opportunity) },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de la oportunidad" />
    </div>
  );
}

/**
 * Columnas del listado de oportunidades (tabla en MODO SERVIDOR).
 *
 * - `meta.serverSort` solo en campos reales del modelo (ver
 *   `opportunitiesTable`): estado, cliente y vendedor no ordenan.
 * - `meta.serverFilter` liga el filtro del encabezado con el parámetro del
 *   endpoint; no hay `filterFn` porque nada se filtra en memoria.
 * - No dependen de nada que cambie: los callbacks del menú llegan por contexto.
 */
export const opportunityColumns = [
  columnHelper.accessor("titulo", {
    id: "titulo",
    header: "Oportunidad",
    meta: { serverSort: "titulo" },
    cell: (info) => {
      const titulo = info.getValue()?.trim();
      return titulo ? (
        <span className="font-medium text-slate-700 dark:text-slate-200">{titulo}</span>
      ) : (
        <span className={`italic ${MUTED_CLS}`}>Sin título</span>
      );
    },
  }),
  // Cliente si lo hay; si no, el contacto capturado. `cliente_nombre` es el
  // nombre del cliente tal como lo manda el backend.
  columnHelper.accessor((row) => row.cliente_nombre ?? row.nombre_contacto ?? "", {
    id: "cliente",
    meta: { label: "Cliente / Contacto", serverFilter: "cliente" },
    header: ({ column }) => <OpportunityClienteHeader column={column} />,
    cell: ({ row }) => {
      const { cliente_nombre, nombre_contacto } = row.original;
      const contacto = nombre_contacto?.trim();
      if (cliente_nombre) {
        return (
          <div className="min-w-0">
            <div className="text-slate-700 dark:text-slate-200">{cliente_nombre}</div>
            {contacto && <div className={`text-xs ${MUTED_CLS}`}>{contacto}</div>}
          </div>
        );
      }
      return contacto ? (
        <div className="min-w-0">
          <div className="text-slate-700 dark:text-slate-200">{contacto}</div>
          <div className={`text-xs ${MUTED_CLS}`}>Sin cliente</div>
        </div>
      ) : (
        <span className={MUTED_CLS}>—</span>
      );
    },
  }),
  columnHelper.accessor((row) => row.vendedor_nombre ?? "", {
    id: "vendedor",
    meta: { label: "Vendedor", serverFilter: "vendedor" },
    header: ({ column }) => <OpportunityVendedorHeader column={column} />,
    cell: (info) =>
      info.getValue() ? (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ) : (
        <span className={MUTED_CLS}>Sin asignar</span>
      ),
  }),
  // Sin símbolo de moneda: las oportunidades no tienen moneda.
  columnHelper.accessor("monto_estimado", {
    id: "monto_estimado",
    header: "Monto estimado",
    meta: { align: "right", serverSort: "monto_estimado" },
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium tabular-nums">
        {formatCurrency(safeParseAmount(info.getValue()), NO_CURRENCY_FORMAT)}
      </span>
    ),
  }),
  columnHelper.accessor("estado", {
    id: "estado",
    meta: { label: "Estado", serverFilter: "estado" },
    header: ({ column }) => <OpportunityEstadoHeader column={column} />,
    cell: (info) => <StatusBadge status={info.getValue()} config={ESTADO_OPORTUNIDAD_CFG} />,
  }),
  columnHelper.accessor("proximo_contacto", {
    id: "proximo_contacto",
    header: "Próximo contacto",
    meta: { serverSort: "proximo_contacto" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
        {formatLocalDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("created_at", {
    id: "created_at",
    header: "Creada",
    meta: { serverSort: "created_at" },
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formatShortDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    meta: { align: "center" },
    cell: ({ row }) => <OpportunityRowActionsMenu opportunity={row.original} />,
  }),
] as ColumnDef<Opportunity>[];
