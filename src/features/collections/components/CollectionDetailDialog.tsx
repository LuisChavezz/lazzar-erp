"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  InfoGrid,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ExclamationTriangleIcon, ReceiptIcon } from "@/src/components/Icons";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import {
  COBRO_ESTATUS_CONFIG,
  COBRO_METODO_PAGO_CONFIG,
  COBRO_REFERENCIA_LABELS,
} from "../constants/collectionStatus";
import type { Cobro } from "../interfaces/collection.interface";
import {
  buildBankAccountIndex,
  buildCxcIndex,
  findMismatchedMonedas,
  formatCobroAmount,
  resolveCobroMoneda,
} from "../utils/collection.utils";

interface CollectionDetailDialogProps {
  /**
   * El cobro ya cargado por el listado — sin fetch propio: `GET
   * /finanzas/cobros/` y el retrieve comparten el mismo `CobroSerializer`, con
   * `cobro_detalles` anidado en ambos. Lo que el renglón NO trae (folio de
   * factura, moneda y saldo de cada CxC; moneda de la cuenta) se resuelve contra
   * los listados de CxC y de cuentas bancarias, una consulta cada uno.
   */
  cobro: Cobro;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Código de moneda junto a un importe, para que no haya que deducirlo de otra columna. */
function CurrencyTag({ code }: { code: string }) {
  return <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{code}</span>;
}

export function CollectionDetailDialog({ cobro, open, onOpenChange }: CollectionDetailDialogProps) {
  const { bankAccounts } = useBankAccounts();
  // Sin parámetros: la MISMA entrada de caché que la pantalla de CxC, y con las
  // `Pagada`/`Cancelada` incluidas (las líneas de cobros viejos apuntan ahí).
  const {
    cuentas,
    isLoading: isLoadingCxc,
    isError: isErrorCxc,
    hasLoaded: hasLoadedCxc,
  } = useCuentasPorCobrar();

  const moneda = resolveCobroMoneda(cobro, buildBankAccountIndex(bankAccounts));
  const cxcIndex = buildCxcIndex(cuentas);
  const mismatched = findMismatchedMonedas(cobro, moneda, cxcIndex);
  const cxcUnavailable = isErrorCxc && !hasLoadedCxc;

  const money = (value: string) => formatCobroAmount(value, moneda);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ReceiptIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle del Cobro
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {`#${cobro.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {mismatched.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {`La cuenta bancaria del cobro está en ${moneda}, pero hay facturas aplicadas en ${mismatched.join(", ")}. Las líneas marcadas abajo muestran cada importe con su moneda: el importe aplicado va en ${moneda}, la moneda de la cuenta, y el saldo en la moneda de su factura.`}
            </p>
          </div>
        )}

        {/* ── Resumen ─────────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Resumen</SectionTitle>
          <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5">
            <InfoGrid>
              <InfoField label="Cliente">{textOrDash(cobro.cliente_nombre)}</InfoField>
              <InfoField label="Fecha de cobro">
                {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". */}
                {formatShortDate(cobro.fecha_cobro, { timeZone: "UTC" })}
              </InfoField>
              <InfoField label="Cuenta bancaria">{textOrDash(cobro.cuenta_bancaria_alias)}</InfoField>
              <InfoField label="Método">
                <StatusBadge status={cobro.metodo_pago} config={COBRO_METODO_PAGO_CONFIG} />
              </InfoField>
              <InfoField label="Referencia">
                {COBRO_REFERENCIA_LABELS[cobro.referencia] ?? cobro.referencia}
              </InfoField>
              <InfoField label="Referencia de operación">
                {textOrDash(cobro.referencia_operacion)}
              </InfoField>
              <InfoField label="Total cobrado">
                <span className="tabular-nums font-semibold">
                  {money(cobro.total_cobrado)}
                  {moneda && <span className="ml-1 text-[11px] text-slate-400">{moneda}</span>}
                </span>
              </InfoField>
              <InfoField label="Estatus">
                <StatusBadge status={cobro.estatus} config={COBRO_ESTATUS_CONFIG} />
              </InfoField>
            </InfoGrid>
          </div>
        </div>

        {cobro.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {cobro.observaciones}
            </p>
          </div>
        )}

        {/* ── Complemento de pago (REP) ───────────────────────────────── */}
        {/* Aquí se colgarán "Timbrar REP" (EC-527) y su descarga (EC-545). */}
        <div>
          <SectionTitle>Complemento de pago (REP)</SectionTitle>
          <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5">
            <InfoGrid>
              <InfoField label="UUID">
                <span className="font-mono text-[11px] break-all">{textOrDash(cobro.rep_uuid)}</span>
              </InfoField>
              <InfoField label="Fecha de timbrado">
                {cobro.rep_fecha_timbrado ? formatShortDateTime(cobro.rep_fecha_timbrado) : "—"}
              </InfoField>
              <InfoField label="Pendiente de confirmar">
                {cobro.rep_pendiente ? (
                  <span className="text-amber-600 dark:text-amber-400">Sí</span>
                ) : (
                  "No"
                )}
              </InfoField>
            </InfoGrid>
          </div>
        </div>

        {/* ── Facturas aplicadas ──────────────────────────────────────── */}
        <div>
          <SectionTitle>Facturas aplicadas</SectionTitle>
          {cxcUnavailable && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              No se pudieron cargar las cuentas por cobrar: se muestra solo el número de cada CxC.
            </p>
          )}
          {cobro.cobro_detalles.length === 0 ? (
            <EmptyLines>Este cobro no tiene facturas aplicadas.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Factura</th>
                  <th className="px-3 py-2 font-medium">Moneda</th>
                  <th className="px-3 py-2 font-medium text-right">Saldo actual</th>
                  <th className="px-3 py-2 font-medium text-right">Importe aplicado</th>
                  <th className="px-3 py-2 font-medium">Observaciones</th>
                </>
              }
            >
              {cobro.cobro_detalles.map((linea) => {
                const cxc = cxcIndex.get(linea.cxc);
                const pending = !cxc && isLoadingCxc;
                const lineMoneda = cxc?.moneda_codigo || null;
                // Misma regla que `findMismatchedMonedas`: solo con ambas monedas
                // conocidas. Una línea así lleva su marca y el código junto a cada
                // importe; las que coinciden conservan su aspecto.
                const isMismatch = moneda !== null && lineMoneda !== null && lineMoneda !== moneda;
                return (
                  <tr
                    key={linea.id}
                    className={`transition-colors ${
                      isMismatch
                        ? "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                        : "hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center gap-1.5">
                        {isMismatch && (
                          <ExclamationTriangleIcon
                            className="h-3.5 w-3.5 shrink-0 text-amber-500"
                            role="img"
                            aria-label={`Factura en ${lineMoneda}, distinta de la moneda del cobro (${moneda})`}
                          >
                            <title>{`Factura en ${lineMoneda}, distinta de la moneda del cobro (${moneda})`}</title>
                          </ExclamationTriangleIcon>
                        )}
                        {cxc?.factura_folio ? cxc.factura_folio : `CxC #${linea.cxc}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {pending ? "…" : cxc?.moneda_codigo ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {/* El saldo es de la CxC: va en la moneda de SU factura. */}
                      {pending ? (
                        "…"
                      ) : cxc ? (
                        <>
                          {formatCobroAmount(cxc.saldo, lineMoneda)}
                          {isMismatch && <CurrencyTag code={lineMoneda} />}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      {money(linea.importe_aplicado)}
                      {isMismatch && <CurrencyTag code={moneda} />}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {textOrDash(linea.observaciones)}
                    </td>
                  </tr>
                );
              })}
            </LineItemsTable>
          )}
        </div>
      </div>
    </MainDialog>
  );
}
