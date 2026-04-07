/**
 * StepReflective.tsx
 * Componente del paso de configuración de reflejante. Es presentacional y
 * recibe las configuraciones editables, callbacks y errores desde el hook
 * `useReflectiveState` (o desde el contenedor).
 *
 * También reexporta la fábrica `createReflectiveConfigForm` y tipos relacionados
 * para que otras piezas del flujo (p. ej. hooks) puedan crear formularios
 * consistentes.
 */
import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DeleteIcon, EyeIcon } from "@/src/components/Icons";
import {
  createReflectiveConfigForm,
  type ReflectiveConfigFieldErrors,
  type ReflectiveConfigForm,
  type ReflectiveEditableField,
} from "../utils/reflective-form";

export {
  createReflectiveConfigForm,
};
export type {
  ReflectiveConfigFieldErrors,
  ReflectiveConfigForm,
};

const OPCION_OPTIONS = [
  {
    value: "fabricacion",
    badge: "Fabricación especial",
    label:
      "Podemos realizar una fabricación bajo pedido a tu medida (Mínimo 50 prendas), el costo es más bajo",
  },
  {
    value: "catalogo",
    badge: "Del inventario",
    label:
      "Elige una prenda del catálogo y agrega cinta reflejante. Se entrega más rápido. (Máximo 50 piezas)",
  },
] as const;

const POSICION_OPTIONS = [
  { value: "BRAZOS", label: "Brazos" },
  { value: "FRENTE", label: "Frente" },
  { value: "ESPALDA", label: "Espalda" },
  { value: "RODILLAS", label: "Rodillas" },
  { value: "HOMBROS", label: "Hombros" },
  { value: "TIRANTES", label: "Tirantes" },
  { value: "X_FRENTE", label: "X en Frente" },
  { value: "X_ESPALDA", label: "X en Espalda" },
] as const;

const TIPO_CATEGORIES = [
  {
    value: "reflejante-cat-1",
    label: "Cinta Costurable",
    subtitle: "LAZZAR-RT",
    image: "/images/reflejante-cat-1.png",
    opciones: [
      { value: "costurable-plata-1", label: 'PLATA 1 PULGADA' },
      { value: "costurable-plata-1.5", label: 'PLATA 1 1/2 PULGADAS' },
      { value: "costurable-plata-2", label: 'PLATA 2 PULGADAS' },
      { value: "costurable-dual-naranja-1.5", label: 'DUAL NARANJA 1 1/2" CON PLATA 1/2"' },
      { value: "costurable-dual-amarillo-1.5", label: 'DUAL AMARILLO 1 1/2" CON PLATA 1/2"' },
      { value: "costurable-dual-naranja-2", label: 'DUAL NARANJA 2" CON PLATA 3/4"' },
      { value: "costurable-dual-amarillo-2", label: 'DUAL AMARILLO 2" CON PLATA 3/4"' },
    ],
  },
  {
    value: "reflejante-cat-2",
    label: "Cinta Ignífuga",
    subtitle: "3M",
    image: "/images/reflejante-cat-2.png",
    opciones: [
      { value: "ignifuga-plata-1", label: 'PLATA 1 PULGADA IGNÍFUGO' },
      { value: "ignifuga-plata-2", label: 'PLATA 2 PULGADAS IGNÍFUGO' },
      { value: "ignifuga-dual-naranja-2", label: 'DUAL NARANJA 2" CON PLATA 3/4" IGNÍFUGO' },
      { value: "ignifuga-dual-amarillo-2", label: 'DUAL AMARILLO 2" CON PLATA 3/4" IGNÍFUGO' },
    ],
  },
  {
    value: "reflejante-cat-3",
    label: "Termofijable (Planchadas)",
    subtitle: "3M",
    image: "/images/reflejante-cat-3.png",
    opciones: [
      { value: "termofijable-h510c-1", label: 'H510C SEGMENTADA PLATA 1"' },
      { value: "termofijable-h510c-2", label: 'H510C SEGMENTADA PLATA 2"' },
      { value: "termofijable-h656c-1.5", label: 'H656C SEGMENTADA AMARILLO/PLATA 1.5" con 0.5 Plata' },
      { value: "termofijable-h656c-2", label: 'H656C SEGMENTADA AMARILLO/PLATA 2" con 0.75 Plata' },
      { value: "termofijable-h712s-1", label: 'H712S REFLEJANTE PLATA STRETCH 1"' },
      { value: "termofijable-h712s-2", label: 'H712S REFLEJANTE PLATA STRETCH 2"' },
    ],
  },
];

