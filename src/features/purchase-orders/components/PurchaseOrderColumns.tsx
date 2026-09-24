"use client";

import { useState } from "react";
import { ColumnDef, Column, createColumnHelper } from "@tanstack/react-table";
import { DropdownMenu } from "@radix-ui/themes";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import type { DataTableFilterOption } from "@/src/components/DataTable";
import {
  CheckCircleIcon,
  CloseIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  FilterIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { useConfirmPurchaseOrder } from "../hooks/useConfirmPurchaseOrder";
import { useDeletePurchaseOrder } from "../hooks/useDeletePurchaseOrder";
import { useSendPurchaseOrderEmail } from "../hooks/useSendPurchaseOrderEmail";
import { useDownloadPurchaseOrderPdf } from "../hooks/useDownloadPurchaseOrderPdf";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderCancellable,
  isPurchaseOrderEditable,
  purchaseOrderStatusEntry,
} from "../constants/purchaseOrderStatus";

const columnHelper = createColumnHelper<PurchaseOrder>();

// ── Celda de acciones ─────────────────────────────────────────────────────────

/**
 * Menú de acciones de la fila.
 *
 * Navegación, edición y cancelación se DELEGAN a la vista (`onViewDetails` /
 * `onEdit` / `onCancel`): sus destinos —una página de detalle y dos diálogos
 * de formulario— deben sobrevivir a que la celda se desmonte al ordenar,
 * paginar o filtrar. Cancelar en particular CAMBIA el estatus de la fila, así
 * que el refetch puede sacarla de una vista filtrada con el diálogo abierto.
 *
 * Confirmar y Eliminar sí se resuelven aquí, con su `ConfirmDialog` y su hook:
 * son mutaciones inmediatas sobre ESTA fila, no un estado que deba sobrevivirle.
 * Mismo reparto que `AreaColumns` y el resto de los catálogos. Enviar correo y
 * Descargar PDF no abren nada — son `mutate(id)` directos.
 */
