import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { FINANCE_WRITE_PERMISSION_REASON } from "@/src/constants/financePermissions";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import {
  BanIcon,
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  UploadIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "../constants/supplierInvoiceStatus";
import { motivoBloqueoRegistro } from "../schemas/supplier-invoice.schema";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { ocFolioLabel } from "../utils/supplierInvoiceLabels";
import { useSupplierInvoiceRowActionsContext } from "../hooks/useSupplierInvoiceRowActions";

const columnHelper = createColumnHelper<FacturaProveedor>();

/** Fecha-calendario "YYYY-MM-DD" → texto; `timeZone: "UTC"` evita el día anterior. */
const fecha = (value: string) => (value ? formatShortDate(value, { timeZone: "UTC" }) : "—");

/**
 * Celda de Folio: el folio ES el menú de la fila (`FolioActionMenu`, modo
 * folio) y debajo va el badge de estatus. "Ver detalle" es siempre la primera
 * acción. Callbacks y "en vuelo" llegan por contexto
 * (`SupplierInvoiceRowActionsProvider`), no por `getColumns`: así empezar o
 * terminar una subida o descarga solo re-renderiza esta celda, sin remontar
 * las demás ni cerrar el menú abierto de otra fila.
 */
function SupplierInvoiceFolioCell({ factura, folio }: { factura: FacturaProveedor; folio: string }) {
  const callbacks = useSupplierInvoiceRowActionsContext();
  const uploading = callbacks.uploadingIds.includes(factura.id);
  const downloading = callbacks.downloadingIds.includes(factura.id);
  // Sin permiso de escritura las escrituras se muestran deshabilitadas con su
  // motivo (convención de los flujos de Finanzas). Descargar es una lectura.
  const { canWrite } = callbacks;
  const permissionReason = canWrite ? undefined : FINANCE_WRITE_PERMISSION_REASON;

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => callbacks.onViewDetail(factura.id) },
    // PDF del proveedor y documento fusionado: en CUALQUIER estatus, incluida
    // `Cancelada` (el backend lo permite). No hay "Quitar PDF": no existe borrado.
    {
      label: uploading
        ? "Subiendo PDF..."
        : factura.tiene_pdf_adjunto
          ? "Reemplazar PDF"
          : "Adjuntar PDF",
      icon: UploadIcon,
      onSelect: () => callbacks.onAttachPdf(factura.id),
      disabled: uploading || !canWrite,
      description: permissionReason,
    },
    {
      label: downloading ? "Generando documento..." : "Descargar OC + RC + factura",
      icon: DownloadIcon,
      onSelect: () => callbacks.onDownloadMergedPdf(factura.id),
      disabled: downloading,
      // Sin PDF adjunto el backend responde 400: la acción ni se ofrece.
      visible: factura.tiene_pdf_adjunto,
    },
  ];

  // Solo un `Borrador` es editable y registrable y cancelable:
  //  - `Registrada` tiene una CxP viva y el backend rechaza regresarla a
  //    borrador o cancelarla;
  //  - `Cancelada` no admite ninguna acción que mute.
  if (factura.estatus === "Borrador") {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => callbacks.onEdit(factura.id),
      disabled: !canWrite,
      description: permissionReason,
    });

    // Cuando algo impide registrar (sin partidas, total en cero o sin
    // vencimiento; ver `motivoBloqueoRegistro`) la etiqueta lo anticipa, pero
    // la opción sigue HABILITADA a propósito: al pulsarla, el handler de la
    // lista corta ANTES de abrir la confirmación y explica el motivo y qué
    // hacer. Una opción deshabilitada no puede explicarlo; el aviso sí.
    const bloqueo = motivoBloqueoRegistro(factura);
    menuItems.push({
      label: bloqueo ? `Registrar (${bloqueo.etiqueta})` : "Registrar",
      icon: CheckCircleIcon,
      onSelect: () => callbacks.onRegistrar(factura.id),
      disabled: !canWrite,
      description: permissionReason,
    });

    menuItems.push({
      label: "Cancelar factura",
      icon: BanIcon,
      onSelect: () => callbacks.onCancel(factura.id),
      disabled: !canWrite,
      description: permissionReason,
    });
  }

  return (
    <FolioActionMenu
      folio={folio}
      items={menuItems}
      status={<StatusBadge status={factura.estatus} config={FACTURA_PROVEEDOR_ESTATUS_CONFIG} />}
    />
  );
}

