"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import {
  getCreditNoteCxcEligibility,
  getCreditNoteCxcSelectionBlockReason,
} from "../utils/creditNoteCxcEligibility";

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
  // acreditar; que la factura ADMITA la nota lo dicen los campos del CFDI que
  // la propia CxC trae (nucleo-erp#1187, `getCreditNoteCxcEligibility`).
  const { cuentas, isLoading, isError } = useCuentasPorCobrar({
    saldo_pendiente: true,
  });

  return (
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
      renderContent={(cuenta) => {
        const eligibility = getCreditNoteCxcEligibility(cuenta);
        return (
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
              {/* Timbrado pendiente: se puede elegir, pero la nota solo se
                  guarda como borrador hasta que se confirme. */}
              {eligibility.kind === "draftOnly" && (
                <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {eligibility.reason}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Saldo por cobrar</p>
              <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
                {/* En la moneda de la FACTURA; sin ella, sin símbolo. */}
                {formatMoneyValueOrDash(cuenta.saldo, cuenta.moneda_codigo)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                de {formatMoneyValueOrDash(cuenta.total, cuenta.moneda_codigo)}
              </p>
            </div>
          </div>
        );
      }}
      // CFDI cancelado o en cancelación: a la vista, deshabilitada con su
      // motivo (EC-560); no se elige ni para borrador.
      getItemDisabledReason={getCreditNoteCxcSelectionBlockReason}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
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
 * `total`— y el estado del CFDI de su factura (`factura_cfdi_*`, `cobrable`,
 * nucleo-erp#1187), mientras que partir del listado de facturas obligaría a una
 * segunda consulta a `/cuentas-por-cobrar/?factura={id}` para obtener el saldo.
 * "Tener una CxC con saldo" es una de las condiciones que el backend exige para
 * emitir; la otra, que la factura no esté cancelada ni con su cancelación en
 * curso, sale de esos campos: esas filas se muestran deshabilitadas con su
 * motivo, no se ocultan. Las de timbrado pendiente se eligen con el aviso de que
 * solo admiten borrador (`getCreditNoteCxcEligibility`).
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
