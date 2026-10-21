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
import { Button } from "@/src/components/Button";
import { BanIcon, ExclamationTriangleIcon, ReceiptIcon, ShieldCheckIcon } from "@/src/components/Icons";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import {
  COBRO_ESTATUS_CONFIG,
  COBRO_METODO_PAGO_CONFIG,
  COBRO_REFERENCIA_LABELS,
} from "../constants/collectionStatus";
import {
  buildCxcIndex,
  findMismatchedMonedas,
  isLineMonedaMismatch,
  type CobroRow,
} from "../utils/collection.utils";
import { COBRO_REP_PENDING_MESSAGE, isCobroRepPending } from "../utils/cobroRepStamping";
import { getCobroCancelBlockReason } from "../utils/cobroCancellation";
import { COBRO_REP_DOWNLOAD_FORBIDDEN_MESSAGE, hasCobroRepFile } from "../utils/cobroRepDownload";
import { CobroAmount } from "./CobroAmount";
import { CobroRepDownloadButtons } from "./CobroRepDownloadButtons";

interface CollectionDetailDialogProps {
  /**
   * El cobro ya cargado por el listado — sin fetch propio: `GET
   * /finanzas/cobros/` y el retrieve comparten el mismo `CobroSerializer`, con
   * `cobro_detalles` anidado en ambos. La moneda del cobro llega ya resuelta en
   * la fila (`CobroRow.moneda`); lo que el renglón NO trae (folio de factura,
   * moneda y saldo de cada CxC) se resuelve contra el listado de CxC, una sola
   * consulta.
   */
  cobro: CobroRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre la confirmación de "Timbrar REP"; sin ella no se ofrece el botón. */
  onStampRep?: () => void;
  /**
   * Abre la confirmación de "Cancelar cobro"; sin ella no se ofrece el botón
   * (sin permiso o cobro ya `Cancelado`, ver `canOfferCobroCancel`).
   */
  onCancel?: () => void;
  /**
   * `canDownloadCobroRep` para este cobro y usuario. Con el REP timbrado, `true`
   * ofrece "Descargar PDF/XML" y `false` (sin `R-FIN-FACTURAMA`) muestra una nota.
   */
  canDownloadRep?: boolean;
}

export function CollectionDetailDialog({
  cobro,
  open,
  onOpenChange,
  onStampRep,
  onCancel,
  canDownloadRep = false,
}: CollectionDetailDialogProps) {
  // Sin parámetros: la MISMA entrada de caché que la pantalla de CxC, y con las
  // `Pagada`/`Cancelada` incluidas (las líneas de cobros viejos apuntan ahí).
  const {
    cuentas,
    isLoading: isLoadingCxc,
    isError: isErrorCxc,
    hasLoaded: hasLoadedCxc,
  } = useCuentasPorCobrar();

  const { moneda } = cobro;
  const cxcIndex = buildCxcIndex(cuentas);
  const mismatched = findMismatchedMonedas(cobro, moneda, cxcIndex);
  const cxcUnavailable = isErrorCxc && !hasLoadedCxc;
  // Timbrado sin confirmar: la nota sustituye al botón (el backend rechaza
  // timbrar de nuevo mientras siga marcado).
  const repPending = isCobroRepPending(cobro);
  // REP timbrado (UUID e id de Facturama): descargas con permiso, nota sin él.
  // Excluye a "Timbrar REP", que exige un cobro sin `rep_uuid`.
  const repHasFile = hasCobroRepFile(cobro);
  // "Cancelar cobro": mientras las CxC cargan se muestra deshabilitado; si no se
  // pudieron cargar, se bloquea (no se puede saber si alguna factura se canceló).
  const isCxcPending = isLoadingCxc && !hasLoadedCxc;
  const cancelBlockReason = isCxcPending
    ? null
    : getCobroCancelBlockReason(cobro, hasLoadedCxc ? cxcIndex : null);
  const cancelNoteId = `cobro-${cobro.id}-cancel-note`;

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
        {onCancel && (
          <div className="flex flex-col items-end gap-1.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isCxcPending || cancelBlockReason !== null}
              aria-describedby={isCxcPending || cancelBlockReason ? cancelNoteId : undefined}
              className="text-rose-600! dark:text-rose-400!"
            >
              <BanIcon className="w-4 h-4" aria-hidden="true" />
              Cancelar cobro
            </Button>
            {(isCxcPending || cancelBlockReason) && (
              <p id={cancelNoteId} className="max-w-md text-right text-xs text-slate-500 dark:text-slate-400">
                {isCxcPending ? "Consultando las cuentas por cobrar del cobro…" : cancelBlockReason}
              </p>
            )}
          </div>
        )}

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
                  <CobroAmount value={cobro.total_cobrado} moneda={moneda} />
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
        <div>
          <div className="flex items-start justify-between gap-3">
            <SectionTitle>Complemento de pago (REP)</SectionTitle>
            {/* Solo con permiso y un cobro timbrable (`canStampCobroRep`, lo
                decide `CollectionList`); el diálogo vive allá. */}
            {onStampRep && (
              <Button type="button" variant="primary" onClick={onStampRep} className="mb-2">
                <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
                Timbrar REP
              </Button>
            )}
          </div>
          {repHasFile &&
            (canDownloadRep ? (
              <CobroRepDownloadButtons cobro={cobro} />
            ) : (
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{COBRO_REP_DOWNLOAD_FORBIDDEN_MESSAGE}</p>
            ))}
          {repPending && (
            <div
              role="status"
              className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>{COBRO_REP_PENDING_MESSAGE}</p>
            </div>
          )}
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
                // La misma regla que alimenta el aviso (`findMismatchedMonedas`).
                // Una línea así lleva su marca y el código junto a cada importe;
                // las que coinciden conservan su aspecto.
                const isMismatch = isLineMonedaMismatch(moneda, cxc);
                return (
                  <tr
                    key={linea.id}
                    className={`transition-colors ${
                      isMismatch
                        ? // Fondo + filete izquierdo (sombra interior: un `border-left` en
                          // un `<tr>` no se pinta con bordes colapsados), visible
                          // en claro y en oscuro.
                          "bg-amber-100 hover:bg-amber-100/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/25 shadow-[inset_3px_0_0_var(--color-amber-500)]"
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
                        <CobroAmount value={cxc.saldo} moneda={lineMoneda} showCode={isMismatch} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      <CobroAmount value={linea.importe_aplicado} moneda={moneda} showCode={isMismatch} />
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
