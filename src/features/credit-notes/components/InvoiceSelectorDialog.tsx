"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { InfoIcon } from "@/src/components/Icons";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { useInvoices } from "@/src/features/invoicing/hooks/useInvoices";
import { getInvoiceNotCreditableReason } from "../utils/creditNoteStamping";

/** Motivo de las filas mientras el listado de facturas sigue cargando. */
const INVOICE_STATE_LOADING_REASON = "Consultando el estado de la factura…";

interface InvoiceSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id de la factura ya vinculada (`0` = ninguna), para resaltarla al abrir. */
  selectedFacturaId: number;
  /** Se invoca al confirmar con la CUENTA POR COBRAR elegida (objeto completo). */
  onConfirm: (cuenta: CuentaPorCobrar) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, de
 * modo que la consulta corre bajo demanda. Es un componente con nombre propio
 * (no una arrow anónima) justamente para poder llamar el hook aquí y no en
 * `SingleSelectPickerDialogContent`, que es puramente presentacional y no sabe
 * de dónde salen sus `items`. Mismo reparto que `CxpSelectorDialog`.
 */
function InvoiceSelectorContent({
  selectedFacturaId,
  onConfirm,
  onCancel,
}: {
  selectedFacturaId: number;
  onConfirm: (cuenta: CuentaPorCobrar) => void;
  onCancel: () => void;
}) {
  // `saldo_pendiente: true` → el backend filtra a `saldo > 0` y excluye las
  // cuentas `Cancelada`. Es el filtro que deja las facturas con saldo que
  // acreditar; que la factura ADMITA la nota se decide abajo.
  const { cuentas, isLoading, isError } = useCuentasPorCobrar({
    saldo_pendiente: true,
  });

  // La CxC no trae el estado del CFDI de su factura: se cruza con el listado de
  // facturas, que sí lo trae (`cfdi_cancelado`, `cfdi_cancelacion_solicitada`).
  // Una factura cancelada antes de que el receptor acepte su cancelación sigue
  // `Emitida` y con saldo, y el backend rechaza emitir notas sobre ella.
  const {
    invoices,
    hasLoaded: hasLoadedInvoices,
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
  } = useInvoices();
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  // Sin el listado no se sabe qué factura admite notas. Las filas quedan
  // seleccionables como antes: el precheck previo al alta `Emitida` y el
  // backend siguen protegiendo la emisión.
  const isInvoiceStateUnavailable = isErrorInvoices && !hasLoadedInvoices;

  const getDisabledReason = (cuenta: CuentaPorCobrar): string | null => {
    if (isInvoiceStateUnavailable) return null;
    if (isLoadingInvoices) return INVOICE_STATE_LOADING_REASON;
    return getInvoiceNotCreditableReason(
      cuenta.factura_folio,
      invoicesById.get(cuenta.factura_id),
    );
  };

  return (
    <>
      {isInvoiceStateUnavailable && (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3"
        >
          <InfoIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            No se pudo consultar el estado de las facturas: la lista puede incluir
            facturas canceladas o con su cancelación pendiente. Al emitir la nota
            se vuelve a comprobar.
          </p>
        </div>
      )}
      <SingleSelectPickerDialogContent<CuentaPorCobrar>
        title="Seleccionar Factura a Acreditar"
        subtitle="Solo facturas con saldo por cobrar: una nota de crédito se aplica sobre el saldo pendiente"
        statusColor="violet"
        items={cuentas}
        isLoading={isLoading}
        isError={isError}
        loadingTitle="Cargando facturas"
        loadingMessage="Obteniendo las facturas con saldo por cobrar..."
        errorMessage="Error al cargar las facturas por cobrar."
        searchPlaceholder="Buscar por folio de factura o cliente..."
        filterPredicate={(cuenta, term) =>
          (cuenta.factura_folio ?? "").toLowerCase().includes(term) ||
          (cuenta.cliente_nombre ?? "").toLowerCase().includes(term)
        }
        getKey={(cuenta) => cuenta.factura_id}
        selectedKey={selectedFacturaId > 0 ? selectedFacturaId : null}
        emptyMessage="No hay facturas con saldo por cobrar."
        noResultsMessage="No se encontraron facturas"
        renderContent={(cuenta) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {cuenta.factura_folio || `Factura #${cuenta.factura_id}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {cuenta.cliente_nombre}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {/* `timeZone: "UTC"`: `fecha_vencimiento` es una fecha-calendario
                    "YYYY-MM-DD"; sin esto un navegador al oeste de Greenwich la
                    pinta un día antes. Convención de finanzas (CxC/CxP/pólizas). */}
                {cuenta.estatus} · Vence{" "}
                {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Saldo por cobrar
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
                {/* En la moneda de la FACTURA; sin ella, sin símbolo. */}
                {formatMoneyValueOrDash(
                  cuenta.saldo,
                  cuenta.moneda_codigo,
                )}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                de{" "}
                {formatMoneyValueOrDash(
                  cuenta.total,
                  cuenta.moneda_codigo,
                )}
              </p>
            </div>
          </div>
        )}
        getItemDisabledReason={getDisabledReason}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
}

/**
 * InvoiceSelectorDialog
 *
 * Selector ÚNICO de la factura que la nota de crédito va a acreditar, apilado
 * ENCIMA del formulario (que permanece montado detrás para no perder lo
 * capturado — mismo patrón que `CxpSelectorDialog`).
 *
 * Trabaja sobre CUENTAS POR COBRAR y no sobre el listado de facturas, aunque lo
 * que se elige sea una factura. Motivo: el renglón de CxC trae de UNA sola
 * consulta todo lo que la nota necesita —`factura_id`, `factura_folio`,
 * `cliente`, `moneda_codigo` y, sobre todo, el `saldo`, que es el techo de
 * `total`—, mientras que partir del listado de facturas obligaría a una segunda
 * consulta a `/cuentas-por-cobrar/?factura={id}` para obtener el saldo. "Tener
 * una CxC con saldo" es una de las condiciones que el backend exige para
 * emitir; la otra, que la factura no esté cancelada ni con su cancelación en
 * curso, sale del listado de facturas (`useInvoices`): esas filas se muestran
 * deshabilitadas con su motivo, no se ocultan.
 *
 * Es presentacional respecto del formulario: no escribe en él, solo entrega la
 * cuenta elegida —objeto completo— por `onConfirm`.
 */
export function InvoiceSelectorDialog({
  open,
  onOpenChange,
  selectedFacturaId,
  onConfirm,
}: InvoiceSelectorDialogProps) {
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
        <InvoiceSelectorContent
          selectedFacturaId={selectedFacturaId}
          onConfirm={(cuenta) => {
            onConfirm(cuenta);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
