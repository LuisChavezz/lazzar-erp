/**
 * Convierte un string base64 PURO en un `Blob` del tipo indicado. NO acepta un
 * data URL: el prefijo `data:<mime>;base64,` hace que `atob` lance. Por eso no
 * es la inversa directa de `blobToBase64`, que sí devuelve el data URL completo.
 *
 * El `type` lo decide quien llama: no se deduce del contenido ni de lo que
 * declare el origen. Se toleran saltos de línea y espacios (base64 con cortes
 * de línea); un contenido que no es base64 válido hace que `atob` lance.
 *
 * Solo funciona en el navegador (depende de `atob`).
 */
export const base64ToBlob = (base64: string, type: string): Blob => {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
};
