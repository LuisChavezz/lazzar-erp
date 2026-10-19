import { useState } from "react";
import type { RfidRegisterPayload } from "../interfaces/rfid-onboarding.interface";

/** Fase del flujo "imprimir y registrar" del asistente. */
export type RfidPrintPhase = "idle" | "printing" | "registering";

/**
 * Lote YA impreso cuyo registro falló. `payload` es el cuerpo exacto que se
 * construyó al terminar de imprimir (EPCs del preview impreso, impresora,
 * estatus y observaciones): un reintento lo reenvía tal cual, sin recalcular
 * nada, para que lo registrado coincida con lo codificado en los tags.
 */
export interface PendingRfidRegistration {
  payload: RfidRegisterPayload;
  /** Etiquetas que la impresora confirmó. */
  sent: number;
  /** Etiquetas del lote (`zpl_individual.length`). */
  total: number;
}

/**
 * Estado de la sesión de impresión: la fase en curso y el lote pendiente de
 * registrar. Solo en memoria, a propósito —sin `localStorage`—.
 */
export const useRfidPrintSession = () => {
  const [phase, setPhase] = useState<RfidPrintPhase>("idle");
  const [pending, setPending] = useState<PendingRfidRegistration | null>(null);

  return { phase, setPhase, pending, setPending };
};

export type RfidPrintSession = ReturnType<typeof useRfidPrintSession>;
