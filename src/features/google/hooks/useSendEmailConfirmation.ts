"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { isRecordMutating } from "@/src/utils/mutationRecordId";
import { createSendEmailFlow } from "../utils/sendEmailFlow";

export const EMAIL_RECORD_BUSY_MESSAGE =
  "Este documento tiene otra acción en curso. Espera a que termine e intenta de nuevo.";

/** Sesión del diálogo de confirmación: `key` y props del diálogo de cada dominio. */
export interface SendEmailDialogSession<T> {
  sessionId: number;
  props: {
    open: boolean;
    email: T;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  };
}

interface UseSendEmailConfirmationOptions<T extends { id: number }> {
  /**
   * Mutaciones que ocupan el registro mientras están en curso (sus variables
   * son el id o un objeto con `id`): con alguna pendiente no se prepara otro
   * correo de ese registro, y confirmar avisa en vez de enviar. Incluye la
   * mutación que ENVÍA (con el correo como variables, o en `variables.email`):
   * es el candado contra confirmar dos veces el mismo correo.
   */
  busyMutationKeys: readonly (readonly unknown[])[];
  /** Prepara el correo del registro; si falla, su mutación ya avisó. */
  prepare: (id: number) => Promise<T>;
  /** Envía el correo confirmado. */
  send: (email: T) => void;
  /**
   * Registro que muestra quien llama (la página de detalle). Si cambia, lo que
   * se estuviera preparando o confirmando del anterior se descarta: nunca se
   * abre la confirmación de otro registro. Las vistas de listado no lo pasan.
   */
  expectedId?: number;
}

/**
 * "Enviar correo" con confirmación, una sola vez para cotizaciones, facturas y
 * órdenes de compra (EC-700). La lógica vive en `createSendEmailFlow`; aquí
 * solo se le da estado de React:
 *
 * - `request(id)` prepara el correo y, al terminar, abre la confirmación.
 * - `dialog` es la sesión del diálogo de confirmación (`sessionId` para la
 *   `key` y `props`), con `useDialogSession`: el correo es la foto tomada al
 *   abrir y sobrevive a la animación de salida. `null` mientras no se haya
 *   abierto ninguno. Uso: `{d && <XDialog key={d.sessionId} {...d.props} />}`.
 * - `invalidate()` descarta lo que se esté preparando (otra acción de la vista
 *   abrió su propio diálogo).
 *
 * Que el registro no haya cambiado entre preparar y confirmar lo revisa el
 * envío de cada dominio (vuelve a leerlo y lo compara con la foto).
 */
export function useSendEmailConfirmation<T extends { id: number }>({
  busyMutationKeys,
  prepare,
  send,
  expectedId,
}: UseSendEmailConfirmationOptions<T>) {
  const queryClient = useQueryClient();
  const turnRef = useRef(0);
  const [prepared, setPrepared] = useState<T | null>(null);

  // Cambió el registro de la vista: se cierra la confirmación del anterior
  // (aquí, en el render). Lo que se esté preparando lo descarta el flujo al
  // terminar (`getExpectedId`), que lee el registro vigente de este ref.
  const [lastExpectedId, setLastExpectedId] = useState(expectedId);
  if (lastExpectedId !== expectedId) {
    setLastExpectedId(expectedId);
    setPrepared(null);
  }
  const expectedIdRef = useRef(expectedId);
  useEffect(() => {
    expectedIdRef.current = expectedId;
  }, [expectedId]);

  const open = prepared !== null;
  const session = useDialogSession(open, prepared);

  const flow = () =>
    createSendEmailFlow<T>({
      turn: turnRef,
      isBusy: (id) => isRecordMutating(queryClient, busyMutationKeys, id),
      // La mutación de envío lleva el correo como variables (o dentro de ellas,
      // en el listado de facturas): es el candado contra el doble "Enviar".
      isSending: (sent) =>
        busyMutationKeys.some(
          (mutationKey) =>
            queryClient.getMutationCache().findAll({
              mutationKey: [...mutationKey],
              status: "pending",
              predicate: (mutation) => {
                const variables = mutation.state.variables;
                return (
                  variables === sent ||
                  (typeof variables === "object" &&
                    variables !== null &&
                    (variables as { email?: unknown }).email === sent)
                );
              },
            }).length > 0,
        ),
      getExpectedId: () => expectedIdRef.current,
      prepare,
      send,
      onPrepared: setPrepared,
      onBusy: () => toast.error(EMAIL_RECORD_BUSY_MESSAGE),
    });

  const email = session.snapshot;
  const dialog: SendEmailDialogSession<T> | null = email && {
    /** `key` del diálogo: cada apertura monta contenido nuevo. */
    sessionId: session.id,
    props: {
      open,
      email,
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) setPrepared(null);
      },
      onConfirm: () => flow().confirm(email),
    },
  };

  return {
    request: (id: number) => void flow().request(id),
    invalidate: () => flow().invalidate(),
    dialog,
  };
}
