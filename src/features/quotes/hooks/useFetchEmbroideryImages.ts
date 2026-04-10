"use client";

/**
 * useFetchEmbroideryImages
 * Query de TanStack Query que obtiene la galería de imágenes disponibles en el
 * servidor ngrok para un vendedor dado. Se activa automáticamente en cuanto
 * se dispone del email del usuario (enabled: !!email). Los datos se consideran
 * frescos durante 5 minutos para evitar re-fetches innecesarios.
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
    queryFn: () => fetchEmbroideryImages({ email: email! }),
    enabled: !!email,
  });
};
