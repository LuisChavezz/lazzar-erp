"use client";

import { useState } from "react";
import { ColumnDef, createColumnHelper, type SortingFn } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  CheckCircleIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { useConfirmPurchaseOrder } from "../hooks/useConfirmPurchaseOrder";
import { useDeletePurchaseOrder } from "../hooks/useDeletePurchaseOrder";
import { useSendPurchaseOrderEmail } from "../hooks/useSendPurchaseOrderEmail";
import { useDownloadPurchaseOrderPdf } from "../hooks/useDownloadPurchaseOrderPdf";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderEditable,
  purchaseOrderStatusEntry,
} from "../constants/purchaseOrderStatus";

const columnHelper = createColumnHelper<PurchaseOrder>();

/**
 * Importe en la MONEDA DE LA ORDEN (no siempre MXN) y con "—" cuando el campo
 * viene ausente: el backend elimina los financieros de la respuesta para
 * usuarios sin rol con visibilidad financiera, y `Number(undefined)` pintaría
 * "$NaN" en la celda.
 */
const money = (value: string | undefined, monedaCodigo: string) =>
  formatMoneyValueOrDash(value, { currency: monedaCodigo });

/**
 * Orden NUMÉRICO para las columnas de importe. El valor de la celda es el
 * string decimal del backend, y el comparador por defecto de TanStack ordena
 * strings LEXICOGRÁFICAMENTE: "1000.00" quedaría antes de "9.00". Un importe
 * ausente (filtro por rol) llega como "" y cuenta como 0 — el filtro es por
 * usuario, no por fila, así que o se ven todos o ninguno.
 */
const amountSortingFn: SortingFn<PurchaseOrder> = (rowA, rowB, columnId) =>
  safeParseAmount(rowA.getValue<string>(columnId)) -
  safeParseAmount(rowB.getValue<string>(columnId));

// ── Celda de acciones ─────────────────────────────────────────────────────────

/**
 * Menú de acciones de la fila.
 *
 * Navegación y edición se DELEGAN a la vista (`onViewDetails` / `onEdit`): sus
 * destinos —una página de detalle y un diálogo de formulario— deben sobrevivir
 * a que la celda se desmonte al ordenar, paginar o filtrar.
 *
 * Confirmar y Cancelar sí se resuelven aquí, con su `ConfirmDialog` y su hook:
 * son mutaciones inmediatas sobre ESTA fila, no un estado que deba sobrevivirle.
 * Mismo reparto que `AreaColumns` y el resto de los catálogos. Enviar correo y
 * Descargar PDF no abren nada — son `mutate(id)` directos.
 */
const ActionsCell = ({
  order,
  onViewDetails,
  onEdit,
}: {
  order: PurchaseOrder;
  onViewDetails: (id: number) => void;
  onEdit: (order: PurchaseOrder) => void;
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
      // orden (y viceversa, ver "Cancelar" abajo) — ambas mutaciones no
      // deben poder correr en paralelo sobre la misma orden.
      disabled: isPending || isDeletePending,
    });
    menuItems.push({
      label: "Cancelar",
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

/**
 * Columnas del listado de órdenes de compra (`GET /compras/ordenes/`).
 *
 * Fábrica —no un arreglo estático— porque el folio y la acción "Ver Detalles"
 * navegan a la página de detalle, y "Editar" abre el diálogo de edición que
 * vive en `PurchaseOrderView`. Mismo patrón `getXColumns(callbacks)` que
 * `CorteMangaOrderColumns` (navegación) y `AreaColumns` (edición).
 *
 * Las columnas de importe muestran "—" cuando el campo viene ausente: el
 * backend los omite por rol y NO se ocultan las columnas enteras, porque en un
 * mismo listado la visibilidad es por usuario, no por fila —si un usuario no
 * los ve, no los ve en ninguna—, y una columna vacía comunica eso mejor que
 * una columna desaparecida.
 */
export const getColumns = (
  onViewDetails: (id: number) => void,
  onEdit: (order: PurchaseOrder) => void,
) => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: ({ row }) => (
        <StatusBadge
          status={String(row.original.estatus)}
          config={{
            [row.original.estatus]: purchaseOrderStatusEntry(
              row.original.estatus,
              row.original.estatus_label,
            ),
          }}
        />
      ),
    }),
    // `accessorFn` con `?? ""` y no `accessor("folio")`, por el mismo motivo de
    // búsqueda global que `fecha_entrega_estimada` abajo: `folio` es nullable y
    // el listado viene ordenado por `-fecha_oc, -id`, así que basta con que la
    // orden más reciente esté pendiente de folio para que la columna quede
    // fuera de la búsqueda EN TODAS las filas.
    columnHelper.accessor((row) => row.folio ?? "", {
      id: "folio",
      header: "Folio",
      // Folio clickeable: navega al detalle con el MISMO callback que la acción
      // "Ver Detalles" (recibe `id`, la PK de esta orden). Mismo patrón que el
      // folio del listado de pedidos (`SharedOrderColumns`).
      //
      // El respaldo `?? "—"` NO es cosmético: sin contenido el `<button>`
      // colapsa a 0×0 px y el folio queda invisible e inclicable (verificado en
      // producción, donde 4 de 15 órdenes traen `folio: null`). El guion da un
      // objetivo de clic real y mantiene la fila navegable.
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onViewDetails(row.original.id)}
          className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          title="Ver detalle"
        >
          {row.original.folio ?? "—"}
        </button>
      ),
    }),
    columnHelper.accessor("proveedor_nombre", {
      header: "Proveedor",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-sm">
          {textOrDash(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("referencia", {
      header: "Referencia",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{textOrDash(info.getValue())}</span>
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
    // `accessorFn` que colapsa `null` a `""` — mismo bug de
    // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
    // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
    // visibilidad/orden de columna que guarda `DataTable`.
    columnHelper.accessor((row) => row.fecha_entrega_estimada ?? "", {
      id: "fecha_entrega_estimada",
      header: "Entrega Estimada",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {/* `||` y no `??`: el valor ausente ya llega como "", no como null. */}
          {formatLocalDate(info.getValue() || null)}
        </span>
      ),
    }),
    // Los tres importes usan `accessorFn` con `?? ""` por el mismo motivo que
    // `fecha_entrega_estimada`: ahora pueden venir AUSENTES (filtro por rol) y
    // un `undefined` en la primera fila sacaría la columna de la búsqueda global.
    columnHelper.accessor((row) => row.total ?? "", {
      id: "total",
      header: "Total",
      sortingFn: amountSortingFn,
      cell: ({ row }) => (
        <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
          {money(row.original.total, row.original.moneda_codigo)}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.subtotal ?? "", {
      id: "subtotal",
      header: "Subtotal",
      sortingFn: amountSortingFn,
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {money(row.original.subtotal, row.original.moneda_codigo)}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.impuestos ?? "", {
      id: "impuestos",
      header: "Impuestos",
      sortingFn: amountSortingFn,
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {money(row.original.impuestos, row.original.moneda_codigo)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => (
        <ActionsCell
          order={row.original}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
        />
      ),
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};
