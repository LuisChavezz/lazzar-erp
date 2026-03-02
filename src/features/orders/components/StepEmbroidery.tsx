import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";

export type EmbroiderySpecForm = {
  id: string;
  posicionCodigo: string;
  ancho: string;
  alto: string;
  colorHilo: string;
};

interface StepEmbroideryProps {
  nuevoPonchado: boolean;
  onNuevoPonchadoChange: (next: boolean) => void;
  embroideryObservaciones: string;
  onObservacionesChange: (value: string) => void;
  embroiderySpecs: EmbroiderySpecForm[];
  onAddSpec: () => void;
  onRemoveSpec: (id: string) => void;
  onUpdateSpec: (
    id: string,
    field: "posicionCodigo" | "ancho" | "alto" | "colorHilo",
    value: string
  ) => void;
  embroideryError: string | null;
  specErrors: Record<string, { posicion?: string; ancho?: string; alto?: string; color?: string }>;
  positionOptions: { codigo: string; nombre: string }[];
  positionMap: Map<string, string>;
  threadColorOptions: string[];
}

export function StepEmbroidery({
  nuevoPonchado,
  onNuevoPonchadoChange,
  embroideryObservaciones,
  onObservacionesChange,
  embroiderySpecs,
  onAddSpec,
  onRemoveSpec,
  onUpdateSpec,
  embroideryError,
  specErrors,
  positionOptions,
  positionMap,
  threadColorOptions,
}: StepEmbroideryProps) {
  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ubicaciones
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="h-24 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400"
            role="img"
            aria-label="Referencia de ubicación de bordado 1"
          >
            Imagen
          </div>
          <div
            className="h-24 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400"
            role="img"
            aria-label="Referencia de ubicación de bordado 2"
          >
            Imagen
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 text-xs text-slate-500 dark:text-slate-300">
        Usa este formulario para definir las posiciones, medidas y colores del bordado.
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Catálogo de colores de hilo
          </p>
          <label
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            htmlFor="add-product-nuevo-ponchado"
          >
            <input
              id="add-product-nuevo-ponchado"
              type="checkbox"
              checked={nuevoPonchado}
              onChange={(event) => onNuevoPonchadoChange(event.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Nuevo ponchado
          </label>
        </div>
        <div
          className="h-24 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400"
          role="img"
          aria-label="Catálogo de colores de hilo"
        >
          Catálogo de colores
        </div>
      </div>

      <div className="space-y-3">
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
                      label="Color de hilo"
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
                    {specError.color && (
                      <p
                        className="text-xs text-rose-600 dark:text-rose-400"
                        role="alert"
                      >
                        {specError.color}
                      </p>
                    )}
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
}
