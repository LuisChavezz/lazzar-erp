"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { BanIcon, CheckCircleIcon, ClipboardListIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { CancellationInfo } from "@/src/components/CancellationInfo";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CancelReasonDialog } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { formatExactQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { useRfidReconciliationDetail } from "../hooks/useRfidReconciliationDetail";
import { useAcceptRfidReconciliation } from "../hooks/useAcceptRfidReconciliation";
import { rfidReconciliationCancelDialogContent } from "../utils/rfidReconciliationCancelAction";
import {
  RECEIPTS_PATH,
  RFID_RECONCILIATION_STATUS_CONFIG,
  RFID_RECONCILIATION_TIPO_ORIGEN_LABELS,
  RFID_RECONCILIATION_WRITE_PERMISSION,
  rfidReconciliationActions,
  rfidReconciliationInlineLabel,
  rfidReconciliationLabel,
  rfidReconciliationOriginFolio,
} from "../constants/rfidReconciliations";
import type { RfidReconciliation } from "../interfaces/rfid-reconciliation.interface";
import { RfidReconciliationScanPanel } from "./RfidReconciliationScanPanel";
import { knownReadEpcs, unassignedReadReason } from "../utils/rfidReadResult";
import { acceptAvailability, reconciliationBalance } from "../utils/rfidReconciliationBalance";
import { refreshListAfterReading } from "../utils/rfidReconciliationCache";

const acceptDescription = (data: RfidReconciliation) =>
  `El ${rfidReconciliationInlineLabel(data)} quedará aceptado y ya no se podrán leer más etiquetas. No mueve inventario ni crea la recepción: esa se registra después en Nueva Recepción.`;

interface RfidReconciliationDetailDialogProps {
  /** Id del encuadre; `null` mantiene la consulta apagada. */
  reconciliationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un encuadre RFID (EC-961), por id: lo abren el listado, el alta
 * (recién creado, para leer etiquetas) y la bitácora (`encuadre_rfid`). Lee
 * `GET .../{id}/`, que trae lecturas y resumen (el listado no).
 *
 * Con `C-WMS-RECEPCIONES`: leer con la antena y "Aceptar" mientras está PENDIENTE;
 * "Cancelar" en PENDIENTE y ACEPTADO. Aceptar no crea la recepción: el aviso
 * de aceptado lleva a Nueva Recepción, donde se elige la misma orden y el
 * almacén (esa pantalla no recibe valores iniciales todavía).
 *
 * "Aceptar" espera a que la lectura con la antena esté en pausa y no quede nada
 * por enviar (`acceptAvailability`): la confirmación muestra los totales finales
 * y ninguna lectura llega después de aceptar. Pausar la lectura o cerrar el
 * detalle relee el listado una vez.
 */
export function RfidReconciliationDetailDialog({
  reconciliationId,
  open,
  onOpenChange,
}: RfidReconciliationDetailDialogProps) {
  const id = reconciliationId ?? 0;
  const { data, isLoading, isInitialError, isNotFound, error } = useRfidReconciliationDetail(id);
  const { data: session } = useSession();
  const canWrite = hasPermission(RFID_RECONCILIATION_WRITE_PERMISSION, session?.user);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [pendingReads, setPendingReads] = useState(0);
  const accept = useAcceptRfidReconciliation(id);
  const queryClient = useQueryClient();
  // Lo que nombran los diálogos, tal como estaba al abrirlos.
  const acceptSession = useDialogSession(isAcceptOpen, data);
  const cancelSession = useDialogSession(isCancelOpen, data);

  const handleReadingChange = (next: boolean) => {
    setReading(next);
    if (!next) refreshListAfterReading(queryClient);
  };
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReading(false);
      refreshListAfterReading(queryClient);
    }
    onOpenChange(next);
  };

  const actions = data ? rfidReconciliationActions(data.estatus) : null;
  const acceptState = data ? acceptAvailability({ estatus: data.estatus, reading, pendingReads }) : null;
  const headerAction =
    data && actions && !isNotFound && canWrite && (actions.canAccept || actions.canCancel) ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions.canAccept && acceptState?.reason && (
          <span role="status" className="text-[11px] text-slate-500 dark:text-slate-400">
            {acceptState.reason}
          </span>
        )}
        {actions.canAccept && (
          <Button
            variant="primary"
            onClick={() => setIsAcceptOpen(true)}
            disabled={accept.isPending || !acceptState?.allowed}
            className="px-3! py-1.5! text-xs!"
          >
            <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
            Aceptar
          </Button>
        )}
        {actions.canCancel && (
          <Button
            variant="secondary"
            onClick={() => setIsCancelOpen(true)}
            disabled={accept.isPending}
            className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
          >
            <BanIcon className="w-4 h-4" aria-hidden="true" />
            Cancelar
          </Button>
        )}
      </div>
    ) : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="920px"
      showCloseButton={true}
      headerAction={headerAction}
      title={
        <div className={`flex items-center gap-2.5 ${headerAction ? "" : "pr-8"}`}>
          <ClipboardListIcon className="w-5 h-5 text-sky-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">Encuadre RFID</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {data ? rfidReconciliationLabel(data) : isInitialError || isNotFound ? "Error al cargar" : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {isLoading && <Loader title="Cargando el encuadre..." className="py-16" />}
      {isNotFound && (
        <ErrorState title="Error al cargar el encuadre" message="No tienes acceso a este encuadre o ya no existe." />
      )}
      {isInitialError && <ErrorState title="Error al cargar el encuadre" message={(error as Error)?.message} />}

      {!isLoading && data && !isNotFound && (
        <ReconciliationBody
          data={data}
          canScan={canWrite && (actions?.canScan ?? false)}
          reading={reading}
          onReadingChange={handleReadingChange}
          onPendingChange={setPendingReads}
        />
      )}

      {/* Los diálogos se montan con el permiso, aparte de sus botones, para que
          cierren con su animación cuando el botón desaparece. */}
      {canWrite && acceptSession.snapshot && (
        <ConfirmDialog
            key={acceptSession.id}
            open={isAcceptOpen}
            onOpenChange={setIsAcceptOpen}
            title="Aceptar encuadre"
            description={acceptDescription(acceptSession.snapshot)}
            confirmText={accept.isPending ? "Aceptando…" : "Aceptar encuadre"}
            confirmColor="blue"
            closeOnConfirm={false}
            busy={accept.isPending}
            onConfirm={() => accept.mutate(undefined, { onSettled: () => setIsAcceptOpen(false) })}
          >
            <AcceptMismatchNote data={acceptSession.snapshot} />
          </ConfirmDialog>
      )}
      {canWrite && cancelSession.snapshot && (
        <CancelReasonDialog
          key={cancelSession.id}
          content={rfidReconciliationCancelDialogContent(cancelSession.snapshot)}
          open={isCancelOpen}
          onOpenChange={setIsCancelOpen}
        />
      )}
    </MainDialog>
  );
}

