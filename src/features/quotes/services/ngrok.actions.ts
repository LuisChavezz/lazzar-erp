/**
 * ngrok.actions.ts
 * Servicios que consumen el endpoint de carga de archivos externos vía ngrok.
 * Cada función es responsable de un único caso de uso (SRP).
 */
import { ngrok_api } from "@/src/api/ngrok.api";


export interface NgrokUploadResponse {
  ok: boolean;
  message: string;
  currentPath: string;
  count: number;
  items: Array<{
    file: string;
    original: string;
    url: string;
  }>;
}


export interface UploadEmbroideryImagePayload {
  /** Archivo de imagen seleccionado por el usuario. */
  file: File;
  /**
   * Ruta destino en el servidor remoto.
   */
  currentPath: string;
}

/**
 * Sube una imagen al servidor externo via multipart/form-data.
 * El tipo de respuesta es `unknown` hasta que se conozca el contrato de la API.
 *
 * @param payload - Archivo e información de ruta destino.
 * @returns Respuesta cruda de la API.
 */
export const uploadEmbroideryImage = async (
  payload: UploadEmbroideryImagePayload
): Promise<NgrokUploadResponse> => {
  const formData = new FormData();
  // El orden importa: multer procesa los campos en el orden de recepción.
  // currentPath debe llegar ANTES del archivo para que la librería lo lea correctamente.
  formData.append("currentPath", payload.currentPath);
  formData.append("image", payload.file);

  // Axios detecta automáticamente el Content-Type y el boundary al recibir FormData.
  const { data } = await ngrok_api.post<NgrokUploadResponse>("/api/external-upload", formData);

  return data;
};
