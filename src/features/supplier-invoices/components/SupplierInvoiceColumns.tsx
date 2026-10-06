import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  BanIcon,
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  UploadIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "../constants/supplierInvoiceStatus";
import { motivoBloqueoRegistro } from "../schemas/supplier-invoice.schema";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { useSupplierInvoiceRowActionsContext } from "../hooks/useSupplierInvoiceRowActions";

const columnHelper = createColumnHelper<FacturaProveedor>();

/** Fecha-calendario "YYYY-MM-DD" → texto; `timeZone: "UTC"` evita el día anterior. */
const fecha = (value: string) => (value ? formatShortDate(value, { timeZone: "UTC" }) : "—");

/**
 * Menú de acciones de UNA factura. Callbacks y "en vuelo" llegan por contexto
 * (`SupplierInvoiceRowActionsProvider`), no por `getColumns`: así empezar o
 * terminar una subida o descarga solo re-renderiza los menús, sin remontar las
 * celdas ni cerrar el menú abierto de otra fila.
 */
function SupplierInvoiceRowActions({ factura }: { factura: FacturaProveedor }) {
  const callbacks = useSupplierInvoiceRowActionsContext();
  const uploading = callbacks.uploadingIds.includes(factura.id);
  const downloading = callbacks.downloadingIds.includes(factura.id);

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
      disabled: uploading,
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
    });

    menuItems.push({
      label: "Cancelar factura",
      icon: BanIcon,
      onSelect: () => callbacks.onCancel(factura.id),
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
}

/** Folio como disparador del detalle (mismo callback que "Ver detalle"). */
function SupplierInvoiceFolioTrigger({ factura, folio }: { factura: FacturaProveedor; folio: string }) {
  const { onViewDetail } = useSupplierInvoiceRowActionsContext();
  return (
    <button
      type="button"
      onClick={() => onViewDetail(factura.id)}
      title="Ver detalle"
      className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
    >
      {/* `folio` es nullable y no único: se cae al `#id`, que siempre existe. */}
      {folio || `#${factura.id}`}
    </button>
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
      cell: (info) => (
        <SupplierInvoiceFolioTrigger factura={info.row.original} folio={info.getValue()} />
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
            {formatMoneyValue(info.getValue(), codigo ? { currency: codigo } : undefined)}
          </div>
        );
      },
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={FACTURA_PROVEEDOR_ESTATUS_CONFIG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => (
        <SupplierInvoiceRowActions factura={row.original} />
      ),
    }),
  ] as ColumnDef<FacturaProveedor>[];

  return columns;
};
