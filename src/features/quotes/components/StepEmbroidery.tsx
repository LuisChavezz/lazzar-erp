/**
 * StepEmbroidery.tsx
 * Vista del paso de bordado: permite agregar especificaciones por
 * ubicación, validarlas y previsualizar imágenes.
 */
import { memo } from "react";
import Image from "next/image";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { DeleteIcon, EyeIcon } from "@/src/components/Icons";
import type { EmbroiderySpecBooleanField, EmbroiderySpecErrorsById, EmbroiderySpecForm } from "../types";

export type { EmbroiderySpecForm };

/**
 * Validación simple de URL para detectar extensiones de imagen válidas.
 */
const IMAGE_URL_EXTENSION_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i;

const isValidImageUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }
  try {
    const parsed = new URL(trimmedValue);
    return Boolean(parsed.protocol) && IMAGE_URL_EXTENSION_REGEX.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return false;
  }
};

const externalImageLoader = ({ src }: { src: string }) => src;

interface StepEmbroideryProps {
  embroideryObservaciones: string;
  onObservacionesChange: (value: string) => void;
  embroiderySpecs: EmbroiderySpecForm[];
  onAddSpec: () => void;
  onRemoveSpec: (id: string) => void;
  onUpdateSpec: (
    id: string,
    field: "posicionCodigo" | "ancho" | "alto" | "colorHilo" | "imagen",
    value: string
  ) => void;
  onToggleSpecBoolean: (
    id: string,
    field: EmbroiderySpecBooleanField,
    value: boolean
  ) => void;
  embroideryError: string | null;
  specErrors: EmbroiderySpecErrorsById;
  positionOptions: { codigo: string; nombre: string }[];
  positionMap: Map<string, string>;
  threadColorOptions: string[];
}

/**
 * `StepEmbroidery`
 * Componente presentacional que renderiza el formulario de especificaciones
 * de bordado y las utilidades de previsualización/eliminación.
 */
