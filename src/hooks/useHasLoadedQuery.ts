import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";

interface UseHasLoadedQueryOptions<T> {
  data: T | undefined;
  isError: boolean;
  /**
   * `errorUpdatedAt` de la consulta (`query.errorUpdatedAt`): identidad de CADA
   * fallo. Es lo que permite avisar exactamente una vez por refetch fallido,
   * aunque el componente se remonte (ver `notifiedFailures`).
   */
  errorUpdatedAt: number;
  toastId: string;
  errorMessage?: string;
}

/** Fallos recordados por `toastId` (ver `notifiedFailures`). */
const MAX_NOTIFIED_PER_TOAST = 10;

/**
 * Últimos `errorUpdatedAt` ya avisados, por `toastId`. Vive a nivel de módulo
 * para que varias instancias montadas a la vez que ven el MISMO fallo den un
 * solo toast, y se vacía al recargar la pestaña.
 *
 * Varios valores por `toastId`, y no uno solo, porque varias consultas pueden
 * compartir `toastId` (p. ej. `useProducts` con distintos `tipo_id`) y fallar
 * casi a la vez en una misma invalidación.
 *
 * Acotado a `MAX_NOTIFIED_PER_TOAST` por `toastId`, descartando el más viejo:
 * sin límite crecería sin fin con consultas que hacen polling. El límite va por
 * `toastId` para que un hook ruidoso no desplace los fallos de otros. Costo: si
 * un mismo `toastId` acumula más de ese número de fallos nuevos mientras uno
 * viejo sigue vigente, remontar el consumidor de ese viejo avisa una vez más.
 */
const notifiedFailures = new Map<string, number[]>();

/** Registra el fallo; `false` si ya se había avisado. */
const markNotified = (toastId: string, errorUpdatedAt: number): boolean => {
  const notified = notifiedFailures.get(toastId) ?? [];
  if (notified.includes(errorUpdatedAt)) return false;
  notified.push(errorUpdatedAt);
  if (notified.length > MAX_NOTIFIED_PER_TOAST) notified.shift();
  notifiedFailures.set(toastId, notified);
  return true;
};

/**
 * Distingue una carga inicial fallida de un refetch fallido con datos en
 * caché. Si el refetch falla pero ya hay datos cargados, muestra un toast
 * no bloqueante en vez de esconder el contenido existente. `toastId` debe
 * ser único por hook consumidor para que llamadas repetidas (p. ej. el
 * mismo hook usado en varios componentes de una misma página) colapsen en
 * un solo toast en lugar de apilarse.
 *
 * El toast sale una vez por EPISODIO de error visto por la instancia: una
 * racha de fetches fallidos sin un éxito entre medio (p. ej. un polling con el
 * backend caído) da un solo toast, y un fallo tras un éxito abre un episodio
 * nuevo. Solo cuentan los fallos ocurridos con la instancia montada
 * (`errorUpdatedAt` posterior al montaje): montar con la consulta ya en error
 * no avisa por ese fallo viejo —remontar con el fetch colgado no avisa, y un
 * reintento al montar que tiene éxito tampoco—, pero si el refetch de ese
 * montaje falla, sí avisa, aunque otra instancia ya avisara del episodio.
 * Varias instancias montadas que ven el mismo fallo dan un solo toast
 * (`notifiedFailures`).
 *
 * `isInitialError` es `isInitialLoadError(isError, hasLoaded)` ya calculado,
 * para los hooks que exponen la bandera filtrada en vez del `isError` crudo.
 */
export const useHasLoadedQuery = <T>({
  data,
  isError,
  errorUpdatedAt,
  toastId,
  errorMessage = "No se pudo actualizar la información. Mostrando datos anteriores.",
}: UseHasLoadedQueryOptions<T>) => {
  const hasLoaded = data !== undefined;
  // Momento del montaje, fijado en la primera ejecución del efecto (no en el
  // render, que debe ser puro). Un fallo con `errorUpdatedAt` anterior o igual
  // ocurrió antes de que esta instancia existiera.
  const mountedAtRef = useRef(0);
  // ¿Esta instancia ya cubrió el episodio de error en curso (avisó, o vio el
  // fallo ya avisado por otra instancia)? Se reinicia cuando `isError` vuelve a
  // `false`, que marca el fin del episodio. No se usa `data` para detectar el
  // éxito: con structural sharing un refetch correcto sin cambios conserva la
  // misma referencia.
  const episodeCoveredRef = useRef(false);

  useEffect(() => {
    if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();
    if (!isError) {
      episodeCoveredRef.current = false;
      return;
    }
    if (!hasLoaded || episodeCoveredRef.current) return;
    if (errorUpdatedAt <= mountedAtRef.current) return;
    episodeCoveredRef.current = true;
    if (markNotified(toastId, errorUpdatedAt)) toast.error(errorMessage, { id: toastId });
  }, [isError, hasLoaded, errorUpdatedAt, errorMessage, toastId]);

  return { hasLoaded, isInitialError: isInitialLoadError(isError, hasLoaded) };
};