export interface StepReflectiveProps {
  configs: ReflectiveConfigForm[];
  onAddConfig: () => string;
  onRemoveConfig: (id: string) => void;
  onUpdateConfig: (
    id: string,
    field: ReflectiveEditableField,
    value: string | string[]
  ) => void;
  errorsByConfig?: Record<string, ReflectiveConfigFieldErrors>;
  generalError?: string | null;
  scrollToConfigId?: string | null;
  showValidationErrors?: boolean;
  observaciones: string;
  onObservacionesChange: (value: string) => void;
}

/**
 * `StepReflective`
 * Vista del paso de reflejante: muestra catálogo de opciones, posiciones
 * seleccionables y permite agregar/editar configuraciones. Los props incluyen
 * errores por configuración y flags para mostrar validaciones.
 */
export const StepReflective = memo(function StepReflective({
  configs,
  onAddConfig,
  onRemoveConfig,
  onUpdateConfig,
  errorsByConfig = {},
  generalError,
  scrollToConfigId,
  showValidationErrors = false,
  observaciones,
  onObservacionesChange,
}: StepReflectiveProps) {
  const [openImageByConfig, setOpenImageByConfig] = useState<Record<string, string | null>>({});
  const [openCatByConfig, setOpenCatByConfig] = useState<Record<string, string | null>>(() => {
    // Auto-expande la categoría que contenga una opción preseleccionada
    const initial: Record<string, string | null> = {};
    for (const config of configs) {
      const preselected = TIPO_CATEGORIES.find((cat) =>
        cat.opciones.some((op) => op.value === config.tipo)
      );
      initial[config.id] = preselected?.value ?? null;
    }
    return initial;
  });
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!scrollToConfigId) return;
    const target = cardRefs.current[scrollToConfigId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToConfigId]);

  const handleAddConfig = () => {
    const newId = onAddConfig();
    setRecentlyAddedId(newId);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === newId ? null : prev));
    }, 220);
  };

  const handleRemoveConfig = (id: string) => {
    setRemovingIds((prev) => ({ ...prev, [id]: true }));
    window.setTimeout(() => {
      onRemoveConfig(id);
      setRemovingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setOpenImageByConfig((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setOpenCatByConfig((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 170);
  };

  const toggleCat = (configId: string, catValue: string) => {
    setOpenCatByConfig((prev) => ({
      ...prev,
      [configId]: prev[configId] === catValue ? null : catValue,
    }));
    // Cierra la imagen si pertenecía a la categoría que se está cerrando
    setOpenImageByConfig((prev) => {
      if (prev[configId] === catValue) {
        const next = { ...prev };
        delete next[configId];
        return next;
      }
      return prev;
    });
  };

  const togglePosicion = (config: ReflectiveConfigForm, value: string) => {
    const nextPosiciones = config.posiciones.includes(value)
      ? config.posiciones.filter((p) => p !== value)
      : [...config.posiciones, value];
    onUpdateConfig(config.id, "posiciones", nextPosiciones);
  };

  return (
    <div className="space-y-6 mt-2">
      {/* Imagen de referencia — sin priority para evitar preloads involuntarios */}
      <div className="group relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <div className="absolute top-2 right-2 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-in-out">
          <button
            type="button"
            onClick={() => window.open("/images/reflejante.jpg", "_blank", "noopener,noreferrer")}
            className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shadow-sm transition-colors"
            aria-label="Ver imagen de reflejante"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
        <Image
          src="/images/reflejante.jpg"
          alt="Referencia visual de reflejante"
          fill
          sizes="(min-width: 768px) 672px, 100vw"
          className="object-contain"
          quality={75}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Configuraciones de reflejante
        </p>
        <button
          type="button"
          onClick={handleAddConfig}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer transition-colors"
        >
          + Agregar reflejante
        </button>
      </div>

      <div className="space-y-3">
        {showValidationErrors && generalError && (
          <p
            className="text-xs text-rose-600 dark:text-rose-400"
            role="alert"
            aria-live="polite"
          >
            {generalError}
          </p>
        )}
        {configs.map((config, index) => {
          const isRemoving = Boolean(removingIds[config.id]);
          const isRecentlyAdded = recentlyAddedId === config.id;
          const configErrors = errorsByConfig[config.id] ?? {};
          const hasConfigError = Boolean(
            configErrors.opcion || configErrors.posiciones || configErrors.tipo
          );
          const shouldShowError = hasConfigError && showValidationErrors;

          return (
            <section
              key={config.id}
              ref={(node) => {
                cardRefs.current[config.id] = node;
              }}
              className={`rounded-2xl border bg-slate-50/60 dark:bg-white/5 p-4 space-y-4 transition-all duration-200 ease-out ${
                isRemoving
                  ? "opacity-0 -translate-y-1 scale-[0.98]"
                  : isRecentlyAdded
                  ? "opacity-0 translate-y-1 scale-[0.98]"
                  : "opacity-100 translate-y-0 scale-100"
              } ${
                shouldShowError
                  ? "border-rose-300 dark:border-rose-700/60"
                  : "border-slate-200 dark:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Reflejante {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveConfig(config.id)}
                  disabled={configs.length <= 1}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label={`Eliminar reflejante ${index + 1}`}
                >
                  <DeleteIcon className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>

              {shouldShowError && (
                <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                  Corrige los campos de esta configuración para continuar.
                </p>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Inventario o Fabricación especial
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {OPCION_OPTIONS.map((opt) => {
                    const isSelected = config.opcion === opt.value;
                    return (
                      <button
                        key={`${config.id}-${opt.value}`}
                        type="button"
                        onClick={() => onUpdateConfig(config.id, "opcion", opt.value)}
                        aria-pressed={isSelected}
                        className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "border-sky-400 bg-sky-50/80 dark:bg-sky-500/10 ring-1 ring-sky-400"
                            : "border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sky-200 dark:hover:border-sky-500/40"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isSelected ? "text-sky-500 dark:text-sky-400" : "text-slate-400"
                          }`}
                        >
                          {opt.badge}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-4">
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                            <svg
                              className="w-2.5 h-2.5"
                              fill="none"
                              viewBox="0 0 10 10"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M2 5l2 2 4-4" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {shouldShowError && configErrors.opcion && (
                  <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                    {configErrors.opcion}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Posición
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={`Posiciones del reflejante ${index + 1}`}
                >
                  {POSICION_OPTIONS.map((pos) => {
                    const isSelected = config.posiciones.includes(pos.value);
                    return (
                      <button
                        key={`${config.id}-${pos.value}`}
                        type="button"
                        onClick={() => togglePosicion(config, pos.value)}
                        aria-pressed={isSelected}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-sky-500 border-sky-500 text-white shadow-sm"
                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500/40"
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
                {shouldShowError && configErrors.posiciones && (
                  <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                    {configErrors.posiciones}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tipo
                </p>
                <div className="space-y-2">
                  {TIPO_CATEGORIES.map((cat) => {
                    const isCatOpen = openCatByConfig[config.id] === cat.value;
                    const isImageOpen = openImageByConfig[config.id] === cat.value;
                    const selectedOption = cat.opciones.find((op) => op.value === config.tipo);
                    const hasCatSelection = Boolean(selectedOption);
                    const panelId = `tipo-panel-${config.id}-${cat.value}`;

                    return (
                      <div
                        key={`${config.id}-${cat.value}`}
                        className={`rounded-2xl border overflow-hidden transition-colors duration-150 ${
                          hasCatSelection
                            ? "border-sky-300 dark:border-sky-600/60 bg-sky-50/40 dark:bg-sky-500/5"
                            : "border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
                        }`}
                      >
                        {/* Encabezado colapsable */}
                        <button
                          type="button"
                          aria-expanded={isCatOpen}
                          aria-controls={panelId}
                          onClick={() => toggleCat(config.id, cat.value)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                        >
                          {/* Chevron */}
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              isCatOpen ? "rotate-90" : "rotate-0"
                            } ${
                              hasCatSelection
                                ? "text-sky-500 dark:text-sky-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                            fill="none"
                            viewBox="0 0 6 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M1 1l4 4-4 4" />
                          </svg>

                          {/* Título + subtítulo + badge */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-semibold ${
                                  hasCatSelection
                                    ? "text-sky-600 dark:text-sky-400"
                                    : "text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                {cat.label}
                              </span>
                              <span className="text-[10px] text-slate-400">{cat.subtitle}</span>
                              {hasCatSelection && !isCatOpen && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-[10px] font-semibold text-sky-700 dark:text-sky-300 truncate max-w-40">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {selectedOption?.label}
                                </span>
                              )}
                            </div>
                            {!isCatOpen && !hasCatSelection && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {cat.opciones.length} opciones disponibles
                              </p>
                            )}
                          </div>
                        </button>

                        {/* Panel expandible */}
                        {isCatOpen && (
                          <div id={panelId} className="px-4 pb-4 space-y-3">
                            {/* Botón Ver imagen */}
                            <button
                              type="button"
                              onClick={() =>
                                setOpenImageByConfig((prev) => ({
                                  ...prev,
                                  [config.id]:
                                    prev[config.id] === cat.value ? null : cat.value,
                                }))
                              }
                              aria-expanded={isImageOpen}
                              className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer transition-colors"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              <span>{isImageOpen ? "Ocultar imagen" : "Ver imagen"}</span>
                            </button>

                            {isImageOpen && (
                              <div className="relative h-48 w-full rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-black/20">
                                <Image
                                  src={cat.image}
                                  alt={`Catálogo de ${cat.label}`}
                                  fill
                                  sizes="(min-width: 768px) 640px, 100vw"
                                  className="object-contain"
                                  quality={80}
                                />
                              </div>
                            )}

                            {/* Opciones */}
                            <div className="space-y-1.5">
                              {cat.opciones.map((op) => {
                                const isSelected = config.tipo === op.value;
                                return (
                                  <button
                                    key={`${config.id}-${op.value}`}
                                    type="button"
                                    onClick={() =>
                                      onUpdateConfig(config.id, "tipo", op.value)
                                    }
                                    aria-pressed={isSelected}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                      isSelected
                                        ? "border-sky-400 bg-sky-50/80 dark:bg-sky-500/10 ring-1 ring-sky-400"
                                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-sky-200 dark:hover:border-sky-500/40"
                                    }`}
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                          ? "border-sky-500 bg-sky-500"
                                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-900"
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span
                                      className={`text-xs font-medium ${
                                        isSelected
                                          ? "text-sky-700 dark:text-sky-300"
                                          : "text-slate-600 dark:text-slate-300"
                                      }`}
                                    >
                                      {op.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {shouldShowError && configErrors.tipo && (
                  <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                    {configErrors.tipo}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Observaciones generales (opcional) */}
      <div className="space-y-2">
        <label
          htmlFor="reflective-observaciones"
          className="block text-xs font-bold uppercase tracking-wider text-slate-400"
        >
          Observaciones generales{" "}
          <span className="normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          id="reflective-observaciones"
          value={observaciones}
          onChange={(event) => onObservacionesChange(event.target.value)}
          placeholder="Notas adicionales sobre el reflejante..."
          rows={3}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

    </div>
  );
});
