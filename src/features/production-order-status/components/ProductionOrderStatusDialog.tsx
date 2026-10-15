"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import {
  FormCancelButton,
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { PRODUCTION_ORDER_STATUS_CODE } from "@/src/features/production-orders/constants/productionOrderStatus";
import type {
  ChangeStatusErrorHandlers,
  ProductionOrderStatusDialogState,
  ProductionOrderStatusFlow,
} from "../hooks/useProductionOrderStatusFlow";
import { productionOrderStatusMotivoSchema } from "../schemas/production-order-status-motivo.schema";
import type { ChangeProductionOrderStatusBody } from "../interfaces/production-order-status.interface";

type Submit = (
  body: ChangeProductionOrderStatusBody,
  label: string,
  handlers: ChangeStatusErrorHandlers,
) => void;

/** Banner de error dentro del diálogo; mismo estilo que el de recálculo de consumos. */
const ErrorBanner = ({ message }: { message: string | null }) =>
  message ? (
    <p
      role="alert"
      className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-400"
    >
      {message}
    </p>
  ) : null;

const Warning = ({ tone, children }: { tone: "amber" | "red"; children: ReactNode }) => (
  <div
    role="note"
    className={`rounded-xl border px-4 py-3 space-y-1 text-sm ${
      tone === "red"
        ? "border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 text-red-800 dark:text-red-300"
        : "border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 text-amber-800 dark:text-amber-300"
    }`}
  >
    {children}
  </div>
);

/**
 * Candado contra dos envíos en el mismo tick (`isPending` tarda un render). Se
 * toma al enviar y se suelta en el `onSettled` del POST (`release`). Mismo
 * recurso que `RejectQuoteDialog`.
 */
const useSubmitLock = () => {
  const lockedRef = useRef(false);
  return (run: (release: () => void) => void) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    run(() => {
      lockedRef.current = false;
    });
  };
};

// ── Detener / Cancelar ───────────────────────────────────────────────────────

interface MotivoContentProps {
  state: Extract<ProductionOrderStatusDialogState, { kind: "motivo" }>;
  isPending: boolean;
  submit: Submit;
  onCancel: () => void;
}

/**
 * Motivo obligatorio (queda en la auditoría del backend). Cancelar avisa que es
 * irreversible. Un 400 `motivo` va bajo el campo; cualquier otro mensaje, en el
 * banner, con el diálogo abierto y lo escrito intacto.
 */
