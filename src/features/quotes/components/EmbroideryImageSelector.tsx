"use client";

/**
 * EmbroideryImageSelector.tsx
 * Componente unificado de selección de imagen para una especificación de bordado.
 * Gestiona tres modos con transiciones suaves (solo opacity + transform):
 *
 *  "options"  → grid 2 columnas: [Cargar imagen] [Galería del servidor]
 *  "upload"   → área de carga de archivo (full-width) + botón volver
 *  "gallery"  → cuadrícula de imágenes del servidor + botón volver
 *
 * Una vez seleccionada una imagen el padre lo oculta vía isImageLocked.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Loader } from "@/src/components/Loader";
import { ArrowLeftIcon, PhotoIcon, UploadIcon } from "@/src/components/Icons";
import { useFetchEmbroideryImages } from "../hooks/useFetchEmbroideryImages";
import { useUploadEmbroideryImage } from "../hooks/useUploadEmbroideryImage";
import type { EmbroiderySpecBooleanField, EmbroiderySpecForm } from "../types";
import type { NgrokImageItem } from "../services/ngrok.actions";

/** URL base ngrok; se concatena con la ruta relativa de cada imagen. */
const NGROK_BASE_URL = process.env.NEXT_PUBLIC_NGROK_BASE_URL ?? "";

/** Rutas destino en el servidor por tipo de servicio. */
const SERVICE_UPLOAD_PATHS: Record<EmbroiderySpecBooleanField, string> = {
  nuevoPonchado: "Ponchados/Pendientes de aprobar",
  serigrafia: "Serigrafia/Pendientes de aprobar",
  sublimado: "Sublimado/Pendientes de aprobar",
  dtf: "DTF/Pendientes de aprobar",
  revelado: "Revelado/Pendientes de aprobar",
};

const EMBROIDERY_BOOLEAN_FIELDS: EmbroiderySpecBooleanField[] = [
  "nuevoPonchado",
  "serigrafia",
  "sublimado",
  "dtf",
  "revelado",
];

const externalImageLoader = ({ src }: { src: string }) => src;

type Mode = "options" | "upload" | "gallery";

interface EmbroideryImageSelectorProps {
  spec: EmbroiderySpecForm;
  /**
   * Callback invocado cuando el usuario SUBE un archivo al servidor.
   * El padre debe bloquear los checkboxes de servicio en este caso.
   */
  onImageUploaded: (url: string) => void;
  /**
   * Callback invocado cuando el usuario ELIGE una imagen de la galería.
   * El padre no bloquea los checkboxes en este caso.
   */
  onImageFromGallery: (url: string) => void;
}

