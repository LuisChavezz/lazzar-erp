"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMexicoCurrentQuincena } from "@/src/utils/mexicoTime";
import {
  isSameQuincena,
  parseQuincenaKey,
  toQuincenaKey,
  type Quincena,
} from "@/src/utils/quincena";

/**
 * Quincena del listado en la URL (`?quincena=2026-10-1`), como el periodo del
 * historial de asistencia: el enlace es compartible y sobrevive al refresh y
 * al botón de atrás. Sin parámetro, o con uno inválido, es la quincena en
 * curso en México; elegir la en curso quita el parámetro.
 */
export function usePayrollSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = getMexicoCurrentQuincena();
  const fromUrl = parseQuincenaKey(searchParams.get("quincena")) ?? current;

  // `router.replace` actualiza `useSearchParams` DESPUÉS: sin este valor
  // optimista, cambiar mes y mitad seguidos partiría del valor viejo y el
  // segundo cambio desharía el primero. Se descarta en cuanto la URL lo alcanza.
  const [pending, setPending] = useState<Quincena | null>(null);
  if (pending && isSameQuincena(pending, fromUrl)) {
    setPending(null);
  }
  const quincena = pending ?? fromUrl;

  /** Cambiar la quincena es ajustar la vista, no navegar: `replace`. */
  const setQuincena = (next: Quincena) => {
    setPending(next);
    const params = new URLSearchParams(searchParams.toString());
    if (isSameQuincena(next, current)) {
      params.delete("quincena");
    } else {
      params.set("quincena", toQuincenaKey(next));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return { quincena, setQuincena };
}
