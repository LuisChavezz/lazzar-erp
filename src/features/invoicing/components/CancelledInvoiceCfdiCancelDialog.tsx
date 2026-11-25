"use client";

import { useState } from "react";
import { StampConfirmDialog } from "@/src/components/StampConfirmDialog";
import { SatCancelMotiveSelect } from "@/src/components/SatCancelMotiveSelect";
import {
  SAT_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE,
  type SatCancelMotive,
} from "@/src/constants/satCancelMotives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { FormTextarea } from "@/src/components/FormTextarea";
import { CANCEL_REASON_MAX } from "@/src/features/document-cancellation/constants/documentCancellation";
import { CancelReasonFormSchema } from "@/src/features/document-cancellation/schemas/cancel-reason.schema";
import { useCancelCancelledInvoiceCfdi } from "../hooks/useCancelCancelledInvoiceCfdi";
import {
  CANCEL_CANCELLED_INVOICE_CFDI_LABEL,
  CANCELLED_INVOICE_CFDI_ALREADY_REQUESTED_MESSAGE,
  getInvoiceLockedSatCancelMotive,
  isInvoiceCfdiCancellationRequested,
} from "../utils/invoiceCancellation";

/**
 * Lo mínimo para nombrar la factura, avisar de la cancelación ya solicitada y
 * fijar el motivo SAT (fila o retrieve; `cfdi_cancelacion_en_curso_desde` solo
 * viene en el retrieve).
 */
export interface CancelledInvoiceCfdiCancelTarget {
  id: number;
  folio: string | null;
  cfdi_cancelado?: boolean;
  cfdi_cancelacion_solicitada?: boolean;
  cfdi_cancelacion_motivo?: string | null;
  cfdi_cancelacion_en_curso_desde?: string | null;
}

