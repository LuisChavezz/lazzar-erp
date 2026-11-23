"use client";

import { useEffect, useEffectEvent } from "react";
import { useSearchParams } from "next/navigation";

interface SearchParamReaderProps {
  param: string;
  /** Recibe el valor crudo cada vez que cambia (`null` si no viene). */
  onChange: (value: string | null) => void;
}

/**
 * Lee UN parámetro de la query con `useSearchParams` y lo reporta al padre.
 * No pinta nada. Va dentro de su propio `<Suspense fallback={null}>`: así solo
 * él sale del prerender, y el listado que lo monta se sigue prerenderizando
 * con su propio estado de carga (ver `useUrlDetailParam`).
 */
export function SearchParamReader({ param, onChange }: SearchParamReaderProps) {
  const value = useSearchParams().get(param);
  const report = useEffectEvent(onChange);
  useEffect(() => {
    report(value);
  }, [value]);
  return null;
}