const ActionsCell = ({
  order,
  onViewDetails,
  onEdit,
  onCancel,
}: {
  order: PurchaseOrder;
  onViewDetails: (id: number) => void;
  onEdit: (order: PurchaseOrder) => void;
  onCancel: (order: PurchaseOrder) => void;
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: confirmOrder, isPending } = useConfirmPurchaseOrder();
  const { mutate: deleteOrder, isPending: isDeletePending } = useDeletePurchaseOrder();
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendPurchaseOrderEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadPurchaseOrderPdf();

  // Cómo se nombra la orden en el `aria-label` del menú y en el texto de los
  // diálogos de confirmación. `folio` puede ser `null` —y precisamente en las
  // órdenes EDITABLES, que son las que ven estos diálogos—, así que sin el
  // respaldo salía literalmente "la orden de compra null".
  const orderLabel = order.folio ?? `#${order.id}`;

  // Borrador o pendiente: la orden aún no se autoriza, así que puede
  // editarse, confirmarse o eliminarse. Autorizada en adelante, ninguna de
  // las tres debe quedar disponible.
  const editable = isPurchaseOrderEditable(order.estatus);

  // Borrador, pendiente o autorizada: la orden puede cancelarse (queda en
  // estatus 6 con su motivo). Es una acción DISTINTA de eliminar.
  const cancellable = isPurchaseOrderCancellable(order.estatus);

  // El envío al proveedor requiere un correo. `proveedor_correo` ya viene
  // SIEMPRE en el listado (el serializer lo expone tanto en list como en
  // retrieve), así que `null`/`""` significa literalmente "el proveedor no
  // tiene correo capturado" y la acción se puede ocultar sin ambigüedad.
  const supplierHasNoEmail = !order.proveedor_correo;

  // Solo se envía/descarga la orden una vez autorizada (o más avanzada): antes de
  // eso todavía puede editarse/cancelarse, así que no debe salir un documento en
  // firme. Cuando la condición no se cumple, la acción se OCULTA por completo
  // (igual que Editar/Confirmar/Cancelar), no se muestra deshabilitada.
  const isAuthorizedOrBeyond = isPurchaseOrderAuthorizedOrComplete(order.estatus);

  // La visibilidad de importes NO se comprueba aquí, aunque correo/PDF/edición
  // la necesiten: `order` es una fila del LISTADO, y el backend aplica su filtro
  // de contabilidad SOLO en el retrieve (`compras/api/views.py`,
  // `filtrar_campos_contabilidad_orden_compra` cuelga de `retrieve()`, no de
  // `list()`), así que en el listado `gran_total` SIEMPRE viene presente. Un
  // `order.gran_total !== undefined` aquí sería permanentemente `true` —código
  // muerto que aparentaba proteger sin proteger—. La guarda real vive donde el
  // detalle SÍ está filtrado: los hooks de correo/PDF (`canSeeAmounts` tras su
  // `fetchQuery`) y el wizard de edición (`PurchaseOrderEditStepManager`).

  // "Enviar correo" requiere además un correo del proveedor al que enviar.
  const canSendEmail = isAuthorizedOrBeyond && !supplierHasNoEmail;

  // "Descargar PDF" NO necesita correo del proveedor (es una acción local: el
  // documento puede imprimirse o compartirse a mano), así que solo se condiciona
  // a la autorización.
  const canDownloadPdf = isAuthorizedOrBeyond;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => onViewDetails(order.id),
    },
  ];

  if (editable) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(order),
      // `ActionMenu` filtra por `permission` con `hasPermission` (que ya
      // cortocircuita para "admin"). `editable` sigue siendo la regla de
      // NEGOCIO (estatus de la orden); esto es la de PERMISOS — se exigen
      // ambas.
      permission: "E-COMPRAS-OC",
    });
    // "Editar" NO se restringe por importes aquí, por el mismo motivo que
    // correo/PDF: esto es una fila de listado, sin filtrar. La pérdida de
    // precios que podría causar un rol sin visibilidad financiera se bloquea
    // dentro del wizard (`PurchaseOrderEditStepManager`), que sí trabaja con el
    // detalle filtrado.
    // `A-COMPRAS-OC` es el código de AUTORIZACIÓN del catálogo, distinto del de
    // edición: confirmar una orden la autoriza, no la modifica. `editable`
    // sigue siendo la regla de NEGOCIO (estatus) — se exigen ambas. Mismo
    // patrón que `A-MESACONTROL-COTI` en `OperationsQuoteColumns`.
    menuItems.push({
      label: "Confirmar",
      icon: CheckCircleIcon,
      onSelect: () => setIsConfirmOpen(true),
      permission: "A-COMPRAS-OC",
      // Cross-guard: no permitir confirmar mientras se elimina la misma
      // orden (y viceversa, ver "Eliminar" abajo) — ambas mutaciones no
      // deben poder correr en paralelo sobre la misma orden.
      disabled: isPending || isDeletePending,
    });
  }

  if (cancellable) {
    // Cancelar ANULA la orden sin borrarla: queda visible con estatus 6 y su
    // motivo. Lo pide `A-COMPRAS-OC` (el mismo código que autoriza): anular
    // una orden es una decisión sobre su autorización, no una edición.
    menuItems.push({
      label: "Cancelar",
      icon: CloseIcon,
      onSelect: () => onCancel(order),
      permission: "A-COMPRAS-OC",
      disabled: isPending || isDeletePending,
    });
  }

  if (editable) {
    // Eliminar BORRA un error de captura (DELETE). Solo borrador/pendiente; el
    // backend además lo rechaza si ya hay recepciones o facturas.
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isDeletePending || isPending,
      permission: "D-COMPRAS-OC",
    });
  }

  if (canSendEmail) {
    menuItems.push({
      label: isSendingEmail ? "Enviando..." : "Enviar correo",
      icon: EmailIcon,
      onSelect: () => sendEmail(order.id),
      // In-flight guard: evita doble envío o solaparse con la descarga.
      // `keepOpenOnSelect` deja el menú abierto para ver el estado "Enviando...".
      disabled: isSendingEmail || isDownloadingPdf,
      keepOpenOnSelect: true,
    });
  }

  if (canDownloadPdf) {
    menuItems.push({
      label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
      icon: DownloadIcon,
      onSelect: () => downloadPdf(order.id),
      // In-flight guard: evita doble descarga o solaparse con el envío.
      // `keepOpenOnSelect` deja el menú abierto para ver el estado "Generando PDF...".
      disabled: isDownloadingPdf || isSendingEmail,
      keepOpenOnSelect: true,
    });
  }

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la orden ${orderLabel}`} />
      {editable && (
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Confirmar Orden de Compra"
          description={`¿Estás seguro de que deseas confirmar la orden de compra ${orderLabel}? Esta acción no se puede deshacer.`}
          confirmText={isPending ? "Confirmando..." : "Confirmar"}
          confirmColor="blue"
          onConfirm={() => {
            confirmOrder(order.id);
            setIsConfirmOpen(false);
          }}
        />
      )}
      {editable && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Orden de Compra"
          description={`¿Estás seguro de que deseas eliminar la orden de compra ${orderLabel}? Esta acción no se puede deshacer.`}
          confirmText={isDeletePending ? "Eliminando..." : "Eliminar"}
          // "Volver" y no el "Cancelar" por defecto: "Cancelar" es también
          // una acción del menú de esta fila (anular la orden).
          cancelText="Volver"
          confirmColor="red"
          onConfirm={() => {
            deleteOrder(order.id);
            setIsDeleteOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ── Filtro por columna (encabezado) ─────────────────────────────────────────

/**
 * Encabezado de columna con su propio filtro (estilo hoja de cálculo): un
 * ícono de embudo junto al título abre un desplegable con los valores
 * distintos de la columna. Reemplaza el panel de filtros tipo "chips" que
 * vivía en la barra de herramientas (`filterConfig` de `DataTable`) — el
 * usuario lo pidió así por ser el patrón al que está acostumbrado.
 *
 * Se apoya en el `columnFilters` NATIVO de TanStack, que `DataTable` ya deja
 * cableado (`state.columnFilters`, `onColumnFiltersChange`,
 * `getFilteredRowModel`) pero sin UI propia porque ninguno de sus 55+
 * consumidores lo usaba — así que esto vive enteramente en las columnas de
 * ESTA tabla, sin tocar el componente compartido. `e.stopPropagation()` en el
 * botón evita que el clic también dispare el `onClick` de ordenamiento que
 * `DataTable` pone en el `<th>` completo.
 */
const ColumnFilterHeader = ({
  label,
  options,
  column,
}: {
  label: string;
  options: DataTableFilterOption[];
  column: Column<PurchaseOrder, unknown>;
}) => {
  const activeValue = column.getFilterValue() as string | undefined;

  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Filtrar por ${label}`}
            title={activeValue ? "Filtro activo" : `Filtrar por ${label}`}
            className={`p-1 rounded cursor-pointer transition-colors ${
              activeValue
                ? "text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/20"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <FilterIcon className="w-3 h-3" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="start"
          onClick={(e) => e.stopPropagation()}
          className="bg-white! dark:bg-zinc-900! min-w-40 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1 normal-case tracking-normal font-normal"
        >
          <DropdownMenu.Item
            onSelect={() => column.setFilterValue(undefined)}
            className={`flex items-center px-3 py-2 text-xs rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ${
              activeValue
                ? "text-slate-600 dark:text-slate-300"
                : "text-sky-600 dark:text-sky-400"
            }`}
          >
            Todos
          </DropdownMenu.Item>
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => column.setFilterValue(opt.value)}
              className={`flex items-center px-3 py-2 text-xs rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ${
                opt.value === activeValue
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

/** Filtro EXACTO (no substring) por un campo del `row.original` — el valor de la
 * columna en pantalla (folio+referencia, nombre del proveedor…) no es el que
 * se compara; el desplegable filtra por el campo crudo que indique `pick`. */
const exactFilterFn =
  <K extends keyof PurchaseOrder>(pick: (row: PurchaseOrder) => PurchaseOrder[K]) =>
  (row: { original: PurchaseOrder }, _columnId: string, filterValue: string) => {
    if (!filterValue) return true;
    return String(pick(row.original)) === filterValue;
  };

/**
 * Columnas del listado de órdenes de compra (`GET /compras/ordenes/`).
 *
 * Fábrica —no un arreglo estático— porque el folio y la acción "Ver Detalles"
 * navegan a la página de detalle, y "Editar" abre el diálogo de edición que
 * vive en `PurchaseOrderView`. Mismo patrón `getXColumns(callbacks)` que
 * `CorteMangaOrderColumns` (navegación) y `AreaColumns` (edición).
 *
 * Contenido pedido por negocio: O.C. (folio + estatus + referencia, ver
 * abajo), Proveedor, Fecha OC, Cantidad, Vencimiento, Progreso OC (surtido
 * vs. solicitado, ver `ProgresoCell`). Los importes (Total/Subtotal/Impuestos)
 * y "Entrega estimada" salieron del listado a propósito — siguen disponibles
 * en el detalle de la orden.
 *
 * `statusOptions`/`supplierOptions` alimentan los filtros de encabezado de
 * O.C. (por estatus) y Proveedor — construidos en `PurchaseOrdersFilter.tsx`
 * a partir del listado completo, porque esta fábrica no lo recibe.
 */
export const getColumns = (
  onViewDetails: (id: number) => void,
  onEdit: (order: PurchaseOrder) => void,
  onCancel: (order: PurchaseOrder) => void,
  statusOptions: DataTableFilterOption[],
  supplierOptions: DataTableFilterOption[],
) => {
  const columns = [
    // ── O.C. ───────────────────────────────────────────────────────────────
    // Folio, estatus y referencia consolidados en UNA columna (antes tres) para
    // dejarle sitio a Solicitadas/Surtidas/Restantes/Comentarios sin abarrotar
    // la tabla:
    //  - el estatus se reduce a un punto de color (mismo `dot` que usa
    //    `StatusBadge`) junto al folio, con la etiqueta accesible por `title`
    //    y `sr-only` — el color solo no debe ser la única señal;
    //  - la referencia baja a una mini-pill gris debajo del folio, y se omite
    //    por completo cuando la orden no trae una (no hay "—" decorativo);
    //  - el `accessorFn` concatena folio+referencia (con `?? ""` por el mismo
    //    motivo de búsqueda global que el resto de campos nullable de esta
    //    tabla) para que el buscador ("Buscar orden, folio o
    //    referencia...") siga encontrando por cualquiera de los dos, aunque
    //    el `cell` pinte su propio layout a partir de `row.original`;
    //  - el filtro de encabezado filtra por ESTATUS (`exactFilterFn`, sobre
    //    `row.original.estatus`), no por el valor del `accessorFn` — es el
    //    campo que vive visualmente en esta columna (el punto de color).
    columnHelper.accessor(
      (row) => `${row.folio ?? ""} ${row.referencia ?? ""}`.trim(),
      {
        id: "folio",
        // `meta.label` es lo que lee `DataTable` (menú "Mostrar/Ocultar" y la
        // exportación CSV/PDF) para nombrar la columna: su `header` es una
        // función (el filtro de encabezado), no un string, así que sin esto
        // caería al `id` crudo ("Folio") en vez de "O.C.".
        meta: { label: "O.C." },
        header: ({ column }) => (
          <ColumnFilterHeader label="O.C." options={statusOptions} column={column} />
        ),
        filterFn: exactFilterFn((row) => row.estatus),
        cell: ({ row }) => {
          const cfg = purchaseOrderStatusEntry(
            row.original.estatus,
            row.original.estatus_label,
          );
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
                title={cfg.label}
                aria-hidden="true"
              />
              <span className="sr-only">{cfg.label}</span>
              <div className="flex flex-col items-start gap-1 min-w-0">
                {/* El respaldo `?? "—"` NO es cosmético: sin contenido el
                    `<button>` colapsa a 0×0 px y el folio queda invisible e
                    inclicable (verificado en producción, donde 4 de 15
                    órdenes traen `folio: null`). El guion da un objetivo de
                    clic real y mantiene la fila navegable. */}
                <button
                  type="button"
                  onClick={() => onViewDetails(row.original.id)}
                  className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
                  title="Ver detalle"
                >
                  {row.original.folio ?? "—"}
                </button>
                {row.original.referencia && (
                  <span
                    className="inline-flex max-w-[150px] items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                    title={row.original.referencia}
                  >
                    {row.original.referencia}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
    ),
    // El filtro de encabezado filtra por `proveedor` (el id, no el nombre):
    // dos proveedores homónimos no deben mezclarse, y es el mismo criterio
    // que ya usaba `buildSupplierOptions` para deduplicar sus opciones.
    // El filtro de encabezado filtra por `proveedor` (el id, no el nombre):
    // dos proveedores homónimos no deben mezclarse, y es el mismo criterio
    // que ya usaba `buildSupplierOptions` para deduplicar sus opciones.
    // Sin `text-sm` explícito a propósito: esa clase (14px) le ganaba al
    // tamaño ambiente de la tabla en modo `density="compact"` (13px, ver
    // `bodyTextCls` en `DataTable`), y era la única columna que lo hacía —
    // se veía más grande que el resto sin motivo.
    columnHelper.accessor("proveedor_nombre", {
      meta: { label: "Proveedor" },
      header: ({ column }) => (
        <ColumnFilterHeader label="Proveedor" options={supplierOptions} column={column} />
      ),
      filterFn: exactFilterFn((row) => row.proveedor),
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200">
          {textOrDash(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_oc", {
      header: "Fecha OC",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    // `total_piezas` SÍ llega siempre (no es un campo financiero filtrado por
    // rol, ver `PurchaseOrderPageContent`).
    columnHelper.accessor("total_piezas", {
      header: "Cantidad",
      meta: { align: "right" },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 tabular-nums">
          {formatQuantityValue(info.getValue())}
        </span>
      ),
    }),
    // `fecha_vencimiento` SÍ llega siempre en el listado (mismo campo que ya
    // consume `PurchaseOrderPageContent` en el detalle), así que es un
    // `accessorFn` normal —`?? ""` por el mismo motivo de búsqueda global que
    // el resto de fechas nullable de esta tabla.
    columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
      id: "fecha_vencimiento",
      header: "Vencimiento",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {/* `||` y no `??`: el valor ausente ya llega como "", no como null. */}
          {formatLocalDate(info.getValue() || null)}
        </span>
      ),
    }),
    // ── Progreso OC ────────────────────────────────────────────────────────
    // Fusiona "Surtidas"/"Restantes" en una sola barra + texto ("surtido /
    // solicitado · %"). El backend todavía no expone una cantidad SURTIDA
    // agregada a nivel de cabecera en `GET /compras/ordenes/` (solo el
    // detalle trae `recepciones[]` anidadas, y sumarlas por fila en el
    // listado sería un fetch N+1), así que `surtido` queda en 0 A PROPÓSITO
    // —decisión de negocio, no un supuesto del cliente— hasta que el backend
    // lo añada; la barra en 0% documenta eso, no afirma que nada se ha
    // recibido.
    columnHelper.display({
      id: "progreso",
      header: "Progreso OC",
      cell: ({ row }) => {
        const solicitado = row.original.total_piezas;
        const surtido = 0;
        const pct = solicitado > 0 ? Math.round((surtido / solicitado) * 100) : 0;
        return (
          <div className="flex flex-col gap-1 w-full max-w-36">
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {formatQuantityValue(surtido)} / {formatQuantityValue(solicitado)} · {pct}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => (
        <ActionsCell
          order={row.original}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onCancel={onCancel}
        />
      ),
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};
