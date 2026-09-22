import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, CheckCircleIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "../constants/supplierInvoiceStatus";
import { motivoBloqueoRegistro } from "../schemas/supplier-invoice.schema";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

const columnHelper = createColumnHelper<FacturaProveedor>();

/** Fecha-calendario "YYYY-MM-DD" → texto; `timeZone: "UTC"` evita el día anterior. */
const fecha = (value: string) => (value ? formatShortDate(value, { timeZone: "UTC" }) : "—");

/**
 * Columnas del listado de facturas de proveedor.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos (detalle, edición, registrar,
 * cancelar) viven en `SupplierInvoiceList`. Una celda se desmonta al ordenar,
 * filtrar o paginar, y las dos acciones cambian el `estatus` —que es un filtro—.
 *
 * NO hay "Eliminar": el DELETE del backend es físico y no se guarda por estatus,
 * así que exponerlo destruiría en silencio una factura registrada junto con su
 * cuenta por pagar.
 */
export const getColumns = (
  onViewDetail: (id: number) => void,
  onEdit: (id: number) => void,
  onRegistrar: (id: number) => void,
  onCancel: (id: number) => void,
) => {
  const columns = [
    // Los campos NULLABLE usan accessor de función que colapsa el nulo a `""`:
    // el filtro global de TanStack decide si una columna participa mirando solo
    // la primera fila, y `typeof null === "object"` la sacaría de la búsqueda en
    // TODAS. Mismo criterio que `PolizaColumns` / `CorteMangaOrderColumns`.
    columnHelper.accessor((row) => row.folio ?? "", {
      id: "folio",
      header: "Folio",
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original.id)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {/* `folio` es nullable y no único: se cae al `#id`, que siempre existe. */}
          {info.getValue() || `#${info.row.original.id}`}
        </button>
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
      cell: ({ row }) => {
        const factura = row.original;
        const menuItems: ActionMenuItem[] = [
          { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(factura.id) },
        ];

        // Solo un `Borrador` es editable y registrable y cancelable:
        //  - `Registrada` tiene una CxP viva y el backend rechaza regresarla a
        //    borrador o cancelarla;
        //  - `Cancelada` no admite ninguna acción que mute.
        if (factura.estatus === "Borrador") {
          menuItems.push({ label: "Editar", icon: EditIcon, onSelect: () => onEdit(factura.id) });

          // Cuando algo impide registrar (sin partidas, total en cero o sin
          // vencimiento; ver `motivoBloqueoRegistro`) la etiqueta lo anticipa, pero
          // la opción sigue HABILITADA a propósito: al pulsarla, el handler de la
          // lista corta ANTES de abrir la confirmación y explica el motivo y qué
          // hacer. Una opción deshabilitada no puede explicarlo; el aviso sí.
          const bloqueo = motivoBloqueoRegistro(factura);
          menuItems.push({
            label: bloqueo ? `Registrar (${bloqueo.etiqueta})` : "Registrar",
            icon: CheckCircleIcon,
            onSelect: () => onRegistrar(factura.id),
          });

          menuItems.push({
            label: "Cancelar factura",
            icon: BanIcon,
            onSelect: () => onCancel(factura.id),
          });
        }

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<FacturaProveedor>[];

  return columns;
};
