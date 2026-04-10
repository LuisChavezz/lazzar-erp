"use client";

/**
 * EmbroiderySpecUploadArea.tsx
 * Área de carga de imagen para una especificación de bordado.
 * Se renderiza únicamente cuando hay un servicio activo (checkbox seleccionado).
 * Responsabilidad única: gestionar la subida de la imagen al servidor externo.
 */
import { useCallback, useRef } from "react";
import { UploadIcon } from "@/src/components/Icons";
import type { EmbroiderySpecBooleanField, EmbroiderySpecForm } from "../types";
import { useUploadEmbroideryImage } from "../hooks/useUploadEmbroideryImage";

/** Campos de servicio mutuamente excluyentes por especificación de bordado. */
const EMBROIDERY_BOOLEAN_FIELDS: EmbroiderySpecBooleanField[] = [
  "nuevoPonchado",
  "serigrafia",
  "sublimado",
  "dtf",
  "revelado",
];

/** Ruta destino en el servidor ngrok por cada tipo de servicio. */
const SERVICE_UPLOAD_PATHS: Record<EmbroiderySpecBooleanField, string> = {
  nuevoPonchado: "Ponchados/Pendientes de aprobar",
  serigrafia: "Serigrafia/Pendientes de aprobar",
  sublimado: "Sublimado/Pendientes de aprobar",
  dtf: "DTF/Pendientes de aprobar",
  revelado: "Revelado/Pendientes de aprobar",
};

/**
 * URL base del servidor ngrok, leída desde variables de entorno.
 * Se concatena con la ruta relativa que devuelve la API tras una carga exitosa.
 */
const NGROK_BASE_URL = process.env.NEXT_PUBLIC_NGROK_BASE_URL ?? "";

interface EmbroiderySpecUploadAreaProps {
  spec: EmbroiderySpecForm;
  /** Callback que recibe la URL completa de la imagen subida. */
  onImageUploaded: (url: string) => void;
}

export function EmbroiderySpecUploadArea({ spec, onImageUploaded }: EmbroiderySpecUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadImage, isPending } = useUploadEmbroideryImage();

  const activeService = EMBROIDERY_BOOLEAN_FIELDS.find((f) => spec[f]) ?? null;

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !activeService) return;
      uploadImage(
        { file, currentPath: SERVICE_UPLOAD_PATHS[activeService] },
        {
          onSuccess: (data) => {
            const relativePath = data.items?.[0]?.url;
            if (relativePath) {
              onImageUploaded(`${NGROK_BASE_URL}${relativePath}`);
            }
          },
        }
      );
      // Reset para permitir re-subir el mismo archivo si es necesario
      event.target.value = "";
    },
    [uploadImage, activeService, onImageUploaded]
  );

  if (!activeService) return null;

  const currentPath = SERVICE_UPLOAD_PATHS[activeService];

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="group w-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-sky-50/60 dark:hover:bg-sky-500/5 hover:border-sky-400 dark:hover:border-sky-500/40 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Seleccionar imagen de bordado"
      >
        {isPending ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
              Subiendo imagen…
            </span>
          </>
        ) : (
          <>
            <UploadIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Seleccionar imagen
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">
              /{currentPath}
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </>
  );
}

