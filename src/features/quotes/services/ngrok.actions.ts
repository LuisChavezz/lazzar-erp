/**
 * ngrok.actions.ts
 * Servicios de la galería y carga de arte de bordado.
 *
 * Estas funciones corren en el cliente y llaman a los Route Handlers internos
 * de `/api/embroidery-images`, que son los que hablan con el servidor de
 * archivos usando el token server-only. El cliente nunca ve ese token ni la
 * URL del túnel para estas operaciones.
 */
import axios from "axios";

/** Mensaje del Route Handler, o un fallback si la respuesta no lo trae. */
const getRouteHandlerError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }

    return fallback;
  }

  return null;
};

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
   * Ruta destino en el servidor remoto. El Route Handler la valida contra el
   * allowlist de `constants/embroideryUpload.ts`.
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

/** Respuesta del endpoint GET /api/embroidery-images. */
export interface NgrokImagesResponse {
  ok: boolean;
  vendedor: string;
  count: number;
  imagenes: NgrokImageItem[];
}

/**
 * Obtiene la galería de imágenes disponibles para el vendedor autenticado.
 *
 * No recibe el email: el Route Handler lo deriva de la sesión. Aceptarlo como
 * parámetro permitía consultar la galería de cualquier otro vendedor.
 *
 * @returns Respuesta con la lista de imágenes del vendedor.
 */
export const fetchEmbroideryImages = async (): Promise<NgrokImagesResponse> => {
  try {
    const { data } = await axios.get<NgrokImagesResponse>("/api/embroidery-images");
    return data;
  } catch (error) {
    const message = getRouteHandlerError(
      error,
      "No se pudieron cargar las imágenes del servidor.",
    );

    if (message) {
      throw new Error(message);
    }

    throw error;
  }
};

/**
 * Sube una imagen al servidor de archivos a través del Route Handler interno.
 *
 * @param payload - Archivo e información de ruta destino.
 * @returns Respuesta del servidor de archivos, reenviada sin alterar.
 */
export const uploadEmbroideryImage = async (
  payload: UploadEmbroideryImagePayload
): Promise<NgrokUploadResponse> => {
  const formData = new FormData();
  // El orden importa: multer procesa los campos en el orden de recepción.
  // currentPath debe llegar ANTES del archivo para que la librería lo lea
  // correctamente; el Route Handler preserva este mismo orden al reenviar.
  formData.append("currentPath", payload.currentPath);
  formData.append("image", payload.file);

  try {
    // Axios detecta automáticamente el Content-Type y el boundary al recibir FormData.
    const { data } = await axios.post<NgrokUploadResponse>(
      "/api/embroidery-images/upload",
      formData,
    );

    return data;
  } catch (error) {
    const message = getRouteHandlerError(
      error,
      "No se pudo cargar la imagen. Intenta de nuevo.",
    );

    if (message) {
      throw new Error(message);
    }

    throw error;
  }
};
