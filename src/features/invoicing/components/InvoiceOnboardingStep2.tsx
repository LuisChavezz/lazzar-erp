"use client";

import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormSecondaryButton, FormSubmitButton } from "@/src/components/FormButtons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import type { Invoice } from "../interfaces/invoice.interface";
import { useInvoiceOnboardingStep2 } from "../hooks/useInvoiceOnboardingStep2";
import { formatCentavos } from "../utils/invoiceEstimate";
import { InvoiceTallaLinesTable } from "./InvoiceTallaLinesTable";

interface InvoiceOnboardingStep2Props {
  pedidoId: number;
  onBack: () => void;
}

/**
 * Paso 2 de "Nueva Factura": piezas por talla del pedido elegido.
 *
 * Crea UNA factura parcial en Borrador con lo capturado. El pedido puede
 * facturarse en varias parcialidades: lo ya facturado (Borrador incluido) se
 * descuenta de lo pendiente que devuelve el onboarding. Tras crearla se muestran
 * el folio y los importes REALES de la respuesta (la estimación es solo guía).
 */
export function InvoiceOnboardingStep2({ pedidoId, onBack }: InvoiceOnboardingStep2Props) {
  const step = useInvoiceOnboardingStep2(pedidoId);
  const { onboarding, data } = step;

  if (step.createdInvoice) {
    return <InvoiceCreatedSummary invoice={step.createdInvoice} />;
  }

  if (onboarding.isLoading) {
    return <Loader title="Cargando piezas" message="Obteniendo lo pendiente por facturar..." />;
  }

  if (onboarding.isError || !data) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="No se pudieron cargar las piezas del pedido"
          message={
            isNotFoundError(onboarding.error)
              ? "El pedido no existe o no pertenece a tu empresa."
              : extractErrorMessage(onboarding.error, "Intenta de nuevo.")
          }
        />
        <div className="flex justify-start">
          <FormSecondaryButton label="Regresar" onClick={onBack} />
        </div>
      </div>
    );
  }

  const pedidoLabel = data.pedido_folio ?? `#${data.pedido}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Pedido <span className="font-mono font-semibold">{pedidoLabel}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Pedidas {data.total_piezas_pedidas} pzas · Facturadas {data.total_piezas_facturadas} pzas ·{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Pendientes {data.total_piezas_pendientes} pzas
          </span>
        </p>
      </div>

      {!step.hasPending && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Este pedido no tiene piezas pendientes por facturar. Elige otro pedido.
        </div>
      )}

      {step.staleNotice && (
        <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
          Otra factura tomó parte de estas piezas mientras capturabas. Los pendientes se
          actualizaron y las cantidades se ajustaron; revisa y vuelve a intentar.
        </div>
      )}

      <InvoiceTallaLinesTable
        tallas={step.tallas}
        quantities={step.quantities}
        facturablesCount={step.facturablesCount}
        disabled={step.isPending || onboarding.isFetching}
        onQuantityChange={step.setQuantity}
        onFillAll={step.fillAllPending}
        onClearAll={step.clearAll}
      />

      {step.hasPending && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Importes estimados
            </p>
            <p className="text-[11px] text-slate-400">
              {step.estimate.piezas} pzas · IVA {data.porcentaje_impuesto}%
            </p>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm tabular-nums">
            <EstimateField label="Subtotal" value={formatCentavos(step.estimate.subtotalCentavos)} />
            <EstimateField label="IVA" value={formatCentavos(step.estimate.impuestoCentavos)} />
            <EstimateField label="Total" value={formatCentavos(step.estimate.totalCentavos)} strong />
          </dl>
          <p className="mt-2 text-[11px] text-slate-400">
            Estimación con el precio sin IVA de cada talla; los importes definitivos los calcula
            el sistema al crear la factura.
          </p>
        </div>
      )}

      {step.errorMessages.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 space-y-1"
        >
          {step.errorMessages.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={step.isPending} />
        <FormSubmitButton
          isPending={step.isPending}
          loadingLabel="Creando factura..."
          disabled={!step.hasPending || !step.canSubmit}
          onClick={(event) => {
            event.preventDefault();
            step.submit();
          }}
        >
          Crear factura
        </FormSubmitButton>
      </div>
    </div>
  );
}

function EstimateField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className={strong ? "font-bold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}>
        {value}
      </dd>
    </div>
  );
}

/** Resultado: folio e importes REALES de la factura creada (respuesta del POST). */
function InvoiceCreatedSummary({ invoice }: { invoice: Invoice }) {
  const money = (value: string) =>
    formatCurrency(safeParseAmount(value), { currency: invoice.moneda_nombre });
  const piezas = invoice.factura_detalles.reduce(
    (sum, detalle) => sum + safeParseAmount(detalle.cantidad),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Factura <span className="font-mono">{invoice.folio}</span> creada como Borrador
        </p>
        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
          {piezas} pzas de {invoice.cliente_nombre}. Si al pedido le quedan piezas, puedes
          facturarlas en otra factura.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 text-sm tabular-nums">
        <EstimateField label="Subtotal" value={money(invoice.subtotal)} />
        <EstimateField label="IVA" value={money(invoice.impuestos)} />
        <EstimateField label="Total" value={money(invoice.total)} strong />
      </dl>
      {/* Sin botón propio de cierre: el pie "Cerrar" de `MainDialog` ya lo es. */}
    </div>
  );
}
