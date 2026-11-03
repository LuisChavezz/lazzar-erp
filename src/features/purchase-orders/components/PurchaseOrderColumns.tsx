"use client";

import { useState } from "react";
import { getPurchaseOrderProgress, progressBarClass } from "../utils/purchaseOrderProgress";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  CheckCircleIcon,
  CloseIcon,
  DeleteIcon,
  ChevronRightIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  RouteIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { useConfirmPurchaseOrder } from "../hooks/useConfirmPurchaseOrder";
import { useDeletePurchaseOrder } from "../hooks/useDeletePurchaseOrder";
import { usePurchaseOrderEmailStatus } from "../hooks/useSendPurchaseOrderEmail";
import { usePurchaseOrderRowActionsContext } from "../hooks/purchaseOrderRowActionsContext";
import { useDownloadPurchaseOrderPdf } from "../hooks/useDownloadPurchaseOrderPdf";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderCancellable,
  isPurchaseOrderEditable,
  isPurchaseOrderUnconfirmed,
  purchaseOrderStatusEntry,
} from "../constants/purchaseOrderStatus";
import { tipoCompraLabel } from "../constants/purchaseOrderTipoCompra";
import { purchaseOrderDetailHref } from "../constants/purchaseOrderDetailOrigins";
import { SupplierCatalogHeaderFilter } from "@/src/features/suppliers/components/SupplierCatalogHeaderFilter";
import { PurchaseOrderFechaOcHeader, PurchaseOrderFolioHeader } from "./PurchaseOrderHeaderFilters";

const columnHelper = createColumnHelper<PurchaseOrder>();

// ── Celda O.C. (folio + menú de acciones) ─────────────────────────────────────

/**
 * Primera columna de la fila: punto de estatus, folio y referencia. El FOLIO es
 * el disparador del menú de acciones de la fila (no hay columna "Acciones"
 * aparte): al hacer clic abre el menú y "Ver Detalles" es su primer item — ya
 * no navega directo. Mismo patrón que Cotizaciones (#127) y, en lo visual, que
 * `OperationsOrderColumns` (texto tipo link con chevron; el punto y la
 * referencia van FUERA del botón, son indicadores, no parte de la acción).
 *
 * "Ver Detalles" es un enlace real (`href` del item) a la página de detalle.
 * Edición, cancelación, ruta crítica y correo se DELEGAN a la vista (`onEdit`
 * / `onCancel` / `onCriticalPath`, y `onSendEmail` por
 * `PurchaseOrderRowActionsProvider`): sus destinos —diálogos de formulario y
 * la confirmación del correo— deben sobrevivir a que la celda se desmonte al ordenar, paginar o filtrar. Cancelar en particular CAMBIA el estatus de la fila, así
 * que el refetch puede sacarla de una vista filtrada con el diálogo abierto.
 *
 * Confirmar y Eliminar sí se resuelven aquí, con su `ConfirmDialog` y su hook:
 * son mutaciones inmediatas sobre ESTA fila, no un estado que deba sobrevivirle.
 * Descargar PDF no abre nada — es un `mutate(id)` directo. El "en curso" del
 * correo se lee de la `MutationCache` (`usePurchaseOrderEmailStatus`).
 */
