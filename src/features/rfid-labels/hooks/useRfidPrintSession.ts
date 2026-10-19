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
  /** La impresión se detuvo porque la impresora no confirmó a tiempo la
   *  etiqueta `sent + 1`: pudo haber salido, así que se registra sin
   *  confirmar. Lo fija el bucle de impresión; banner, toast y `observaciones`
   *  lo leen de aquí en vez de deducirlo del payload. */
  timedOut: boolean;
  /** Algún intento anterior terminó con desenlace INCIERTO (sin respuesta o
   *  5xx): el backend pudo haber hecho commit aunque el cliente viera un
   *  fallo. Solo entonces un choque de EPC en el reintento puede significar
   *  "ya quedó registrado". */
  possiblyRegistered: boolean;
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
