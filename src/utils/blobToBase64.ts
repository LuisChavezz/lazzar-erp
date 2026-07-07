/**
 * Convierte un `Blob` a un string base64 usando `FileReader`.
 *
 * `readAsDataURL` produce un data URL con el prefijo `data:<mime>;base64,<contenido>`.
 * El prefijo NO se elimina — no está confirmado si los consumidores actuales
 * (ver `GoogleEmailAttachment.content`) requieren base64 puro o aceptan el
 * prefijo; verificar con el backend antes de asumir cualquiera de los dos.
 *
 * Solo funciona en el navegador (depende de `FileReader`).
 */
export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(blob);
  });
