"use client";

/**
 * useFetchEmbroideryImages
 * Query de TanStack Query que obtiene la galería de imágenes disponibles para
 * el vendedor autenticado, a través del Route Handler `/api/embroidery-images`.
 *
 * El `email` ya NO viaja al servidor —el Route Handler lo deriva de la sesión—
 * pero se sigue recibiendo aquí por dos motivos:
 *   - `queryKey`: mantiene la caché separada por usuario.
 *   - `enabled`: espera a que la sesión hidrate antes de disparar la petición.
 *     Sin esa guarda la query saldría antes de existir sesión y el Route
 *     Handler respondería 401.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchEmbroideryImages,
  type NgrokImagesResponse,
} from "../services/ngrok.actions";

export const embroideryImagesQueryKey = (email: string) =>
  ["embroidery-images", email] as const;

export const useFetchEmbroideryImages = (email: string | null | undefined) => {
  return useQuery<NgrokImagesResponse, Error>({
    queryKey: embroideryImagesQueryKey(email ?? ""),
    queryFn: () => fetchEmbroideryImages(),
    enabled: !!email,
  });
};
