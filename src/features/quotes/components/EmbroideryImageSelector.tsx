"use client";

/**
 * EmbroideryImageSelector.tsx
 * Componente unificado de selección de imagen para una especificación de bordado.
 * Gestiona tres modos con transiciones suaves (solo opacity + transform):
 *
 *  "options"  → grid 2 columnas: [Galería del servidor] [Cargar imagen]
 *  "upload"   → área de carga de archivo (full-width) + botón volver
 *  "gallery"  → cuadrícula virtualizada (TanStack Virtual) + infinite-scroll sentinel
 *
 * Los datos de galería llegan como props desde StepEmbroidery, donde el hook
 * se ejecuta UNA sola vez (no N veces por cada spec agregada).
 */
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader } from "@/src/components/Loader";
import { ArrowLeftIcon, PhotoIcon, UploadIcon } from "@/src/components/Icons";
import { useUploadEmbroideryImage } from "../hooks/useUploadEmbroideryImage";
import { GalleryImageItem } from "./GalleryImageItem";
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

type Mode = "options" | "upload" | "gallery";

/** Columnas fijas del grid virtualizado. */
const GALLERY_COLS = 4;
/**
 * Altura estimada por fila (px). Se usa como hint inicial para TanStack Virtual.
 * Incluye thumbnail (aspect-square ≈ 88px) + label (12px) + padding (12px) + gap (8px).
 */
const GALLERY_ROW_HEIGHT = 128;

interface EmbroideryImageSelectorProps {
  spec: EmbroiderySpecForm;
  /** Imágenes de galería ya cargadas (viene de StepEmbroidery). */
  galleryImages: NgrokImageItem[];
  isFetchingGallery: boolean;
  isGalleryError: boolean;
  onRetryGallery: () => void;
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
  galleryImages,
  isFetchingGallery,
  isGalleryError,
  onRetryGallery,
  onImageUploaded,
  onImageFromGallery,
}: EmbroideryImageSelectorProps) {
  // useVirtualizer devuelve funciones que no se pueden memoizar de forma segura;
  // optamos fuera del React Compiler para este componente.
  "use no memo";
  const [mode, setMode] = useState<Mode>("options");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Upload mutation ──────────────────────────────────────── */
  const { mutate: uploadImage, isPending: isUploading } = useUploadEmbroideryImage();

  /* ── TanStack Virtual — row virtualization ───────────────── */
  // Diferir el array de imágenes para no bloquear otras interacciones del form
  const deferredImages = useDeferredValue(galleryImages);

  // Agrupar imágenes en filas de GALLERY_COLS para el virtualizador
  const imageRows = useMemo(() => {
    const rows: NgrokImageItem[][] = [];
    for (let i = 0; i < deferredImages.length; i += GALLERY_COLS) {
      rows.push(deferredImages.slice(i, i + GALLERY_COLS));
    }
    return rows;
  }, [deferredImages]);

  const galleryScrollRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: imageRows.length,
    getScrollElement: () => galleryScrollRef.current,
    estimateSize: () => GALLERY_ROW_HEIGHT,
    overscan: 3,
  });

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleOpenGallery = useCallback(() => {
    setMode("gallery");
  }, []);

  const handleOpenUpload = useCallback(() => {
    setMode("upload");
    // Pequeño delay para esperar la transición antes de abrir el input
    setTimeout(() => inputRef.current?.click(), 280);
  }, []);

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
            className="group flex flex-col items-center justify-center gap-2 px-3 py-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-sky-50/60 dark:hover:bg-sky-500/5 hover:border-sky-400 dark:hover:border-sky-500/40 transition-all duration-200 cursor-pointer"
            aria-label="Seleccionar imagen de la galería del servidor"
          >
            <PhotoIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
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
                onClick={onRetryGallery}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Estado: sin imágenes */}
          {!isFetchingGallery && !isGalleryError && galleryImages.length === 0 && (
            <div className="py-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5">
              <PhotoIcon className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No hay imágenes disponibles en el servidor.
              </p>
            </div>
          )}

          {/* Estado: grid virtualizado (TanStack Virtual — row virtualization) */}
          {!isFetchingGallery && !isGalleryError && deferredImages.length > 0 && (
            <div
              ref={galleryScrollRef}
              role="listbox"
              aria-label="Imágenes disponibles en el servidor"
              className="max-h-90 overflow-y-auto pr-0.5"
            >
              {/* Contenedor relativo con la altura total virtual */}
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowItems = imageRows[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Cada fila virtual renderiza hasta GALLERY_COLS miniaturas */}
                      <div className="grid grid-cols-4 gap-2 pb-2">
                        {rowItems.map((item) => (
                          <GalleryImageItem
                            key={item.sharePath}
                            item={item}
                            onSelect={handleSelectGalleryImage}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
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