const MotivoContent = ({ state, isPending, submit, onCancel }: MotivoContentProps) => {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const withLock = useSubmitLock();
  const isCancel = state.destino === PRODUCTION_ORDER_STATUS_CODE.CANCELLED;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = productionOrderStatusMotivoSchema.safeParse({ motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    withLock((release) => {
      setMessage(null);
      submit({ estatus_op: state.destino, motivo: parsed.data.motivo }, state.label, {
        onMotivoError: setMotivoError,
        onMessage: setMessage,
        onSettled: release,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      {isCancel && (
        <Warning tone="red">
          <p className="font-semibold">Esta acción es irreversible.</p>
          <p className="text-xs leading-relaxed">
            Una orden cancelada ya no puede cambiar de estatus ni editar su ruta crítica.
          </p>
        </Warning>
      )}
      <ErrorBanner message={message} />
      <FormTextarea
        label={isCancel ? "Motivo de la cancelación" : "Motivo de la detención"}
        name="motivo"
        rows={3}
        placeholder={isCancel ? "Explica por qué se cancela la orden" : "Explica por qué se detiene la orden"}
        value={motivo}
        disabled={isPending}
        error={motivoError ? { message: motivoError } : undefined}
        onChange={(event) => {
          setMotivo(event.target.value);
          if (motivoError) setMotivoError(null);
        }}
      />
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onCancel} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel={isCancel ? "Cancelando…" : "Deteniendo…"}
          className={
            isCancel
              ? "bg-red-600! hover:bg-red-700! focus:ring-red-500!"
              : "bg-orange-600! hover:bg-orange-700! focus:ring-orange-500!"
          }
        >
          {isCancel ? "Cancelar orden" : "Detener orden"}
        </FormSubmitButton>
      </div>
    </form>
  );
};

// ── Completar ────────────────────────────────────────────────────────────────

interface CompleteContentProps {
  state: Extract<ProductionOrderStatusDialogState, { kind: "complete" }>;
  isPending: boolean;
  submit: Submit;
  onCancel: () => void;
}

const CompleteContent = ({ state, isPending, submit, onCancel }: CompleteContentProps) => {
  const [message, setMessage] = useState<string | null>(null);
  const withLock = useSubmitLock();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    withLock((release) => {
      setMessage(null);
      submit({ estatus_op: state.destino }, state.label, {
        onMessage: setMessage,
        onSettled: release,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <Warning tone="amber">
        <p className="font-semibold">Este cambio no se puede deshacer desde el sistema.</p>
        <p className="text-xs leading-relaxed">
          Además, una orden completada ya no admite recepciones ni el recálculo de consumos.
        </p>
      </Warning>
      <ErrorBanner message={message} />
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onCancel} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Completando…"
          className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
        >
          Completar orden
        </FormSubmitButton>
      </div>
    </form>
  );
};

// ── Requisitos pendientes ────────────────────────────────────────────────────

interface BlockedContentProps {
  state: Extract<ProductionOrderStatusDialogState, { kind: "blocked" }>;
  isPending: boolean;
  submit: Submit;
  onCancel: () => void;
  onOpenCriticalPath: () => void;
}

/**
 * Lista los requisitos que faltan (de la opción del menú o de un 409 del POST)
 * y lleva a la ruta crítica, donde se capturan. "Forzar" solo existe si el
 * backend lo permite (`se_puede_forzar`) y pide su propia confirmación, en este
 * mismo diálogo, antes de mandar `forzar: true`.
 */
const BlockedContent = ({
  state,
  isPending,
  submit,
  onCancel,
  onOpenCriticalPath,
}: BlockedContentProps) => {
  const [confirmingForce, setConfirmingForce] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const withLock = useSubmitLock();

  // Un 409 nuevo (p. ej. al forzar) reemplaza el estado con requisitos
  // vigentes: se vuelve a la lista. Ajuste en render, no en un efecto.
  const [shownState, setShownState] = useState(state);
  if (shownState !== state) {
    setShownState(state);
    setConfirmingForce(false);
  }

  const handleForce = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    withLock((release) => {
      setMessage(null);
      submit({ estatus_op: state.destino, forzar: true }, state.label, {
        onMessage: setMessage,
        onSettled: release,
      });
    });
  };

  if (confirmingForce && state.sePuedeForzar) {
    return (
      <form onSubmit={handleForce} className="space-y-4 py-1">
        <Warning tone="red">
          <p className="font-semibold">¿Forzar el cambio a {state.label}?</p>
          <p className="text-xs leading-relaxed">
            La orden pasará a {state.label} sin cumplir los requisitos de la ruta crítica. El
            cambio queda registrado como forzado.
          </p>
        </Warning>
        <ErrorBanner message={message} />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton
            label="Volver"
            onClick={() => setConfirmingForce(false)}
            disabled={isPending}
          />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Forzando…"
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Sí, forzar cambio
          </FormSubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4 py-1">
      <Warning tone="amber">
        <p className="font-semibold">
          {state.message ?? `Para pasar a ${state.label} faltan requisitos de la ruta crítica.`}
        </p>
        {state.bloqueos.length > 0 ? (
          <ul className="list-disc pl-5 text-xs leading-relaxed space-y-0.5">
            {state.bloqueos.map((bloqueo) => (
              <li key={bloqueo}>{bloqueo}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed">El servidor no detalló cuáles faltan.</p>
        )}
      </Warning>
      <p className="ml-1 text-xs text-slate-500 dark:text-slate-400">
        Se capturan en la ruta crítica de la orden.
      </p>
      <ErrorBanner message={message} />
      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <FormCancelButton label="Cerrar" onClick={onCancel} disabled={isPending} />
        <FormSecondaryButton
          label="Abrir ruta crítica"
          onClick={onOpenCriticalPath}
          disabled={isPending}
        />
        {state.sePuedeForzar && (
          <FormSubmitButton
            type="button"
            onClick={() => setConfirmingForce(true)}
            disabled={isPending}
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Forzar cambio
          </FormSubmitButton>
        )}
      </div>
    </div>
  );
};

// ── Diálogo ──────────────────────────────────────────────────────────────────

interface ProductionOrderStatusDialogProps {
  flow: ProductionOrderStatusFlow;
  /** Folio de la OP para el título. */
  folio: string;
  /** Abre el diálogo de ruta crítica de la página (no se duplica aquí). */
  onOpenCriticalPath: () => void;
}

/**
 * El ÚNICO diálogo del cambio de estatus: su estado (`flow.dialog`) es de la
 * página, así que cerrar el menú o un refetch no lo desmontan. Se monta siempre
 * (controlado) para animar la salida con el último contenido; cada apertura
 * monta contenido nuevo (`key` por sesión y tipo), así que un motivo escrito no
 * se arrastra a la siguiente.
 */
export function ProductionOrderStatusDialog({
  flow,
  folio,
  onOpenCriticalPath,
}: ProductionOrderStatusDialogProps) {
  const { dialog, isPending, submit, closeDialog } = flow;
  const open = dialog !== null;
  const { id: sessionId } = useDialogSession(open, null);

  // Lo que se pinta: el estado vigente y, al cerrar, el último (animación de
  // salida). Ajuste en render, no en un efecto.
  const [lastDialog, setLastDialog] = useState(dialog);
  if (dialog && dialog !== lastDialog) setLastDialog(dialog);
  const shown = dialog ?? lastDialog;

  // "Abrir ruta crítica": primero se cierra este diálogo y el de ruta crítica
  // se abre en `onCloseAutoFocus`, cuando este ya se desmontó (abrir dos
  // `Dialog.Root` en el mismo commit deja a medias el bloqueo de foco/scroll).
  const [openCriticalPathOnClose, setOpenCriticalPathOnClose] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) closeDialog();
  };

  const title = (() => {
    if (!shown) return "";
    const subject = folio ? `orden ${folio}` : "orden";
    switch (shown.kind) {
      case "motivo":
        return shown.destino === PRODUCTION_ORDER_STATUS_CODE.CANCELLED
          ? `Cancelar ${subject}`
          : `Detener ${subject}`;
      case "complete":
        return `Completar ${subject}`;
      case "blocked":
        return `Requisitos pendientes · ${shown.label}`;
    }
  })();

  const description =
    shown?.kind === "blocked"
      ? undefined
      : shown
        ? `La orden pasará a ${shown.label}.`
        : undefined;

  const renderContent = () => {
    if (!shown) return null;
    const key = `${sessionId}-${shown.kind}`;
    switch (shown.kind) {
      case "motivo":
        return (
          <MotivoContent
            key={key}
            state={shown}
            isPending={isPending}
            submit={submit}
            onCancel={closeDialog}
          />
        );
      case "complete":
        return (
          <CompleteContent
            key={key}
            state={shown}
            isPending={isPending}
            submit={submit}
            onCancel={closeDialog}
          />
        );
      case "blocked":
        return (
          <BlockedContent
            key={key}
            state={shown}
            isPending={isPending}
            submit={submit}
            onCancel={closeDialog}
            onOpenCriticalPath={() => {
              setOpenCriticalPathOnClose(true);
              closeDialog();
            }}
          />
        );
    }
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="520px"
      showCloseButton={false}
      title={title}
      description={description}
      onCloseAutoFocus={() => {
        if (!openCriticalPathOnClose) return;
        setOpenCriticalPathOnClose(false);
        onOpenCriticalPath();
      }}
    >
      {renderContent()}
    </MainDialog>
  );
}
