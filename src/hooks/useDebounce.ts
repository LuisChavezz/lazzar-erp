import { useEffect, useState } from "react";

/**
 * Difiere un valor hasta que deja de cambiar durante `delay` ms. Útil para no
 * disparar trabajo caro —una petición al servidor, un filtrado— en cada
 * pulsación.
 *
 * Existía ya como copia inline en `ProductVariantSearchDropdown` (filtrado en
 * cliente, 250ms); se extrae aquí para reutilizarlo desde el onboarding de
 * etiquetas RFID (búsqueda contra el servidor y cantidad del preview).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
