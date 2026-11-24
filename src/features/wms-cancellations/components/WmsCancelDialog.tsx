"use client";

import { useId, type FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { WMS_CANCEL_MOTIVO_MAX } from "../constants/wmsCancellation";
import { useWmsCancelMutation, type WmsCancelAction } from "../hooks/useWmsCancelMutation";
import { WmsCancelFormSchema, type WmsCancelFormValues } from "../schemas/wms-cancel.schema";
import { classifyWmsCancelError, wmsCancelErrorClosesDialog } from "../utils/wmsCancelErrors";

type WmsCancelFormField = keyof WmsCancelFormValues;

const EMPTY_VALUES: WmsCancelFormValues = { motivo: "" };

/** Lo que el diálogo dice y hace: fijo desde que se abre. */
export interface WmsCancelDialogContent<TResult> {
  action: WmsCancelAction<TResult>;
  /** "Cancelar envío", "Revertir traspaso"… */
  title: string;
  /** Qué pasará, con el folio del documento. */
  description: string;
  /** Texto del botón: nunca "Cancelar" solo (se confunde con cerrar). */
  submitLabel: string;
  pendingLabel: string;
  motivoPlaceholder: string;
}

interface WmsCancelDialogProps<TResult> {
  content: WmsCancelDialogContent<TResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo único de las cancelaciones de WMS y de la reversa de una TR (EC-945),
 * con motivo obligatorio de a lo más 500 caracteres. Mismo patrón que
 * `ReceiptCancelDialog`: TanStack Form con el schema Zod, `useFormFieldErrors`
 * para el `motivo` (del schema y del backend), `useMutationLock` contra el doble
 * envío y `useDialogSession` para que el texto no cambie mientras se cierra.
 *
 * Quien lo monta decide si se ofrece (`useCanCancelWmsDocuments` y el estado del
 * documento). Errores (`classifyWmsCancelError`): `motivo` bajo el campo; las
 * reglas de negocio (orden de cancelación, cadena de TR, inventario
 * insuficiente) y el `404` cierran con un toast que trae el mensaje del backend
 * tal cual; `403`, red o 5xx dejan el diálogo abierto con el motivo escrito.
 */
export function WmsCancelDialog<TResult>({ content, open, onOpenChange }: WmsCancelDialogProps<TResult>) {
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
      description={session.snapshot.description}
    >
      <WmsCancelForm key={session.id} content={session.snapshot} onOpenChange={onOpenChange} />
    </MainDialog>
  );
}

function WmsCancelForm<TResult>({
  content,
  onOpenChange,
}: {
  content: WmsCancelDialogContent<TResult>;
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
  } = useFormFieldErrors<WmsCancelFormField>();

  const { mutate, isPending } = useWmsCancelMutation(content.action, {
    onMotivoError: (message) => setServerFieldError("motivo", message),
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

      const parsed = WmsCancelFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");

      mutate(parsed.data.motivo, {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const classified = classifyWmsCancelError(error, content.action.fallbackErrorMessage);
          if (wmsCancelErrorClosesDialog(classified)) onOpenChange(false);
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
        Máximo {WMS_CANCEL_MOTIVO_MAX} caracteres.
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