interface CancelledInvoiceCfdiCancelDialogProps {
  invoice: CancelledInvoiceCfdiCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Aviso cuando el precheck encontró la cancelación solicitada después de abrir el diálogo. */
const REQUESTED_SINCE_OPENED_MESSAGE =
  "La cancelación del CFDI se solicitó después de abrir este diálogo. Revisa el aviso y confirma de nuevo.";

/**
 * Confirmación de "Cancelar CFDI ante el SAT" para una factura que YA está
 * `Cancelada` en el ERP y cuyo CFDI sigue vigente (EC-764). Distinto de
 * `InvoiceCancelDialog`: el texto dice que en el ERP no cambia nada más, y el
 * `motivo` que exige toda cancelación (EC-950) lleva una nota: NO reemplaza el
 * motivo de cancelación ya registrado (el backend solo lo agrega a
 * `observaciones`). Su `400` se pinta bajo el campo. Pide el motivo SAT
 * (`SatCancelMotiveSelect`, EC-808): obligatorio y sin valor por defecto;
 * Confirmar queda deshabilitado sin él. Con la cancelación ya solicitada o un
 * intento sin respuesta muestra el motivo fijo, bloqueado.
 *
 * Lo monta el dueño de la vista (`InvoiceList`, `InvoiceMainSheet`), no la
 * celda. Usa la confirmación del timbrado (`StampConfirmDialog`): no se cierra
 * a media petición y se cierra al TERMINAR con cualquier resultado. El
 * toast dice qué pasó y, ante una falla de red o de Facturama, el refetch
 * muestra el estado real del CFDI antes de reintentar. Si la cancelación quedó
 * solicitada, o su motivo quedó fijo en otro, después de abrirlo, el hook no
 * hace el POST: el diálogo sigue abierto con la factura fresca, su aviso y
 * una nota, y pide confirmar de nuevo.
 *
 * El motivo SAT elegido, el motivo escrito y la factura fresca son estado de
 * ESTA apertura (llevan el `session.id`): una apertura nueva arranca en blanco
 * sin remontar el `Dialog.Root`.
 */
export function CancelledInvoiceCfdiCancelDialog({
  invoice,
  open,
  onOpenChange,
}: CancelledInvoiceCfdiCancelDialogProps) {
  const session = useDialogSession(open, invoice);
  // Factura fresca de ESTA apertura cuando hubo que reconfirmar (`needs-confirmation`).
  const [fresh, setFresh] = useState<{
    sessionId: number;
    invoice: CancelledInvoiceCfdiCancelTarget;
    notice: string;
  } | null>(null);
  // Motivo SAT elegido en ESTA apertura; ninguno al abrir (sin valor por defecto).
  const [choice, setChoice] = useState<{ sessionId: number; motive: SatCancelMotive } | null>(
    null,
  );
  const reconfirm = fresh !== null && fresh.sessionId === session.id;
  const target = reconfirm ? fresh.invoice : session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";
  const requested = target ? isInvoiceCfdiCancellationRequested(target) : false;
  const lockedMotive = target ? getInvoiceLockedSatCancelMotive(target) : null;
  const chosenMotive = choice !== null && choice.sessionId === session.id ? choice.motive : null;
  // Motivo escrito y su error en ESTA apertura.
  const [reason, setReason] = useState<{ sessionId: number; text: string; error: string | null } | null>(
    null,
  );
  const motivo = reason !== null && reason.sessionId === session.id ? reason.text : "";
  const motivoError = reason !== null && reason.sessionId === session.id ? reason.error : null;
  const motivoSat = lockedMotive ?? chosenMotive;

  const { cancelCfdi, isCancelling, isIdle } = useCancelCancelledInvoiceCfdi(target?.id ?? 0);

  const description =
    (reconfirm && fresh ? `${fresh.notice} ` : "") +
    `La factura ${invoiceLabel} ya está cancelada en el ERP, pero su CFDI sigue vigente ante el SAT. ` +
    "Se cancelará solo el CFDI ante el SAT, con el motivo que elijas. " +
    "En el ERP no cambia nada más: ni el estatus de la factura, ni su cuenta por cobrar, ni el inventario, ni las pólizas." +
    (requested ? ` ${CANCELLED_INVOICE_CFDI_ALREADY_REQUESTED_MESSAGE}` : "");

  return (
    <StampConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={CANCEL_CANCELLED_INVOICE_CFDI_LABEL}
      description={description}
      confirmText="Cancelar CFDI"
      busyText="Cancelando CFDI…"
      confirmColor="red"
      isStamping={isCancelling}
      isIdle={isIdle}
      confirmDisabled={motivoSat === null}
      onConfirm={() => {
        if (!target || motivoSat === null) return;
        const sessionId = session.id;
        const parsed = CancelReasonFormSchema.safeParse({ motivo });
        if (!parsed.success) {
          setReason({ sessionId, text: motivo, error: parsed.error.issues[0]?.message ?? "Motivo inválido" });
          return;
        }
        cancelCfdi(
          { shownRequested: requested, motivoSat, motivo: parsed.data.motivo },
          {
            onDone: () => onOpenChange(false),
            onMotivoError: (message) => setReason({ sessionId, text: motivo, error: message }),
            onNeedsConfirmation: (invoice) =>
              setFresh({
                sessionId,
                invoice,
                // Lo que cambió: la solicitud o, si no, el motivo fijo.
                notice:
                  !requested && isInvoiceCfdiCancellationRequested(invoice)
                    ? REQUESTED_SINCE_OPENED_MESSAGE
                    : SAT_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE,
              }),
          },
        );
      }}
    >
      {target && (
        <div className="space-y-4">
          <SatCancelMotiveSelect
            id={`cancelled-invoice-cfdi-motivo-sat-${target.id}`}
            value={chosenMotive}
            lockedMotive={lockedMotive}
            disabled={isCancelling}
            onChange={(motive) => setChoice({ sessionId: session.id, motive })}
          />
          <div>
            <FormTextarea
              id={`cancelled-invoice-cfdi-motivo-${target.id}`}
              label="Motivo"
              aria-describedby={`cancelled-invoice-cfdi-motivo-${target.id}-help`}
              name="motivo"
              rows={3}
              placeholder="Explica por qué se cancela el CFDI"
              value={motivo}
              maxLength={CANCEL_REASON_MAX}
              disabled={isCancelling}
              error={motivoError ? { message: motivoError } : undefined}
              onChange={(event) => setReason({ sessionId: session.id, text: event.target.value, error: null })}
            />
            <p
              id={`cancelled-invoice-cfdi-motivo-${target.id}-help`}
              className="mt-1 ml-1 text-xs text-slate-500 dark:text-slate-400"
            >
              No reemplaza el motivo con que se canceló la factura: queda como nota en sus observaciones. Máximo{" "}
              {CANCEL_REASON_MAX} caracteres.
            </p>
          </div>
        </div>
      )}
    </StampConfirmDialog>
  );
}