/**
 * Aviso de la confirmación cuando el encuadre no cuadra: algún renglón con
 * diferencia o lecturas sin asignar (no `completo`, que cuenta también las
 * lecturas sin asignar).
 */
function AcceptMismatchNote({ data }: { data: RfidReconciliation }) {
  const balance = reconciliationBalance(data.resumen);
  if (balance.cuadra) return null;
  const renglones = balance.renglonesConDiferencia;
  return (
    <p
      role="note"
      className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
    >
      Lo leído no coincide con lo esperado: {formatExactQuantityValue(balance.leido)} asignadas de{" "}
      {formatExactQuantityValue(balance.esperado)} esperadas
      {renglones > 0 && `, ${renglones} ${renglones === 1 ? "renglón" : "renglones"} con diferencia`}
      {balance.sinAsignar > 0 && `, ${formatExactQuantityValue(balance.sinAsignar)} sin asignar`}. Puedes aceptarlo
      de todos modos.
    </p>
  );
}

interface ReconciliationBodyProps {
  data: RfidReconciliation;
  canScan: boolean;
  reading: boolean;
  onReadingChange: (reading: boolean) => void;
  onPendingChange: (pending: number) => void;
}

function ReconciliationBody({ data, canScan, reading, onReadingChange, onPendingChange }: ReconciliationBodyProps) {
  const { data: session } = useSession();
  const originFolio = rfidReconciliationOriginFolio(data);
  const originHref =
    data.tipo_origen === "OC" && data.orden_compra
      ? purchaseOrderDetailHref(data.orden_compra)
      : data.tipo_origen === "OP" && data.op
        ? productionOrderDetailPath(data.op)
        : null;
  const canOpenOrigin = originHref !== null && canAccessRoute(originHref.split("?")[0], session?.user);
  const knownEpcs = knownReadEpcs(data.lecturas);
  const resumen = data.resumen;
  // Desde los renglones: lo sin asignar no cuenta como leído (va aparte).
  const balance = reconciliationBalance(resumen);

  return (
    <div className="space-y-5">
      {data.estatus === "CANCELADO" && (
        <CancellationInfo
          title="Encuadre cancelado"
          motivo={data.motivo_cancelacion}
          fecha={data.fecha_cancelacion}
          canceladoPor={data.cancelado_por_nombre}
        />
      )}

      {data.estatus === "ACEPTADO" && <AcceptedNotice data={data} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
        <InfoField label="Estatus">
          <StatusBadge status={data.estatus} config={RFID_RECONCILIATION_STATUS_CONFIG} />
        </InfoField>
        <InfoField label={RFID_RECONCILIATION_TIPO_ORIGEN_LABELS[data.tipo_origen] ?? "Origen"}>
          {originHref && originFolio && canOpenOrigin ? (
            <Link href={originHref} title="Ver orden" className="font-mono text-sky-600 dark:text-sky-400 hover:underline">
              {originFolio}
            </Link>
          ) : (
            <span className="font-mono">{textOrDash(originFolio)}</span>
          )}
        </InfoField>
        <InfoField label="Proveedor">{textOrDash(data.proveedor_nombre)}</InfoField>
        <InfoField label="Almacén">{textOrDash(data.almacen_nombre)}</InfoField>
        <InfoField label="Fecha">
          <span className="tabular-nums">{formatShortDateTime(data.fecha_recepcion ?? data.created_at)}</span>
        </InfoField>
        <InfoField label="Remisión">
          <span className="font-mono">{textOrDash(data.remision)}</span>
        </InfoField>
        <InfoField label="Factura de referencia">
          <span className="font-mono">{textOrDash(data.factura_referencia)}</span>
        </InfoField>
        <InfoField label="Serie">
          <span className="font-mono">{textOrDash(data.serie_codigo)}</span>
        </InfoField>
        {data.observaciones?.trim() && (
          <InfoField label="Observaciones" className="col-span-2 sm:col-span-4">
            <span className="whitespace-pre-line wrap-break-word">{data.observaciones}</span>
          </InfoField>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TotalTile label="Esperado" value={balance.esperado} />
        <TotalTile label="Leído asignado" value={balance.leido} tone={balance.cuadra ? "ok" : undefined} />
        <TotalTile label="Sin asignar" value={balance.sinAsignar} tone={balance.sinAsignar > 0 ? "warn" : undefined} />
        <TotalTile label="Diferencia" value={balance.diferencia} tone={balance.cuadra ? "ok" : "warn"} />
      </div>

      {canScan && (
        <RfidReconciliationScanPanel
          reconciliationId={data.id}
          knownEpcs={knownEpcs}
          leidoAsignado={balance.leido}
          esperado={balance.esperado}
          reading={reading}
          onReadingChange={onReadingChange}
          onPendingChange={onPendingChange}
        />
      )}

      <div>
        <SectionTitle>Esperado contra leído</SectionTitle>
        {resumen.detalle.length === 0 ? (
          <EmptyLines>La orden ya no tiene renglones por recibir.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Talla</th>
                <th className="px-3 py-2 font-medium text-right">Ordenado</th>
                <th className="px-3 py-2 font-medium text-right">Ya recibido</th>
                <th className="px-3 py-2 font-medium text-right">Esperado</th>
                <th className="px-3 py-2 font-medium text-right">Leído</th>
                <th className="px-3 py-2 font-medium text-right">Diferencia</th>
              </>
            }
          >
            {resumen.detalle.map((line) => {
              const diff = safeParseAmount(line.diferencia);
              return (
                <tr key={line.detalle_id}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{textOrDash(line.producto_nombre)}</td>
                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{textOrDash(line.producto_variante_sku)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(line.producto_variante_talla)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatExactQuantityValue(line.ordenado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatExactQuantityValue(line.ya_recibido)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatExactQuantityValue(line.esperado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatExactQuantityValue(line.leido)}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-semibold ${
                      diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {formatExactQuantityValue(line.diferencia)}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </div>

      <div>
        <SectionTitle>Lecturas ({data.lecturas.length})</SectionTitle>
        {data.lecturas.length === 0 ? (
          <EmptyLines>Aún no hay lecturas.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">EPC / código</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Renglón</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
              </>
            }
          >
            {[...data.lecturas].reverse().map((read) => {
              const reason = unassignedReadReason(read);
              return (
                <tr key={read.id}>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{read.codigo_tag}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {textOrDash(read.producto_variante_nombre || read.producto_nombre)}
                  </td>
                  <td className="px-3 py-2">
                    {reason === null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Asignada</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Sin asignar · {reason}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-500 dark:text-slate-400">
                    {formatShortDateTime(read.created_at)}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </div>
    </div>
  );
}

function TotalTile({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-800 dark:text-white";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{formatExactQuantityValue(value)}</p>
    </div>
  );
}

/**
 * Aviso de encuadre aceptado: quién y cuándo, y el siguiente paso. Nueva
 * Recepción no recibe la orden ni el almacén por la URL, así que el aviso los
 * nombra para elegirlos allá.
 */
function AcceptedNotice({ data }: { data: RfidReconciliation }) {
  const { data: session } = useSession();
  const canOpenReceipts = canAccessRoute(RECEIPTS_PATH, session?.user);
  const folio = rfidReconciliationOriginFolio(data) ?? "la orden";
  const almacen = data.almacen_nombre?.trim() || "el almacén del encuadre";
  return (
    <section
      aria-label="Encuadre aceptado"
      className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 space-y-2"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        Encuadre aceptado
      </h3>
      <p className="text-sm text-slate-700 dark:text-slate-200">
        El conteo quedó validado, pero todavía no entra nada al inventario. Registra la recepción de{" "}
        <b className="font-mono">{folio}</b> en <b>{almacen}</b> desde Nueva Recepción.
      </p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex gap-1.5">
          <dt className="text-slate-500 dark:text-slate-400">Fecha:</dt>
          <dd>{formatShortDateTime(data.fecha_aceptacion)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-500 dark:text-slate-400">Aceptó:</dt>
          <dd>{data.aceptado_por_nombre?.trim() || "—"}</dd>
        </div>
      </dl>
      {canOpenReceipts && (
        <Link
          href={RECEIPTS_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          Ir a Recepciones
        </Link>
      )}
    </section>
  );
}
