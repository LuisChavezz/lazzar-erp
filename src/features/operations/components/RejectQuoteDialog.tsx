"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useRejectOperationsQuote } from "../hooks/useRejectOperationsQuote";
import { quoteRejectSchema } from "../schemas/quote-reject.schema";

export interface RejectQuoteDialogTarget {
  id: number;
  cliente_nombre?: string | null;
  cliente_razon_social?: string | null;
}

interface RejectQuoteDialogProps {
  open: boolean;
  quote: RejectQuoteDialogTarget;
  onClose: () => void;
}

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
 * `key`, para que el motivo no se arrastre a otra apertura. No se re-verifica
 * el estatus en el cliente: si cambió, el 400 `cotizacion` del backend manda.
 *
 * Mismo esqueleto que `VacationRejectDialog`. Errores:
 * - 400 `comentario`: queda abierto con el mensaje bajo el campo.
 * - 400 `cotizacion`/`permiso` o 404: reintentar no sirve; se cierra y el hook
 *   avisa con el mensaje del backend.
 * - Red o 5xx: queda abierto con el motivo escrito (el hook avisa).
 */
export function RejectQuoteDialog({ open, quote, onClose }: RejectQuoteDialogProps) {
  const [comentario, setComentario] = useState("");
  const [comentarioError, setComentarioError] = useState<string | null>(null);
  const { mutate, isPending } = useRejectOperationsQuote({ onReasonError: setComentarioError });

  // `isPending` no basta contra dos envíos en el mismo tick: la ref cambia al
  // instante y se libera cuando la mutación termina.
  const submittingRef = useRef(false);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isPending) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const parsed = quoteRejectSchema.safeParse({ comentario });
    if (!parsed.success) {
      setComentarioError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }

    submittingRef.current = true;
    mutate(
      { id: quote.id, comentario: parsed.data.comentario },
      {
        onSettled: () => {
          submittingRef.current = false;
        },
        onSuccess: onClose,
        onError: (error) => {
          if (drfFieldMessage(error, "comentario")) return;
          const status = error instanceof AxiosError ? error.response?.status : undefined;
          if (status === 400 || status === 404) onClose();
        },
      }
    );
  };

  const cliente = quote.cliente_nombre || quote.cliente_razon_social;

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="520px"
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
          disabled={isPending}
          error={comentarioError ? { message: comentarioError } : undefined}
          onChange={(event) => {
            setComentario(event.target.value);
            if (comentarioError) setComentarioError(null);
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
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