export const StepEmbroidery = memo(function StepEmbroidery({
  embroideryObservaciones,
  onObservacionesChange,
  embroiderySpecs,
  onAddSpec,
  onRemoveSpec,
  onUpdateSpec,
  onToggleSpecBoolean,
  embroideryError,
  specErrors,
  positionOptions,
  positionMap,
  threadColorOptions,
}: StepEmbroideryProps) {
  const openImagePreview = (src: string) => {
    window.open(src, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ubicaciones
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="group relative h-32 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
            <div className="absolute top-2 right-2 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-in-out">
              <button
                type="button"
                onClick={() => openImagePreview("/images/bordado-front.jpg")}
                className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shadow-sm transition-colors"
                aria-label="Expandir imagen frontal"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
            <Image
              src="/images/bordado-front.jpg"
              alt="Referencia de ubicación de bordado frontal"
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-contain"
              quality={75}
            />
          </div>
          <div className="group relative h-32 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
            <div className="absolute top-2 right-2 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-in-out">
              <button
                type="button"
                onClick={() => openImagePreview("/images/bordado-back.jpg")}
                className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shadow-sm transition-colors"
                aria-label="Expandir imagen posterior"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
            <Image
              src="/images/bordado-back.jpg"
              alt="Referencia de ubicación de bordado posterior"
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-contain"
              quality={75}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 text-xs text-slate-500 dark:text-slate-300">
        Usa este formulario para definir las posiciones, medidas y colores del bordado.
      </div>

      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Especificaciones por ubicación
          </p>
          <button
            type="button"
            onClick={onAddSpec}
            className="inline-flex items-center gap-1 text-xs cursor-pointer font-semibold text-sky-600 hover:text-sky-700"
            aria-label="Agregar especificación por ubicación"
          >
            + Agregar
          </button>
        </div>
        {embroideryError && (
          <p
            className="text-xs text-rose-600 dark:text-rose-400"
            role="alert"
            aria-live="polite"
          >
            {embroideryError}
          </p>
        )}
        <div className="space-y-3">
          {embroiderySpecs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-4 py-6 text-xs text-slate-500 dark:text-slate-300 text-center">
              Aún no hay especificaciones por ubicación. Usa “Agregar” para crear la primera.
            </div>
          )}
          {embroiderySpecs.map((spec) => {
            const specError = specErrors[spec.id] ?? {};
            const positionName =
              spec.posicionCodigo && positionMap.get(spec.posicionCodigo)
                ? positionMap.get(spec.posicionCodigo)
                : "Selecciona ubicación";
            return (
              <div
                key={spec.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300">
                      {spec.posicionCodigo || "?"}
                    </span>
                    <span>{positionName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSpec(spec.id)}
                    className="cursor-pointer text-slate-400 hover:text-rose-500 transition-colors"
                    aria-label="Eliminar especificación"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <FormSelect
                      label="Ubicación"
                      value={spec.posicionCodigo}
                      onChange={(event) =>
                        onUpdateSpec(spec.id, "posicionCodigo", event.target.value)
                      }
                      options={[
                        { value: "", label: "Seleccionar..." },
                        ...positionOptions.map((pos) => ({
                          value: pos.codigo,
                          label: `[${pos.codigo}] ${pos.nombre}`,
                        })),
                      ]}
                    />
                    {specError.posicion && (
                      <p
                        className="text-xs text-rose-600 dark:text-rose-400"
                        role="alert"
                      >
                        {specError.posicion}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <FormInput
                      label="Ancho (cm)"
                      type="number"
                      min={1}
                      step={0.01}
                      placeholder="0"
                      value={spec.ancho}
                      onChange={(event) => onUpdateSpec(spec.id, "ancho", event.target.value)}
                    />
                    {specError.ancho && (
                      <p
                        className="text-xs text-rose-600 dark:text-rose-400"
                        role="alert"
                      >
                        {specError.ancho}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <FormInput
                      label="Alto (cm)"
                      type="number"
                      min={1}
                      step={0.01}
                      placeholder="0"
                      value={spec.alto}
                      onChange={(event) => onUpdateSpec(spec.id, "alto", event.target.value)}
                    />
                    {specError.alto && (
                      <p
                        className="text-xs text-rose-600 dark:text-rose-400"
                        role="alert"
                      >
                        {specError.alto}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <FormSelect
                      label="Color de hilo (opcional)"
                      value={spec.colorHilo}
                      onChange={(event) =>
                        onUpdateSpec(spec.id, "colorHilo", event.target.value)
                      }
                      options={[
                        { value: "", label: "Seleccionar..." },
                        ...threadColorOptions.map((code) => ({
                          value: code,
                          label: code,
                        })),
                      ]}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <FormInput
                      label="URL de imagen"
                      placeholder="https://dominio.com/imagen.png"
                      forceUppercase={false}
                      value={spec.imagen}
                      onChange={(event) =>
                        onUpdateSpec(spec.id, "imagen", event.target.value)
                      }
                    />
                    {specError.imagen && (
                      <p
                        className="text-xs text-rose-600 dark:text-rose-400"
                        role="alert"
                      >
                        {specError.imagen}
                      </p>
                    )}
                    {isValidImageUrl(spec.imagen) && (
                      <div className="group relative rounded-xl border border-slate-200 dark:border-white/10 p-2 bg-white dark:bg-black/20">
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-in-out">
                          <button
                            type="button"
                            onClick={() => window.open(spec.imagen.trim(), "_blank", "noopener,noreferrer")}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shadow-sm transition-colors"
                            aria-label="Expandir imagen"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateSpec(spec.id, "imagen", "")}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center shadow-sm transition-colors"
                            aria-label="Quitar imagen"
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <Image
                          loader={externalImageLoader}
                          unoptimized
                          src={spec.imagen.trim()}
                          alt={`Vista previa de bordado ${positionName}`}
                          width={640}
                          height={240}
                          className="w-full h-40 object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 my-2">
                      Servicios
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {(
                        [
                          { field: "nuevoPonchado", label: "Nuevo ponchado" },
                          { field: "serigrafia", label: "Serigrafía" },
                          { field: "sublimado", label: "Sublimado" },
                          { field: "dtf", label: "DTF" },
                          { field: "revelado", label: "Revelado" },
                        ] as const
                      ).map(({ field, label }) => (
                        <label
                          key={field}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={spec[field]}
                            onChange={(event) =>
                              onToggleSpecBoolean(spec.id, field, event.target.checked)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormInput
        label="Observaciones adicionales"
        placeholder="Notas para el bordado (opcional)"
        value={embroideryObservaciones}
        onChange={(event) => onObservacionesChange(event.target.value)}
      />
    </div>
  );
});
