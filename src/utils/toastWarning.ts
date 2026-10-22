import toast from "react-hot-toast";

/**
 * Aviso que no es éxito ni error (p. ej. una cancelación de CFDI que quedó
 * pendiente de que el receptor la acepte): toast neutro con ⚠️ y más tiempo en
 * pantalla, para que alcance a leerse el mensaje del backend.
 */
export const toastWarning = (message: string) => toast(message, { icon: "⚠️", duration: 8000 });
