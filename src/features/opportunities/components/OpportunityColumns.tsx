import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { DeleteIcon, EditIcon, TraspasosIcon } from "@/src/components/Icons";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useOpportunityRowActionsContext } from "../hooks/useOpportunityRowActions";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { getOpportunityLabel } from "../utils/describeOpportunity";
import { getOpportunityClienteLabel } from "../utils/opportunityClienteLabel";
import { opportunityDetailHref } from "../utils/opportunityListQuery";
import { OpportunityEstadoBadge } from "./OpportunityEstadoBadge";
import {
  OpportunityClienteHeader,
  OpportunityTituloHeader,
  OpportunityVendedorHeader,
} from "./OpportunityHeaderFilters";

const columnHelper = createColumnHelper<Opportunity>();

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/**
 * Celda "Oportunidad": el título ES el menú de la fila (`FolioActionMenu`, modo
 * nombre), con "Ver detalle" como primera acción y enlace real (clic medio abre
 * otra pestaña), y debajo el badge del ESTADO —el estatus único de la
 * oportunidad, como el de "Mis pedidos" (EC-755)—. La etapa no se pinta aquí: es
 * informativa y vive en el detalle.
 *
 * Sin título, el nombre derivado (cliente, contacto o "#id") va atenuado y en
 * cursiva con "Sin título" en el tooltip (`derivedNameHint`).
 *
 * Solo presentacional — los callbacks llegan por contexto y los diálogos viven
 * en `OpportunityList`.
 */
function OpportunityTitleActions({ opportunity }: { opportunity: Opportunity }) {
  const { listQuery, onEdit, onDelete, onTransfer } = useOpportunityRowActionsContext();
  const { text, isTitulo } = getOpportunityLabel(opportunity);

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(opportunity) },
    ...(onTransfer
      ? [{ label: "Transferir", icon: TraspasosIcon, onSelect: () => onTransfer(opportunity) }]
      : []),
    { label: "Dar de baja", icon: DeleteIcon, onSelect: () => onDelete(opportunity) },
  ];

  return (
    <FolioActionMenu
      name={text}
      derivedNameHint={isTitulo ? undefined : "Sin título"}
      // Lleva el estado del listado para que "Volver" regrese a él.
      detail={{ href: opportunityDetailHref(opportunity.id, listQuery) }}
      items={items}
      status={<OpportunityEstadoBadge estado={opportunity.estado} />}
    />
  );
}

/**
 * Columnas del listado de oportunidades (tabla en MODO SERVIDOR).
 *
 * - `meta.serverSort` solo en campos que el backend ordena (ver
 *   `opportunitiesTable`): estado y vendedor no ordenan.
 * - `meta.serverFilter` liga el filtro del encabezado con el parámetro del
 *   endpoint; no hay `filterFn` porque nada se filtra en memoria.
 * - No dependen de nada que cambie: los callbacks del menú llegan por contexto.
 * - Sin columnas "Acciones" ni "Estado": el menú cuelga del título y el estado
 *   es el badge bajo él (ver `OpportunityTitleActions`).
 */
export const opportunityColumns = [
  columnHelper.accessor("titulo", {
    id: "titulo",
    // Ordena por `titulo` y filtra por `estado`: el filtro vive en este
    // encabezado, como el de estatus en el Folio de "Mis pedidos".
    meta: { label: "Oportunidad", serverSort: "titulo", serverFilter: "estado" },
    // Lleva el menú de fila, el estado y su filtro: ocultarla desde
    // "Mostrar/Ocultar" dejaría la fila sin acciones y el filtro sin control.
    enableHiding: false,
    header: ({ column }) => <OpportunityTituloHeader column={column} />,
    cell: ({ row }) => <OpportunityTitleActions opportunity={row.original} />,
  }),
  // El cliente por su razón social (EC-810, `getOpportunityClienteLabel`); el
  // contacto del cliente solo va en el detalle, donde hay espacio. Sin cliente,
  // el contacto que se capturó en la oportunidad.
  columnHelper.accessor((row) => getOpportunityClienteLabel(row) ?? row.nombre_contacto ?? "", {
    id: "cliente",
    meta: { label: "Cliente", serverFilter: "cliente", serverSort: "cliente__razon_social" },
    header: ({ column }) => <OpportunityClienteHeader column={column} />,
    cell: ({ row }) => {
      const clienteLabel = getOpportunityClienteLabel(row.original);
      if (clienteLabel) {
        return <span className="text-slate-700 dark:text-slate-200">{clienteLabel}</span>;
      }
      const contacto = row.original.nombre_contacto?.trim();
      return contacto ? (
        <div className="min-w-0">
          <div className="text-slate-700 dark:text-slate-200">{contacto}</div>
          <div className={`text-xs ${MUTED_CLS}`}>Sin cliente</div>
        </div>
      ) : (
        <span className={MUTED_CLS}>Sin cliente</span>
      );
    },
  }),
  columnHelper.accessor((row) => row.vendedor_nombre ?? "", {
    id: "vendedor",
    meta: { label: "Vendedor", serverFilter: "vendedor" },
    header: ({ column }) => <OpportunityVendedorHeader column={column} />,
    // `vendedor_nombre` puede llegar `""` (usuario sin nombre): igual que `null`.
    cell: (info) =>
      info.getValue().trim() ? (
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
        {formatCurrency(safeParseAmount(info.getValue()), null)}
      </span>
    ),
  }),
  // Mismo formato que "Creada" ("13 oct 2026", el de los listados de pedidos).
  // `proximo_contacto` es una fecha-calendario sin hora: se lee en UTC para que
  // no se corra un día en husos al oeste.
  columnHelper.accessor("proximo_contacto", {
    id: "proximo_contacto",
    header: "Próximo contacto",
    meta: { serverSort: "proximo_contacto" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
        {formatShortDate(info.getValue(), { timeZone: "UTC" })}
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
] as ColumnDef<Opportunity>[];
