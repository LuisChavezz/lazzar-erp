"use client";

import { RequestFormContent } from "./RequestFormContent";
import { useRequestForm } from "../hooks/useRequestForm";

/**
 * Formulario de alta de solicitud.
 *
 * Cuerpo propio del módulo (`RequestFormContent`, clon editable del de
 * cotizaciones) alimentado por `useRequestForm`. Ya no depende de
 * `QuoteFormContent`: editar el formulario de solicitudes no puede afectar a
 * cotizaciones, y viceversa.
 *
 * El submit sigue inerte — valida y muestra un toast de "no disponible aún",
 * sin llamada de red.
 */
export default function RequestForm() {
  const hookResult = useRequestForm();
  return <RequestFormContent {...hookResult} submitLabel="Guardar Solicitud" />;
}
