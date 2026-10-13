import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ChevronRightIcon, DeleteIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { formatCurrency, NO_CURRENCY_FORMAT, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { getEstadoOportunidadCfg } from "../constants/opportunityChoices";
import { useOpportunityRowActionsContext } from "../hooks/useOpportunityRowActions";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { opportunityDetailHref } from "../utils/opportunityListQuery";
import {
  OpportunityClienteHeader,
  OpportunityTituloHeader,
  OpportunityVendedorHeader,
} from "./OpportunityHeaderFilters";

const columnHelper = createColumnHelper<Opportunity>();

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/**
 * Celda "Oportunidad", con el diseño del folio de Pedidos: punto de color del
 * ESTADO + título en negritas + flecha, sin fondo. El título es el DISPARADOR
 * del menú de fila ("Ver detalle", "Editar", "Dar de baja"), como el folio de Pedidos en Mesa
 * de Control (`OperationsOrderColumns`): no hay columna "Acciones" ni columna
 * "Estado" aparte.
 *
 * El estado no va solo en el color: el punto lleva `role="img"` con el nombre
 * del estado como `aria-label` y `title` (mismo recurso que el punto de
 * confirmación de "Mis pedidos"). El punto queda FUERA del botón: es
 * indicador, no parte de la acción.
 *
 * Solo presentacional — los callbacks llegan por contexto y los diálogos viven
 * en `OpportunityList`.
 */
function OpportunityTitleActions({ opportunity }: { opportunity: Opportunity }) {
  const { listQuery, onEdit, onDelete } = useOpportunityRowActionsContext();
  const titulo = opportunity.titulo?.trim();
  // `estado` es un valor del backend: uno fuera del catálogo cae al gris neutro
  // y se anuncia con su texto crudo (`getEstadoOportunidadCfg`).
  const estadoCfg = getEstadoOportunidadCfg(opportunity.estado);
  const estadoLabel = estadoCfg.label;

  const menuItems: ActionMenuItem[] = [
    // Enlace real (`href`): clic central y Ctrl+clic abren el detalle en otra
    // pestaña. Lleva el estado del listado para que "Volver" regrese a él.
    {
      label: "Ver detalle",
      icon: ViewIcon,
      href: opportunityDetailHref(opportunity.id, listQuery),
    },
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(opportunity) },
    { label: "Dar de baja", icon: DeleteIcon, onSelect: () => onDelete(opportunity) },
  ];

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${estadoCfg.dot}`}
        role="img"
        aria-label={estadoLabel}
        title={estadoLabel}
      />
      <ActionMenu
        items={menuItems}
        ariaLabel="Acciones de la oportunidad"
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de la oportunidad ${titulo || `#${opportunity.id}`}`}
            className="group inline-flex min-w-0 items-center gap-1 text-left text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {titulo ? (
              <span className="min-w-0 wrap-break-word">{titulo}</span>
            ) : (
              <span className={`italic font-medium ${MUTED_CLS}`}>Sin título</span>
            )}
            <ChevronRightIcon
              className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
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
 * - Sin columnas "Acciones" ni "Estado": el menú cuelga del título y el
 *   estado es el punto de color de esa misma celda (ver
 *   `OpportunityTitleActions`).
 */
export const opportunityColumns = [
  columnHelper.accessor("titulo", {
    id: "titulo",
    // Ordena por `titulo` y filtra por `estado`: el filtro vive en este
    // encabezado, como el de confirmación en el Folio de "Mis pedidos".
    meta: { label: "Oportunidad", serverSort: "titulo", serverFilter: "estado" },
    // Lleva el menú de fila, el estado y su filtro: ocultarla desde
    // "Mostrar/Ocultar" dejaría la fila sin acciones y el filtro sin control.
    enableHiding: false,
    header: ({ column }) => <OpportunityTituloHeader column={column} />,
    cell: ({ row }) => <OpportunityTitleActions opportunity={row.original} />,
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
