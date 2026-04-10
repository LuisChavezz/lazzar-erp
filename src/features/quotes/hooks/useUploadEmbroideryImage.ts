"use client";

/**
 * useUploadEmbroideryImage
 * Mutation de TanStack Query para subir una imagen de bordado al servidor
 * externo via ngrok. Gestiona estados de carga, éxito y error con feedback
 * visual mediante toast.
 */
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  uploadEmbroideryImage,
  type UploadEmbroideryImagePayload,
} from "../services/ngrok.actions";

export const uploadEmbroideryImageMutationKey = ["upload-embroidery-image"] as const;

export const useUploadEmbroideryImage = () => {
  return useMutation({
    mutationKey: uploadEmbroideryImageMutationKey,
    mutationFn: (payload: UploadEmbroideryImagePayload) =>
      uploadEmbroideryImage(payload),
    onSuccess: () => {
      toast.success("Imagen cargada correctamente");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la imagen. Intenta de nuevo."
      );
    },
  });
};