/**
 * Columnas del listado de facturas de proveedor. No reciben nada: callbacks y
 * "en vuelo" llegan por contexto, así que el arreglo es estático.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos (detalle, edición, registrar,
 * cancelar, reemplazar PDF) y el selector de archivo viven en
 * `SupplierInvoiceList`. Una celda se desmonta al ordenar, filtrar o paginar, y
 * registrar/cancelar cambian el `estatus` —que es un filtro—.
 *
 * NO hay "Eliminar": el DELETE del backend es físico y no se guarda por estatus,
 * así que exponerlo destruiría en silencio una factura registrada junto con su
 * cuenta por pagar.
 */
export const getColumns = () => {
  const columns = [
    // Los campos NULLABLE usan accessor de función que colapsa el nulo a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y `typeof null === "object"` la sacaría de la búsqueda en
    // TODAS. Mismo criterio que `PolizaColumns` / `CorteMangaOrderColumns`.
    columnHelper.accessor((row) => row.folio ?? "", {
      id: "folio",
      header: "Folio",
      size: 180,
      // `folio` es nullable y no único: se cae al `#id`, que siempre existe.
      cell: (info) => (
        <SupplierInvoiceFolioCell
          factura={info.row.original}
          folio={info.getValue() || `#${info.row.original.id}`}
        />
      ),
    }),
    columnHelper.accessor((row) => row.proveedor_nombre ?? "", {
      id: "proveedor_nombre",
      header: "Proveedor",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    // Folios de la OC y la recepción (EC-466). Accessor de texto: entran en la
    // búsqueda global. La OC en Borrador aún no tiene folio y cae a `OC #id`.
    columnHelper.accessor((row) => ocFolioLabel(row), {
      id: "oc_folio",
      header: "OC",
      // Orden natural: `OC-1-207` antes que `OC-1-1000`.
      sortingFn: "alphanumeric",
      meta: { hideOnMobile: true },
      cell: (info) => (
        <span className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("recepcion_folio", {
      header: "Recepción",
      sortingFn: "alphanumeric",
      meta: { hideOnMobile: true },
      cell: (info) => (
        <span className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_emision", {
      header: "Emisión",
      cell: (info) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {fecha(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
      id: "fecha_vencimiento",
      header: "Vencimiento",
      cell: (info) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {fecha(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      meta: { align: "right" },
      cell: (info) => {
        const codigo = info.row.original.moneda_codigo;
        return (
          // En la moneda de la factura: el serializer expone `moneda_codigo`.
          <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatMoneyValue(info.getValue(), codigo)}
          </div>
        );
      },
    }),
  ] as ColumnDef<FacturaProveedor>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo aunque ninguna fila lo use y, al final, cada valor
 *   desconocido de las filas, crudo (igual que su badge).
 * - OC y recepción son valores libres: sus opciones salen de las filas, con el
 *   mismo texto que la celda. Con buscador, porque un proveedor puede tener
 *   muchas.
 * - Las fechas filtran por mes; el vencimiento agrupa aparte las facturas sin
 *   fecha (un borrador puede no tenerla).
 * - Sin filtro de proveedor: el listado ya llega acotado a uno (el selector de
 *   la barra). El total tampoco lleva: es un importe libre, lo cubre el orden.
 */
export const SUPPLIER_INVOICE_HEADER_FILTERS: Partial<
  Record<string, HeaderFilterSpec<FacturaProveedor>>
> = {
  folio: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(FACTURA_PROVEEDOR_ESTATUS_CONFIG),
  },
  oc_folio: { type: "distinct", get: (r) => ocFolioLabel(r), searchable: true },
  recepcion_folio: { type: "distinct", get: (r) => r.recepcion_folio, searchable: true },
  fecha_emision: { type: "month", get: (r) => r.fecha_emision },
  fecha_vencimiento: {
    type: "month",
    get: (r) => r.fecha_vencimiento,
    emptyLabel: "Sin vencimiento",
  },
};
