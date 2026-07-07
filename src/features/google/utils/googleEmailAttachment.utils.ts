import { blobToBase64 } from "@/src/utils/blobToBase64";
import { MAX_GMAIL_ATTACHMENT_BYTES } from "../constants/gmailAttachments";
import type { GoogleEmailAttachment } from "../interfaces/google.interface";

/**
 * Convierte un `Blob` en un `GoogleEmailAttachment` listo para enviar via
 * `googleSendEmail`, validando que el payload base64 no exceda el límite de
 * adjuntos de Gmail (`MAX_GMAIL_ATTACHMENT_BYTES`).
 *
 * Centraliza la conversión + validación de tamaño para que cualquier feature
 * que adjunte un archivo a un correo de Gmail obtenga el guard "gratis" en
 * lugar de reimplementarlo.
 */
export const buildGoogleEmailAttachment = async (
  blob: Blob,
  filename: string,
  mimeType: string,
  oversizeErrorMessage: string = `El archivo "${filename}" excede el límite de 25 MB permitido para adjuntos.`
): Promise<GoogleEmailAttachment> => {
  const content = await blobToBase64(blob);

  const base64PayloadSize = new Blob([content]).size;
  if (base64PayloadSize > MAX_GMAIL_ATTACHMENT_BYTES) {
    throw new Error(oversizeErrorMessage);
  }

  return { filename, mimeType, content };
};