const FolioCell = ({
  order,
  onEdit,
  onCancel,
  onCriticalPath,
}: {
  order: PurchaseOrder;
  onEdit: (order: PurchaseOrder) => void;
  onCancel: (order: PurchaseOrder) => void;
  onCriticalPath: (order: PurchaseOrder) => void;
}) => {
  const { onSendEmail } = usePurchaseOrderRowActionsContext();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: confirmOrder, isPending } = useConfirmPurchaseOrder();
  const { mutate: deleteOrder, isPending: isDeletePending } = useDeletePurchaseOrder();
  const { isPreparingEmail, isSendingEmail } = usePurchaseOrderEmailStatus(order.id);
  const isEmailBusy = isPreparingEmail || isSendingEmail;
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadPurchaseOrderPdf();

  // Cómo se nombra la orden en el disparador, su `aria-label` y el texto de los
  // diálogos de confirmación. `folio` es `null` hasta que la orden se confirma
  // —precisamente en las EDITABLES, que son las que ven estos diálogos—, así
  // que sin el respaldo salía literalmente "la orden de compra null".
  const orderLabel = order.folio ?? `#${order.id}`;
  const statusCfg = purchaseOrderStatusEntry(order.estatus, order.estatus_label);

  // Borrador o pendiente: la orden aún no se confirma, así que puede
  // confirmarse o eliminarse. Autorizada en adelante, ninguna de las dos.
  const unconfirmed = isPurchaseOrderUnconfirmed(order.estatus);

  // Borrador, pendiente o autorizada: la orden puede editarse. Guardar una
  // autorizada la regresa a pendiente (lo avisa el wizard).
  const editable = isPurchaseOrderEditable(order.estatus);

  // Borrador, pendiente o autorizada: la orden puede cancelarse (queda en
  // estatus 6 con su motivo). Es una acción DISTINTA de eliminar.
  const cancellable = isPurchaseOrderCancellable(order.estatus);

  // El envío al proveedor requiere un correo. `proveedor_correo` ya viene
  // SIEMPRE en el listado (el serializer lo expone tanto en list como en
  // retrieve), así que `null`/`""` significa literalmente "el proveedor no
  // tiene correo capturado" y la acción se puede ocultar sin ambigüedad.
  const supplierHasNoEmail = !order.proveedor_correo;

  // Solo se ENVÍA la orden al proveedor una vez autorizada (o más avanzada):
  // antes de eso todavía puede editarse/eliminarse, así que no debe salirle un
  // documento en firme (el hook vuelve a comprobarlo con el estatus real).
  // Cuando la condición no se cumple, la acción se OCULTA por completo (igual
  // que Editar/Confirmar/Cancelar), no se muestra deshabilitada. "Descargar
  // PDF", en cambio, está en todos los estatus (ver su item más abajo).
  const isAuthorizedOrBeyond = isPurchaseOrderAuthorizedOrComplete(order.estatus);

  // La visibilidad de importes NO se comprueba aquí, aunque correo/PDF/edición
  // la necesiten: la decisión se toma sobre el DETALLE recién consultado, no
  // sobre esta fila del listado. El backend filtra los campos de contabilidad
  // tanto en `list()` como en `retrieve()` (`compras/api/views.py`,
  // `filtrar_campos_contabilidad_orden_compra`), así que la fila también llega
  // sin `gran_total` para quien no tiene permiso; aun así la guarda vive donde
  // se arma el documento: los hooks de correo/PDF (`canSeeAmounts` tras su
  // `fetchQuery`) y el wizard de edición (`PurchaseOrderEditStepManager`).

  // "Enviar correo" requiere además un correo del proveedor al que enviar.
  const canSendEmail = isAuthorizedOrBeyond && !supplierHasNoEmail;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      // Enlace real: Next lo prefetchea y clic medio/Ctrl+clic abren otra pestaña.
      href: purchaseOrderDetailHref(order.id),
    },
  ];

  // Solo con la orden ya confirmada (borrador o pendiente de confirmar no
  // tienen ruta que seguir) y sin `permission`: quien ve la orden puede
  // consultarla. El diálogo decide si es de solo lectura: OC Cancelada o sin
  // `E-COMPRAS-OC`.
  if (!unconfirmed) {
    menuItems.push({
      label: "Ruta crítica",
      icon: RouteIcon,
      onSelect: () => onCriticalPath(order),
    });
  }

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
  }

  if (unconfirmed) {
    // `A-COMPRAS-OC` es el código de AUTORIZACIÓN del catálogo, distinto del de
    // edición: confirmar una orden la autoriza, no la modifica. `unconfirmed`
    // es la regla de NEGOCIO (estatus) — se exigen ambas. Mismo patrón que
    // `A-MESACONTROL-COTI` en `OperationsQuoteColumns`.
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

  if (unconfirmed) {
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
      label: isPreparingEmail
        ? "Preparando..."
        : isSendingEmail
          ? "Enviando..."
          : "Enviar correo",
      icon: EmailIcon,
      // Prepara el correo y la vista pide confirmación; nada se envía antes.
      onSelect: () => onSendEmail(order.id),
      // In-flight guard: evita doble envío o solaparse con la descarga.
      // `keepOpenOnSelect` deja el menú abierto para ver "Preparando..."/"Enviando...".
      disabled: isEmailBusy || isDownloadingPdf,
      keepOpenOnSelect: true,
    });
  }

  // "Descargar PDF" está disponible en TODOS los estatus —sin condición— y no
  // necesita correo del proveedor (es una acción local: el documento puede
  // imprimirse o compartirse a mano). Solo la orden CANCELADA se marca dentro
  // del documento (leyenda, motivo y marca de agua en `PurchaseOrderPdfDocument`)
  // para que no se confunda con una orden válida; los demás estatus salen sin
  // marca.
  menuItems.push({
    label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
    icon: DownloadIcon,
    onSelect: () => downloadPdf(order.id),
    // In-flight guard: evita doble descarga o solaparse con el envío.
    // `keepOpenOnSelect` deja el menú abierto para ver el estado "Generando PDF...".
    disabled: isDownloadingPdf || isEmailBusy,
    keepOpenOnSelect: true,
  });

  return (
    // `whitespace-nowrap`: punto, folio, chevron y referencia en UNA línea (ver
    // `size` de la columna). `overflow-hidden`: la tabla es `table-fixed` y la
    // columna se puede angostar; sin él, la referencia se pintaba encima de la
    // columna Proveedor. Lo que sobra se recorta (la pill ya trunca), y
    // `minSize` garantiza que el punto y el disparador siempre caben.
    <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`}
        title={statusCfg.label}
        aria-hidden="true"
      />
      {/* Folio arriba; estatus (badge discreto, como Recepciones) y
          referencia debajo. */}
      <div className="flex flex-col items-start gap-1 min-w-0">
      {/* "Ver Detalles" siempre es visible, así que `ActionMenu` nunca devuelve
          `null` aquí y el folio no desaparece. */}
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones de la orden ${orderLabel}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de la orden ${orderLabel}`}
            title="Ver detalle"
            className="group inline-flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          >
            {orderLabel}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
      <div className="flex items-center gap-1 min-w-0">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        {order.referencia && (
          <span
            className="inline-flex max-w-[120px] items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
            title={order.referencia}
          >
            {order.referencia}
          </span>
        )}
      </div>
      </div>
      {unconfirmed && (
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
      {unconfirmed && (
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

/**
 * Columnas del listado de órdenes de compra (`GET /compras/ordenes/`), para la
 * tabla en MODO SERVIDOR (`usePurchaseOrdersTable`): el backend filtra, busca,
 * ordena y pagina, así que ninguna columna declara `filterFn`.
 *
 * - `meta.serverSort` = el campo de `ordering` del backend (lista blanca en
 *   `purchaseOrdersTable`); `meta.serverFilter` = la clave del filtro que
 *   controla el encabezado de esa columna.
 * - Los encabezados con filtro son componentes (`PurchaseOrderHeaderFilters`,
 *   `SupplierCatalogHeaderFilter`): sus opciones son fijas o salen de un
 *   catálogo, nunca de las filas, porque la tabla solo tiene una página.
 * - Tipo de compra, cantidad y vencimiento ordenan pero no filtran: el
 *   endpoint no acepta esos filtros.
 *
 * Fábrica —no un arreglo estático— porque "Editar"/"Cancelar"/"Ruta crítica"
 * abren diálogos que viven en `PurchaseOrderView`. Mismo patrón
 * `getXColumns(callbacks)` que `CorteMangaOrderColumns`.
 *
 * Contenido pedido por negocio: O.C. (folio + estatus + referencia, y el menú
 * de acciones de la fila), Proveedor, Tipo de compra, Fecha de generación,
 * Cantidad, Vencimiento, Progreso OC. Los importes (Total/Subtotal/Impuestos)
 * y "Entrega estimada" salieron del listado a propósito — siguen disponibles
 * en el detalle de la orden.
 */
export const getColumns = (
  onEdit: (order: PurchaseOrder) => void,
  onCancel: (order: PurchaseOrder) => void,
  onCriticalPath: (order: PurchaseOrder) => void,
) => {
  const columns = [
    // ── O.C. ───────────────────────────────────────────────────────────────
    // Folio, estatus y referencia en UNA columna, que además es la del menú de
    // acciones de la fila (ver `FolioCell`):
    //  - el estatus se reduce a un punto de color (mismo `dot` que usa
    //    `StatusBadge`) junto al folio, con la etiqueta accesible por `title`
    //    y `sr-only` — el color solo no debe ser la única señal;
    //  - la referencia va en una mini-pill gris junto al folio, y se omite por
    //    completo cuando la orden no trae una (no hay "—" decorativo);
    //  - el filtro de encabezado es por ESTATUS (`?estatus=`), el campo que
    //    vive visualmente en esta columna (el punto de color); ordena por
    //    `folio`;
    //  - `enableHiding: false`: ocultarla desde "Mostrar/Ocultar" escondería
    //    también el menú de acciones; nunca lleva `hideOnMobile` por lo mismo;
    //  - `size: 260`: punto (8) + folio mono `OC-1-178` con chevron (~90) +
    //    pill de referencia (tope de 120) + huecos y padding de celda. Con el
    //    ancho por defecto (150) la referencia no cabía en la misma línea;
    //  - `minSize: 150`: padding de celda (2×16) + punto (8) + hueco (8) +
    //    folio mono con chevron (~100 para un folio tipo `OC-10-1234`). Por
    //    debajo, al angostar la columna se recortaría el disparador; la
    //    referencia sí puede recortarse.
    columnHelper.accessor(
      (row) => `${row.folio ?? `#${row.id}`} ${row.referencia ?? ""}`.trim(),
      {
        id: "folio",
        // `meta.label` nombra la columna en "Mostrar/Ocultar" y en la
        // exportación: su `header` es un componente, no un string.
        meta: { label: "O.C.", serverSort: "folio", serverFilter: "estatus" },
        enableHiding: false,
        size: 260,
        minSize: 150,
        header: PurchaseOrderFolioHeader,
        cell: ({ row }) => (
          <FolioCell
            order={row.original}
            onEdit={onEdit}
            onCancel={onCancel}
            onCriticalPath={onCriticalPath}
          />
        ),
      },
    ),
    // El filtro de encabezado es por `proveedor` (el id, no el nombre): dos
    // proveedores homónimos no deben mezclarse.
    // Sin `text-sm` explícito a propósito: esa clase (14px) le ganaba al
    // tamaño ambiente de la tabla en modo `density="compact"` (13px, ver
    // `bodyTextCls` en `DataTable`).
    columnHelper.accessor("proveedor_nombre", {
      meta: { label: "Proveedor", serverSort: "proveedor__nombre", serverFilter: "proveedor" },
      header: ({ column }) => <SupplierCatalogHeaderFilter column={column} title="Proveedor" />,
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200">
          {textOrDash(info.getValue())}
        </span>
      ),
    }),
    // ── Tipo de compra ─────────────────────────────────────────────────────
    // Se muestra la etiqueta del backend (`tipo_compra_label`).
    columnHelper.accessor(
      (row) => tipoCompraLabel(row.tipo_compra, row.tipo_compra_label),
      {
        id: "tipo_compra",
        header: "Tipo de compra",
        meta: { label: "Tipo de compra", serverSort: "tipo_compra" },
        cell: (info) => (
          <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
        ),
      },
    ),
    // Rango libre de fechas sobre `fecha_oc` (`?fecha_desde=&fecha_hasta=`).
    columnHelper.accessor("fecha_oc", {
      meta: { label: "Fecha de generación", serverSort: "fecha_oc" },
      header: PurchaseOrderFechaOcHeader,
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
      meta: { align: "right", label: "Cantidad", serverSort: "total_piezas" },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 tabular-nums">
          {formatQuantityValue(info.getValue())}
        </span>
      ),
    }),
    // `fecha_vencimiento` SÍ llega siempre en el listado (mismo campo que ya
    // consume `PurchaseOrderPageContent` en el detalle).
    columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
      id: "fecha_vencimiento",
      header: "Vencimiento",
      meta: { label: "Vencimiento", serverSort: "fecha_vencimiento" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {/* `||` y no `??`: el valor ausente ya llega como "", no como null. */}
          {formatLocalDate(info.getValue() || null)}
        </span>
      ),
    }),
    // ── Progreso OC ────────────────────────────────────────────────────────
    // Barra + "recibido / solicitado · %" con lo que calcula el backend
    // (`piezas_recibidas`, `progreso_pct`; ver `getPurchaseOrderProgress`).
    // Sin esos campos se muestra "—", nunca un 0 % inventado.
    columnHelper.display({
      id: "progreso",
      header: "Progreso OC",
      cell: ({ row }) => {
        const progress = getPurchaseOrderProgress(row.original);
        if (!progress) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-col gap-1 w-full max-w-36">
            <div
              className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Recibido ${progress.pct}%`}
            >
              <div
                className={`h-full rounded-full transition-all ${progressBarClass(progress.pct)}`}
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {formatQuantityValue(progress.recibidas)} / {formatQuantityValue(progress.solicitadas)} ·{" "}
              <span className={progress.pct >= 100 ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                {progress.pct}%
              </span>
            </span>
          </div>
        );
      },
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};
