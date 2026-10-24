"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { plural } from "@/src/utils/plural";
import { useApplyCobroDraft } from "../hooks/useApplyCobroDraft";
import { cobroLabel, formatCobroAmount, type CobroRow } from "../utils/collection.utils";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para aplicar y describir el borrador. */
export type CobroDraftApplyTarget = Pick<
  CobroRow,
  "id" | "folio" | "total_cobrado" | "moneda_codigo" | "cobro_detalles"
>;

interface CobroDraftApplyDialogProps {
  cobro: CobroDraftApplyTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Aplicar" un borrador desde su detalle (PATCH con el cobro
 * guardado y `estatus: "Aplicado"`, ver `useApplyCobroDraft`). El cobro objetivo
 * es la copia tomada al ABRIR (`useDialogSession`): al aplicarse la fila cambia
 * de estatus y el texto debe seguir hablando del mismo cobro mientras se cierra.
 *
 * El ciclo de cierre es el de `CobroActionConfirmDialog`.
 */
export function CobroDraftApplyDialog({ cobro, open, onOpenChange }: CobroDraftApplyDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const { apply, isApplying } = useApplyCobroDraft(target?.id ?? 0);

  const lineCount = target?.cobro_detalles.length ?? 0;
  const description = target
    ? `El cobro ${cobroLabel(target)} se aplicará por ${formatCobroAmount(target.total_cobrado, target.moneda_codigo)} contra ${lineCount} ${plural(lineCount, "cuenta por cobrar", "cuentas por cobrar")}: baja su saldo, suma a la cuenta bancaria, registra el movimiento bancario y genera la póliza. Después ya no se podrá editar; para corregirlo habrá que cancelarlo.`
    : "";

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Aplicar cobro"
      description={description}
      confirmText="Aplicar cobro"
      busyText="Aplicando…"
      confirmColor="green"
      run={target ? apply : null}
      isRunning={isApplying}
    />
  );
}
