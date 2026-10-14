"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { acceptsResendComment } from "../utils/quoteStatusRules";

interface QuoteSubmitForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: number;
  /** Estatus de la cotización al abrir: decide si se ofrece el comentario. */
  estatus: number;
  /** Texto del diálogo de confirmación simple (estatus distinto de 4). */
  description: string;
  confirmText?: string;
  /**
   * `comentario` solo llega desde estatus 4 y solo si se escribió algo (ya
   * recortado). El diálogo se cierra justo después, como el de confirmación.
   */
  onConfirm: (comentario?: string) => void;
}

/**
 * Confirmación de "Enviar a revisión", compartida por el menú de la
 * cotización y el arrastre del tablero.
 *
 * - Desde 4 (rechazada): reenvío con un comentario OPCIONAL para mesa de
 *   control, el único caso en que el backend lo guarda.
 * - Desde cualquier otro estatus: el `ConfirmDialog` de siempre, sin campo.
 */
export function QuoteSubmitForReviewDialog({
  open,
  onOpenChange,
  quoteId,
  estatus,
  description,
  confirmText = "Enviar a revisión",
  onConfirm,
}: QuoteSubmitForReviewDialogProps) {
  if (!acceptsResendComment(estatus)) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Enviar a revisión"
        description={description}
        confirmText={confirmText}
        cancelText="Cancelar"
        confirmColor="blue"
        onConfirm={() => onConfirm()}
      />
    );
  }

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="520px"
      showCloseButton={false}
      title="Reenviar a revisión"
      description={`La cotización #${quoteId} volverá a "Por Autorizar" y no podrá editarse mientras esté en revisión.`}
    >
      {/* Aparte para que el texto se monte y desmonte con el contenido del
          diálogo: cada apertura empieza vacía. */}
      <ResendCommentForm
        onCancel={() => onOpenChange(false)}
        onSubmit={(comentario) => {
          onConfirm(comentario);
          onOpenChange(false);
        }}
      />
    </MainDialog>
  );
}

function ResendCommentForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (comentario?: string) => void;
}) {
  const [comentario, setComentario] = useState("");
  // Un solo envío por apertura: el diálogo se cierra al confirmar, pero
  // mientras anima un segundo clic o Enter volvería a mandar el POST. La ref
  // cambia al instante (dos eventos en el mismo tick); el estado deshabilita
  // el botón. El formulario se monta de nuevo en cada apertura.
  const submittingRef = useRef(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitted(true);
    const trimmed = comentario.trim();
    onSubmit(trimmed || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <FormTextarea
        label="Comentario para mesa de control (opcional)"
        name="comentario"
        rows={4}
        placeholder="Explica qué corregiste respecto al motivo del rechazo"
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
      />
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Cancelar" onClick={onCancel} />
        <FormSubmitButton isPending={isSubmitted} loadingLabel="Enviando…">
          Reenviar a revisión
        </FormSubmitButton>
      </div>
    </form>
  );
}
