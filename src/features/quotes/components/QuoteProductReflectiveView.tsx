"use client";

import { ArrowLeftIcon } from "@/src/components/Icons";
import { QuoteById } from "../interfaces/quote.interface";
import { OPCION_LABEL, POSICION_LABEL, TIPO_LABEL } from "../utils/reflective-labels";

type QuoteDetail = QuoteById["detalles"][number];
type ReflectiveConfig = QuoteDetail["tallas"][number]["reflejante_config"][number];

interface ReflectiveGroup {
  key: string;
  configs: ReflectiveConfig[];
  sizes: { id: number; nombre: string }[];
}

/**
 * Agrupa las tallas que comparten la misma configuración de reflejante
 * para evitar repetición en la vista.
 */
const buildReflectiveGroups = (tallas: QuoteDetail["tallas"]): ReflectiveGroup[] => {
  const groupMap = new Map<string, ReflectiveGroup>();

  for (const talla of tallas) {
    if (!talla.lleva_reflejante || !talla.reflejante_config?.length) {
      continue;
    }
    const key = JSON.stringify(talla.reflejante_config);
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, configs: talla.reflejante_config, sizes: [] });
    }
    groupMap.get(key)!.sizes.push({ id: talla.id, nombre: talla.talla_nombre });
  }

  return Array.from(groupMap.values());
};

interface QuoteProductReflectiveViewProps {
  detail: QuoteDetail;
  onBack: () => void;
}

export const QuoteProductReflectiveView = ({ detail, onBack }: QuoteProductReflectiveViewProps) => {
  const groups = buildReflectiveGroups(detail.tallas);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">
            Reflejantes del producto
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {groups.length} configuración(es) de reflejante
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 cursor-pointer rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Volver
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-4 text-xs text-slate-400 dark:text-slate-500 text-center">
          Sin configuraciones de reflejante para este producto.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => (
            <article
              key={group.key}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-3 sm:p-4 space-y-3"
            >
              {/* Encabezado del grupo: tallas que comparten esta config */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
                  Configuración {index + 1}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tallas: {group.sizes.map((s) => s.nombre).join(", ")}
                </span>
              </div>

              {/* Listado de posiciones de esta configuración */}
              <div className="space-y-2">
                {group.configs.map((cfg, cfgIndex) => (
                  <div
                    key={`${cfg.posicion}-${cfgIndex}`}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                        Posición
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {POSICION_LABEL[cfg.posicion] ?? cfg.posicion}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                        Opción
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          cfg.opcion === "catalogo"
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                            : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                        }`}
                      >
                        {OPCION_LABEL[cfg.opcion] ?? cfg.opcion}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                        Tipo
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {TIPO_LABEL[cfg.tipo] ?? cfg.tipo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
