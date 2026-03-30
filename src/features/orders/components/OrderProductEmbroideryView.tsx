"use client";

import Image from "next/image";
import { ArrowLeftIcon, EyeIcon } from "@/src/components/Icons";
import { OrderById } from "../interfaces/order.interface";
import { buildEmbroideryGroups } from "../utils/orderProductEmbroideryGroups";

type OrderDetail = OrderById["detalles"][number];

interface OrderProductEmbroideryViewProps {
  detail: OrderDetail;
  onBack: () => void;
}
const externalImageLoader = ({ src }: { src: string }) => src;

export const OrderProductEmbroideryView = ({ detail, onBack }: OrderProductEmbroideryViewProps) => {
  const groups = buildEmbroideryGroups(detail.tallas);
  const withEmbroideryCount = groups.filter((group) => group.hasEmbroidery).length;
  const openImagePreview = (src: string) => {
    window.open(src, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">
            Bordados del producto
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {withEmbroideryCount} configuración(es) de bordado
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

      <div className="space-y-3">
        {groups.map((group) => (
          <article
            key={group.key}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-3 sm:p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  group.hasEmbroidery
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                    : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                }`}
              >
                {group.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tallas: {group.sizes.map((size) => size.talla_nombre).join(", ")}
              </span>
            </div>

            {group.hasEmbroidery ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">
                    Notas
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 wrap-break-word">
                    {group.notes || "Sin notas"}
                  </p>
                </div>

                {group.locations.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {group.locations.map((location, index) => (
                      <div
                        key={`${location.codigo}-${location.ancho_cm}-${location.alto_cm}-${index}`}
                        className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 grid grid-cols-1 sm:grid-cols-[1fr_148px] gap-3 items-start"
                      >
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Ubicación {location.codigo}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Medidas: {location.ancho_cm} x {location.alto_cm} cm
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Hilo: {location.color_hilo || "Sin especificar"}
                          </p>
                        </div>
                        {location.imagen ? (
                          <div className="group relative rounded-lg border border-slate-200 dark:border-white/10 p-1.5 bg-slate-50 dark:bg-black/20">
                            <div className="absolute top-3 right-3 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-in-out">
                              <button
                                type="button"
                                onClick={() => openImagePreview(location.imagen)}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shadow-sm transition-colors"
                                aria-label={`Expandir imagen de ubicación ${location.codigo}`}
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <Image
                              loader={externalImageLoader}
                              unoptimized
                              src={location.imagen}
                              alt={`Imagen de bordado en ubicación ${location.codigo}`}
                              width={220}
                              height={150}
                              className="w-full h-24 object-contain rounded-md"
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/10 h-24 flex items-center justify-center px-2 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50/70 dark:bg-white/5">
                            Sin imagen
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sin ubicaciones configuradas.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estas tallas no incluyen bordado.
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
