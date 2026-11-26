"use client";

import { useId, useState, type FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormErrorBanner } from "@/src/components/FormErrorBanner";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { CANCEL_REASON_MAX } from "../constants/documentCancellation";
import { useCancelMutation, type CancelAction } from "../hooks/useCancelMutation";
import { CancelReasonFormSchema, type CancelReasonFormValues } from "../schemas/cancel-reason.schema";
import { cancelDialogClosesOnError } from "../utils/cancelErrors";

type CancelReasonFormField = keyof CancelReasonFormValues;

const EMPTY_VALUES: CancelReasonFormValues = { motivo: "" };

/** Lo que el diálogo dice y hace: fijo desde que se abre. */
export interface CancelDialogContent<TResult> {
  action: CancelAction<TResult>;
  /** "Cancelar envío", "Revertir traspaso"… */
  title: string;
  /** Qué pasará, con el folio del documento. */
  description: string;
  /** Texto del botón: nunca "Cancelar" solo (se confunde con cerrar). */
  submitLabel: string;
  pendingLabel: string;
  motivoPlaceholder: string;
  /**
   * Tras el éxito, con la respuesta: para un detalle que muestra una fila que
   * puede salir de su listado (p. ej. el envío bajo `?estado=ACTIVO`).
   */
  onSuccess?: (result: TResult) => void;
  /**
   * Un `400` de negocio (`blocked`, `retryable`) deja el diálogo ABIERTO con el
   * motivo escrito y el mensaje del backend en un aviso, en vez de cerrarlo con
   * un toast (EC-948: "cancela primero la SM-…"). Sin él, el comportamiento de
   * WMS: `blocked` cierra con toast.
   */
  keepOpenOnBlocked?: boolean;
}

interface CancelReasonDialogProps<TResult> {
  content: CancelDialogContent<TResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Texto que REEMPLAZA en vivo a `content.description` (fijo desde que se
   * abre): para una descripción que cambia con el diálogo abierto sin volver a
   * montarlo, así lo escrito en el motivo se conserva (la conciliación, cuyo
   * estatus se verifica después de abrir). Sin él, todo como antes.
   */
  liveDescription?: string;
}

/**
 * Diálogo único de las cancelaciones con motivo (WMS, EC-945; Producción,
 * EC-948) y de la reversa de una TR, con motivo obligatorio de a lo más 500
 * caracteres. Mismo patrón que `ReceiptCancelDialog`: TanStack Form con el
 * schema Zod, `useFormFieldErrors` para el `motivo` (del schema y del
 * backend), `useMutationLock` contra el doble envío y `useDialogSession` para
 * que el texto no cambie mientras se cierra.
 *
 * Quien lo monta decide si se ofrece (permiso y estado del documento). Errores
 * (`action.classifyError`): `motivo` bajo el campo; las reglas de negocio
 * cierran con un toast (o, con `keepOpenOnBlocked`, se quedan en un aviso) con
 * el mensaje del backend tal cual; el `404` cierra; `403`, red o 5xx dejan el
 * diálogo abierto con el motivo escrito.
 */
export function CancelReasonDialog<TResult>({
  content,
  open,
  onOpenChange,
  liveDescription,
}: CancelReasonDialogProps<TResult>) {
  const session = useDialogSession(open, content);
  const { isRunning } = useMutationLock(session.snapshot.action.mutationKey);
  const handleOpenChange = (next: boolean) => {
    if (!next && isRunning) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title={session.snapshot.title}
      description={liveDescription ?? session.snapshot.description}
    >
      <CancelReasonForm key={session.id} content={session.snapshot} onOpenChange={onOpenChange} />
    </MainDialog>
  );
}

interface CancelReasonDialogForProps<TTarget, TResult> {
  /** El documento a cancelar, o `null` mientras no hay uno elegido. */
  target: TTarget | null;
  content: (target: TTarget) => CancelDialogContent<TResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * `CancelReasonDialog` para un documento que puede faltar: la fila elegida en
 * un listado (Finanzas, EC-950), que el dueño pone en `null` al cerrar. Toma la
 * copia del documento al ABRIR (`useDialogSession`), así que el texto no se
 * vacía durante la animación de salida, y no monta nada antes de la primera
 * apertura.
 */
export function CancelReasonDialogFor<TTarget, TResult>({
  target,
  content,
  open,
  onOpenChange,
}: CancelReasonDialogForProps<TTarget, TResult>) {
  const session = useDialogSession(open, target);
  if (session.snapshot === null) return null;
  return <CancelReasonDialog content={content(session.snapshot)} open={open} onOpenChange={onOpenChange} />;
}

function CancelReasonForm<TResult>({
  content,
  onOpenChange,
}: {
  content: CancelDialogContent<TResult>;
  onOpenChange: (open: boolean) => void;
}) {
  const maxHintId = useId();
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<CancelReasonFormField>();
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const keepOpenOnBlocked = content.keepOpenOnBlocked === true;

  const { mutate, isPending } = useCancelMutation(content.action, {
    onMotivoError: (message) => setServerFieldError("motivo", message),
    onBlockedError: keepOpenOnBlocked ? setBlockedMessage : undefined,
  });
  // Doble envío: `isPending` llega un render tarde; `isIdle()` consulta la caché
  // de mutaciones al instante.
  const { isIdle } = useMutationLock(content.action.mutationKey);

  const close = () => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (isPending) return;
    onOpenChange(false);
  };

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    onSubmit: ({ value }) => {
      if (!isIdle()) return;
      clearServerErrors();
      setBlockedMessage(null);

      const parsed = CancelReasonFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");

      mutate(parsed.data.motivo, {
        onSuccess: (result) => {
          content.onSuccess?.(result);
          onOpenChange(false);
        },
        onError: (error) => {
          if (cancelDialogClosesOnError(content.action.classifyError(error), keepOpenOnBlocked)) {
            onOpenChange(false);
          }
        },
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <FormErrorBanner message={blockedMessage} />
      <form.Field name="motivo">
        {(field) => (
          <FormTextarea
            label="Motivo"
            name={field.name}
            rows={3}
            placeholder={content.motivoPlaceholder}
            value={field.state.value}
            disabled={isPending}
            error={getError("motivo")}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldErrors("motivo");
            }}
            // Se valida al enviar, no en blur (ver `ReceiptCancelDialog`).
            onBlur={field.handleBlur}
            aria-describedby={maxHintId}
          />
        )}
      </form.Field>
      <p id={maxHintId} className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
        Máximo {CANCEL_REASON_MAX} caracteres.
      </p>
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={close} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel={content.pendingLabel}
          className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
        >
          {content.submitLabel}
        </FormSubmitButton>
      </div>
    </form>
  );
}
