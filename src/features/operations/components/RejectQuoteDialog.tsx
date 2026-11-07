"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { getQuoteStatusLabel } from "@/src/features/quotes/constants/quoteStatus";
import { PENDING_AUTHORIZATION_QUOTE_STATUS } from "@/src/features/quotes/utils/quoteStatusRules";
import { useRejectOperationsQuote } from "../hooks/useRejectOperationsQuote";
import { quoteRejectSchema } from "../schemas/quote-reject.schema";

export interface RejectQuoteDialogTarget {
  id: number;
  cliente_nombre?: string | null;
  cliente_razon_social?: string | null;
}

/** La fila VIVA de la cotización en la consulta del dueño: solo importa su estatus. */
export interface RejectQuoteDialogLiveRow {
  estatus: number;
}

interface RejectQuoteDialogProps {
  open: boolean;
  /** Copia tomada al ABRIR: de ella salen el id y el texto del diálogo. */
  quote: RejectQuoteDialogTarget;
  /**
   * La misma cotización en la consulta que pinta el DUEÑO (el listado de
   * Ventas, la tabla de Mesa de Control o la cola de autorización), o `null`
   * si ya no está en ella. Cada dueño la resuelve de SU fuente, así este
   * diálogo no depende de una consulta concreta.
   */
  liveQuote: RejectQuoteDialogLiveRow | null;
  onClose: () => void;
}

/** Textos del aviso del rechazo que se cerró por un cambio externo. */
const staleMessages = (id: number) => ({
  gone: `La cotización #${id} ya no está pendiente de autorización. Se actualizó el listado.`,
  estadoChanged: (estatus: number) =>
    `La cotización #${id} cambió a ${getQuoteStatusLabel({ estatus }).toLowerCase()} y ya no se puede rechazar.`,
});

/**
 * Diálogo de RECHAZO de una cotización con motivo obligatorio (`comentario`).
 * Lo usan las tres entradas: listado/tablero de Ventas, tabla de Mesa de
 * Control y la cola de autorización.
 *
 * Lo monta SIEMPRE la vista, nunca la celda: al rechazar, la cotización sale
 * del listado de mesa de control (solo trae estatus 2 y 5) o de una vista
 * filtrada, y una celda se llevaría el diálogo a media operación. El dueño le
 * pasa la copia tomada al ABRIR (`useDialogSession`), lo deja montado con
 * `open` controlado para que anime al cerrar y usa el `id` de la sesión como
 * `key`, para que el motivo no se arrastre a otra apertura.
 *
 * Fila desactualizada (EC-752): si la consulta del dueño muestra que la
 * cotización ya no está pendiente de autorización —cambió de estatus en otra
 * pestaña o ya no está en el listado—, el diálogo se cierra con aviso
 * (`getStaleRowDialogNotice`, vía rápida contra lo que el dueño ya tiene). No
 * reemplaza al backend: un cambio que la caché aún no ve lo sigue decidiendo
 * el 400 `cotizacion`. Mientras el rechazo PROPIO está en vuelo no se decide:
 * su respuesta cambia el estatus en la caché y lo cierra el envío.
 *
 * Mismo esqueleto que `VacationRejectDialog`. Errores:
 * - 400 `comentario`: queda abierto con el mensaje bajo el campo.
 * - 400 `cotizacion`/`permiso` o 404: reintentar no sirve; se cierra y el hook
 *   avisa con el mensaje del backend.
 * - Red o 5xx: queda abierto con el motivo escrito (el hook avisa).
 */
export function RejectQuoteDialog({ open, quote, liveQuote, onClose }: RejectQuoteDialogProps) {
  const [comentario, setComentario] = useState("");
  const [comentarioError, setComentarioError] = useState<string | null>(null);
  // `mutateAsync`: el candado se suelta sobre la PROMESA de esta llamada.
  const { mutateAsync } = useRejectOperationsQuote({ onReasonError: setComentarioError });

  // Candado SÍNCRONO del envío (`useRowActionLock`): la ref se marca en el
  // mismo clic, así que un doble clic o un Enter repetido no manda dos
  // `rechazar/`, y cerrar (Volver, Esc, clic fuera) se ignora mientras está
  // tomado. Se suelta cuando la petición termina, con cualquier resultado.
  const rowLock = useRowActionLock();
  const isBusy = rowLock.isPending(quote.id);

  const staleNotice = open
    ? getStaleRowDialogNotice({
        resource: "quote-reject",
        targetId: quote.id,
        target: liveQuote,
        statusField: "estatus",
        expectedEstado: PENDING_AUTHORIZATION_QUOTE_STATUS,
        isBusy,
        messages: staleMessages(quote.id),
      })
    : null;
  const staleKey = staleNotice?.key;
  const staleMessage = staleNotice?.message;

  // Desde un EFECTO y no en render: cerrar actualiza el estado del dueño, otro
  // componente. El `id` del toast es la `key` del aviso, así un render repetido
  // no lo duplica.
  useEffect(() => {
    if (!staleKey || !staleMessage) return;
    toast.error(staleMessage, { id: staleKey });
    onClose();
  }, [staleKey, staleMessage, onClose]);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    // Lee la ref (`isHeld`): vale desde el mismo clic de enviar.
    if (!next && !rowLock.isHeld(quote.id)) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rowLock.isHeld(quote.id)) return;

    const parsed = quoteRejectSchema.safeParse({ comentario });
    if (!parsed.success) {
      setComentarioError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }

    if (!rowLock.acquire(quote.id)) return;
    mutateAsync({ id: quote.id, comentario: parsed.data.comentario })
      .then(onClose, (error: unknown) => {
        if (drfFieldMessage(error, "comentario")) return;
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        if (status === 400 || status === 404) onClose();
      })
      // Después de cerrar: así ningún render intermedio ve el estatus nuevo
      // (ya aplicado a la caché) con el candado suelto y avisa de más.
      .finally(() => rowLock.release(quote.id));
  };

  const cliente = quote.cliente_nombre || quote.cliente_razon_social;

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={false}
      title="Rechazar cotización"
      description={`Se rechazará la cotización #${quote.id}${
        cliente ? ` de ${cliente}` : ""
      }. El vendedor verá el motivo y podrá corregirla y reenviarla a revisión.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <FormTextarea
          label="Motivo del rechazo"
          name="comentario"
          rows={4}
          placeholder="Explica qué debe corregir el vendedor"
          value={comentario}
          disabled={isBusy}
          error={comentarioError ? { message: comentarioError } : undefined}
          onChange={(event) => {
            setComentario(event.target.value);
            if (comentarioError) setComentarioError(null);
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isBusy} />
          <FormSubmitButton
            isPending={isBusy}
            loadingLabel="Rechazando…"
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Rechazar cotización
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