export function EmbroideryImageSelector({
  spec,
  onImageUploaded,
  onImageFromGallery,
}: EmbroideryImageSelectorProps) {
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("options");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Upload mutation ──────────────────────────────────────── */
  const { mutate: uploadImage, isPending: isUploading } = useUploadEmbroideryImage();

  /* ── Fetch gallery query ─────────────────────────────────── */
  const email = session?.user?.email;
  const {
    data: galleryData,
    isPending: isFetchingGallery,
    isError: isGalleryError,
    refetch: refetchGallery,
  } = useFetchEmbroideryImages(email);

  // Mostrar toast cuando falla la carga de la galería
  useEffect(() => {
    if (isGalleryError) {
      toast.error("No se pudieron cargar las imágenes del servidor.");
    }
  }, [isGalleryError]);

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleOpenGallery = useCallback(() => {
    setMode("gallery");
    // El query se dispara automáticamente vía enabled:!!email;
    // si ya falló antes, refetching manual para reintentar al abrir
    if (isGalleryError) refetchGallery();
  }, [isGalleryError, refetchGallery]);

  const handleOpenUpload = useCallback(() => {
    setMode("upload");
    // Pequeño delay para esperar la transición antes de abrir el input
    setTimeout(() => inputRef.current?.click(), 280);
  }, []);

  const handleRetryGallery = useCallback(() => {
    refetchGallery();
  }, [refetchGallery]);

  const handleBack = useCallback(() => {
    setMode("options");
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const activeService = EMBROIDERY_BOOLEAN_FIELDS.find((f) => spec[f]) ?? null;
      const currentPath = activeService
        ? SERVICE_UPLOAD_PATHS[activeService]
        : "Bordados/Pendientes de aprobar";

      uploadImage(
        { file, currentPath },
        {
          onSuccess: (data) => {
            const relativePath = data.items?.[0]?.url;
            if (relativePath) {
              onImageUploaded(`${NGROK_BASE_URL}${relativePath}`);
            }
          },
        }
      );
      event.target.value = "";
    },
    [uploadImage, spec, onImageUploaded]
  );

  const handleSelectGalleryImage = useCallback(
    (item: NgrokImageItem) => {
      onImageFromGallery(`${NGROK_BASE_URL}${item.url}`);
      // Volver al panel de opciones con la animación de cierre ya existente
      setMode("options");
    },
    [onImageFromGallery]
  );

  /* ── Transition class helpers ─────────────────────────────── */
  // Solo animamos opacity + transform — nunca width/height (performance imperative).
  const panelClass = (active: boolean) =>
    active
      ? "opacity-100 translate-y-0 transition-all duration-300 ease-out pointer-events-auto"
      : "opacity-0 translate-y-2 pointer-events-none absolute inset-x-0 top-0 transition-all duration-200 ease-in";

  const images = galleryData?.imagenes ?? [];

  return (
    /* Contenedor relativo — los paneles inactivos se posicionan absolute
       para no empujar el layout; el panel activo determina la altura. */
    <div className="relative mt-4">
      {/* ── PANEL: dos opciones ──────────────────────────────── */}
      <div className={panelClass(mode === "options")}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 ">
          Imagen de referencia
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Botón: Galería del servidor (primero) */}
          <button
            type="button"
            onClick={handleOpenGallery}
            className="group flex flex-col items-center justify-center gap-2 px-3 py-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-violet-50/60 dark:hover:bg-violet-500/5 hover:border-violet-400 dark:hover:border-violet-500/40 transition-all duration-200 cursor-pointer"
            aria-label="Seleccionar imagen de la galería del servidor"
          >
            <PhotoIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-violet-500 transition-colors" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Galería del servidor
            </span>
          </button>

          {/* Botón: Cargar imagen (segundo) */}
          <button
            type="button"
            disabled={isUploading}
            onClick={handleOpenUpload}
            className="group flex flex-col items-center justify-center gap-2 px-3 py-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-sky-50/60 dark:hover:bg-sky-500/5 hover:border-sky-400 dark:hover:border-sky-500/40 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Cargar imagen desde el equipo"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">Subiendo…</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  Cargar imagen
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PANEL: cargar archivo (upload) ────────────────────── */}
      <div className={panelClass(mode === "upload")}>
        <div className="space-y-2">
          {/* Encabezado con volver a la derecha */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Volver a las opciones"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Volver
            </button>
          </div>

          {/* Zona de carga */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="group w-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-sky-50/60 dark:hover:bg-sky-500/5 hover:border-sky-400 dark:hover:border-sky-500/40 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Seleccionar imagen de bordado"
          >
            {isUploading ? (
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
                  Seleccionar archivo
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  PNG, JPG, WebP, GIF, SVG
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PANEL: galería del servidor ───────────────────────── */}
      <div className={panelClass(mode === "gallery")}>
        <div className="space-y-2">
          {/* Encabezado con volver a la derecha */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Volver a las opciones"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Volver
            </button>
          </div>

          {/* Estado: cargando */}
          {isFetchingGallery && (
            <Loader className="py-6" title="Cargando imágenes…" />
          )}

          {/* Estado: error */}
          {isGalleryError && !isFetchingGallery && (
            <div className="flex flex-col items-center gap-2 py-5 text-center rounded-2xl border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5">
              <p className="text-xs text-rose-500 dark:text-rose-400">
                No se pudo conectar al servidor.
              </p>
              <button
                type="button"
                onClick={handleRetryGallery}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Estado: sin imágenes */}
          {!isFetchingGallery && !isGalleryError && galleryData && images.length === 0 && (
            <div className="py-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5">
              <PhotoIcon className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No hay imágenes disponibles en el servidor.
              </p>
            </div>
          )}

          {/* Estado: grid de imágenes */}
          {!isFetchingGallery && !isGalleryError && images.length > 0 && (
            <div
              role="listbox"
              aria-label="Imágenes disponibles en el servidor"
              className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-90 overflow-y-auto pr-0.5"
            >
              {images.map((item) => {
                const fullUrl = `${NGROK_BASE_URL}${item.url}`;
                return (
                  <button
                    key={item.sharePath}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelectGalleryImage(item)}
                    title={item.nombre}
                    className="group flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-violet-50/60 dark:hover:bg-violet-500/5 hover:shadow-sm transition-all duration-150 cursor-pointer"
                  >
                    <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-zinc-800">
                      <Image
                        loader={externalImageLoader}
                        unoptimized
                        src={fullUrl}
                        alt={item.nombre}
                        fill
                        sizes="96px"
                        className="object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="w-full text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate leading-tight text-center px-0.5">
                      {item.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input de archivo oculto — compartido por ambos flows */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
  );
}
