"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { MultiSelectPickerDialogContent } from "@/src/components/MultiSelectPickerDialogContent";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { useInvoiceDetail } from "@/src/features/invoicing/hooks/useInvoiceDetail";
import type { InvoiceDetail } from "@/src/features/invoicing/interfaces/invoice.interface";

interface InvoiceLinesSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Factura de la que se toman los conceptos. `0` = todavía no se eligió: la
   * consulta no se dispara y el diálogo no debería abrirse.
   */
  facturaId: number;
  /** Código ISO de la moneda de la factura, para formatear los importes. */
  monedaCodigo: string | null;
  /**
   * Ids de `factura_detalle` que la nota YA tiene como línea. Se EXCLUYEN de la
   * lista para que no puedan agregarse dos veces. Se excluyen en vez de
   * mostrarse deshabilitados porque `SearchableSelectList` pinta cada fila como
   * un `<button>` sin estado deshabilitado, y ensancharlo obligaría a tocar un
   * componente compartido.
   */
  alreadySelectedIds: number[];
  /** Se invoca al confirmar con los conceptos elegidos, en el orden de la lista. */
  onConfirm: (detalles: InvoiceDetail[]) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, de
 * modo que `useInvoiceDetail` corre bajo demanda.
 *
 * Pide el DETALLE de la factura (`GET /finanzas/facturas/{id}/`) y no reutiliza
 * una fila del listado: `getInvoiceDetail` documenta que el listado puede no
 * traer `factura_detalles` hidratados y que quien solo tiene el id debe pedir el
 * detalle. Aquí solo se tiene el id (la factura se eligió desde una cuenta por
 * cobrar, que no anida los conceptos), así que el detalle es la única fuente.
 */
function InvoiceLinesSelectorContent({
  facturaId,
  monedaCodigo,
  alreadySelectedIds,
  onConfirm,
  onCancel,
}: {
  facturaId: number;
  monedaCodigo: string | null;
  alreadySelectedIds: number[];
  onConfirm: (detalles: InvoiceDetail[]) => void;
  onCancel: () => void;
}) {
  const { data: factura, isLoading, isError } = useInvoiceDetail(facturaId);

  const monedaFormato = monedaCodigo ? { currency: monedaCodigo } : undefined;

  const disponibles = (factura?.factura_detalles ?? []).filter(
    (detalle) => !alreadySelectedIds.includes(detalle.id),
  );

  return (
    <MultiSelectPickerDialogContent<InvoiceDetail>
      title="Seleccionar Conceptos de la Factura"
      subtitle="Elige qué conceptos describe esta nota. El importe acreditado lo fija el total de la nota, no estos renglones"
      statusColor="violet"
      items={disponibles}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando conceptos"
      loadingMessage="Obteniendo los conceptos de la factura..."
      errorMessage="Error al cargar los conceptos de la factura."
      searchPlaceholder="Buscar por producto..."
      filterPredicate={(detalle, term) =>
        (detalle.producto_nombre ?? "").toLowerCase().includes(term)
      }
      getKey={(detalle) => detalle.id}
      emptyMessage={
        alreadySelectedIds.length > 0
          ? "Ya agregaste todos los conceptos de esta factura."
          : "Esta factura no tiene conceptos."
      }
      noResultsMessage="No se encontraron conceptos"
      countLabel={{ singular: "concepto seleccionado", plural: "conceptos seleccionados" }}
      renderContent={(detalle) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {detalle.producto_nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {formatQuantityValue(detalle.cantidad)} ×{" "}
              {formatMoneyValueOrDash(detalle.precio_unitario, monedaFormato)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Total</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatMoneyValueOrDash(detalle.total, monedaFormato)}
            </p>
          </div>
        </div>
      )}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/**
 * InvoiceLinesSelectorDialog
 *
 * Selector MÚLTIPLE de conceptos (`factura_detalle`) de la factura elegida,
 * apilado ENCIMA del formulario de la nota (que permanece montado detrás para no
 * perder lo capturado). Una sola confirmación agrega N líneas de golpe.
 *
 * Entrega los `InvoiceDetail` COMPLETOS —no solo sus ids— para que el llamador
 * siembre cada línea con la cantidad y los importes que ya trae el concepto, sin
 * volver a buscarlos.
 */
export function InvoiceLinesSelectorDialog({
  open,
  onOpenChange,
  facturaId,
  monedaCodigo,
  alreadySelectedIds,
  onConfirm,
}: InvoiceLinesSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && (
        <InvoiceLinesSelectorContent
          facturaId={facturaId}
          monedaCodigo={monedaCodigo}
          alreadySelectedIds={alreadySelectedIds}
          onConfirm={(detalles) => {
            onConfirm(detalles);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
