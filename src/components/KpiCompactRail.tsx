"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Contenedor de la grilla compacta de `KpiGrid`. En un contenedor angosto
 * (< 34rem, el móvil) es un carrusel horizontal con snap: las tarjetas ocupan
 * UNA fila y la siguiente asoma por la derecha, en vez de apilarse y empujar
 * el listado fuera de la pantalla; debajo, un punto por tarjeta marca cuál se
 * ve (y lleva a ella al tocarlo). Desde 34rem es la rejilla de siempre y los
 * puntos se ocultan — todo por clases de `@container`, sin medir el viewport.
 *
 * Vive aparte de `KpiGrid` para que esa siga sin estado (la montan también
 * componentes de servidor): aquí solo llegan las tarjetas ya renderizadas.
 */
export function KpiCompactRail({
  className,
  count,
  children,
}: {
  className: string;
  count: number;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Paso entre tarjetas: el ancho de una más el hueco entre ellas.
  const getStep = (rail: HTMLDivElement) => {
    const [first, second] = Array.from(rail.children) as HTMLElement[];
    if (!first) return 0;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  };

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const step = getStep(rail);
    if (step <= 0) return;
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    setActiveIndex(atEnd ? count - 1 : Math.round(rail.scrollLeft / step));
  };

  const goTo = (index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({ left: getStep(rail) * index, behavior: "smooth" });
  };

  return (
    <>
      <div ref={railRef} onScroll={handleScroll} className={className} role="list">
        {children}
      </div>
      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 @min-[34rem]:hidden">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ver indicador ${index + 1} de ${count}`}
              aria-current={index === activeIndex ? "true" : undefined}
              // Área táctil de 24px alrededor de un punto de 6px.
              className="group grid h-6 w-6 place-items-center cursor-pointer"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-5 bg-sky-500"
                    : "w-1.5 bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
