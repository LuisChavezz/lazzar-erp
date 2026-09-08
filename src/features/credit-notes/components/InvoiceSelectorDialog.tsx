"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";

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
  // `saldo_pendiente: true` → el backend filtra a `saldo > 0`. Es el filtro que
  // hace que la lista contenga EXACTAMENTE las facturas acreditables.
  const { cuentas, isLoading, isError } = useCuentasPorCobrar({
    saldo_pendiente: true,
  });

  // El parámetro del servidor solo mira el saldo, no el estatus: una CxC
  // `Cancelada` a la que le quedara saldo seguiría apareciendo. Emitir contra
  // ella no tendría sentido, así que se descarta aquí.
  const disponibles = cuentas.filter((cuenta) => cuenta.estatus !== "Cancelada");

  return (
    <SingleSelectPickerDialogContent<CuentaPorCobrar>
      title="Seleccionar Factura a Acreditar"
      subtitle="Solo facturas con saldo por cobrar: una nota de crédito se aplica sobre el saldo pendiente"
      statusColor="violet"
      items={disponibles}
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
              {/* En la moneda de la FACTURA, no en el MXN por defecto. */}
              {formatMoneyValueOrDash(
                cuenta.saldo,
                cuenta.moneda_codigo ? { currency: cuenta.moneda_codigo } : undefined,
              )}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              de{" "}
              {formatMoneyValueOrDash(
                cuenta.total,
                cuenta.moneda_codigo ? { currency: cuenta.moneda_codigo } : undefined,
              )}
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
 * consulta a `/cuentas-por-cobrar/?factura={id}` para obtener el saldo. Además,
 * "tener una CxC con saldo" ES la condición que el backend exige para emitir
 * (sin ella responde 400), así que filtrar por la existencia del renglón de CxC
 * es exactamente el filtro correcto, no una aproximación.
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
