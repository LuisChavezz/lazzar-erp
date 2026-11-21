"use client";

import { useSalidaMaquilaAccess } from "../hooks/useSalidaMaquilaAccess";
import { SalidaMaquilaDetailDialog } from "./SalidaMaquilaDetailDialog";

interface SalidaMaquilaDetailByIdDialogProps {
  /** Id de la SM. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Adaptador de `SalidaMaquilaDetailDialog` a la firma del registro de
 * documentos del pedido (`ORDER_DOCUMENT_DIALOGS`: `{ orderId, open,
 * onOpenChange }`). El diálogo ya es self-fetching por id; aquí solo se
 * traduce la firma (`id` + `onClose`) y se resuelven sus dos permisos:
 *
 * - `canSeeAmounts`: `R-PRODUCCION-COSTOS`, como en la pantalla de SM. Mientras
 *   la sesión carga cuenta como no.
 * - `canWrite`: siempre `false`. Desde el pedido 360° la SM se CONSULTA;
 *   cancelarla es trabajo de su pantalla, que invalida sus propias consultas.
 *
 * Quién puede abrirlo lo decide `canOpenOrderDocument` (la regla de la ruta de
 * SM, `R-PRODUCCION-OP`), no este componente.
 */
export function SalidaMaquilaDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: SalidaMaquilaDetailByIdDialogProps) {
  const { amounts } = useSalidaMaquilaAccess();
  return (
    <SalidaMaquilaDetailDialog
      id={open ? orderId : null}
      onClose={() => onOpenChange(false)}
      canWrite={false}
      canSeeAmounts={amounts === "allowed"}
    />
  );
}
