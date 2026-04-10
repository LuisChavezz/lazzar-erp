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

/** Representa un ítem de imagen almacenado en el servidor ngrok. */
export interface NgrokImageItem {
  /** Nombre del archivo (ej. "ALA02_GGU.jpg"). */
  nombre: string;
  /** Ruta relativa de la imagen en el servidor (ej. "/files/Bordados/..."). */
  url: string;
  /** Ruta UNC completa en el servidor de archivos compartidos. */
  sharePath: string;
}

/** Respuesta del endpoint GET /api/vendedor/imagenes. */
export interface NgrokImagesResponse {
  ok: boolean;
  vendedor: string;
  count: number;
  imagenes: NgrokImageItem[];
}

export interface FetchEmbroideryImagesPayload {
  /** Correo electrónico del vendedor cuyas imágenes se desean obtener. */
  email: string;
}

/**
 * Obtiene la galería de imágenes disponibles en el servidor para un vendedor.
 *
 * @param payload - Email del vendedor.
 * @returns Respuesta con la lista de imágenes del vendedor.
 */
export const fetchEmbroideryImages = async (
  payload: FetchEmbroideryImagesPayload
): Promise<NgrokImagesResponse> => {
  const { data } = await ngrok_api.get<NgrokImagesResponse>("/api/vendedor/imagenes", {
    params: { email: payload.email },
  });
  return data;
};

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
