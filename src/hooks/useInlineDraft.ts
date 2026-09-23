"use client";

import { useState } from "react";

/** Normaliza a `null` cuando el valor queda vacío tras recortar espacios. */
export const normalizeDraft = (value: string | null): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Borrador local de un campo de texto que se guarda AL SALIR (blur) contra un
 * valor canónico del servidor.
 *
 * Resuelve una pérdida silenciosa de datos que tenían duplicada los campos de
 * máquina y observaciones. Ambos resincronizaban el borrador en cada cambio de
 * la prop:
 *
 *     if (value !== prevValue) { setPrevValue(value); setDraft(value ?? ""); }
 *
 * `isPending` se apaga en cuanto responde el PATCH, ANTES de que vuelva el
 * `GET` que invalida el hook, así que el campo se re-habilita mientras el
 * re-fetch sigue en vuelo. Si el usuario aprovechaba para teclear, ese re-fetch
 * disparaba el `setDraft` y le borraba lo escrito; peor aún, al salir el
 * `commit` comparaba borrador contra servidor, los encontraba IGUALES y no
 * mandaba nada. La edición se perdía sin ningún error. (Es la misma carrera que
 * colgaba los tests 5 y 7 del E2E.)
 *
 * La corrección es `isEditing`: en cuanto el usuario teclea, el valor del
 * servidor deja de pisar el borrador hasta que salga del campo. Un campo que
 * NADIE está editando sí se resincroniza, que es lo que mantiene la ficha al
 * día tras guardar.
 *
 * Se rastrea con estado y no con un `ref` a propósito: leer `ref.current`
 * durante el render es justo lo que marca la regla `react-hooks/refs` del
 * React Compiler, activa en este repo.
 */
export function useInlineDraft(
  /** Valor canónico del servidor. */
  serverValue: string | null,
  /**
   * Se invoca al salir del campo SOLO si el valor cambió. Si devuelve una
   * promesa (p. ej. `mutateAsync`) y ésta se rechaza, el campo vuelve al valor
   * del servidor: sin eso, un guardado fallido dejaba pintado el borrador como
   * si se hubiera guardado, porque el valor del servidor no cambia y nada
   * vuelve a sincronizarlo. El aviso del error es cosa de quien guarda (toast).
   */
  onSave: (value: string | null) => void | Promise<unknown>,
) {
  const [draft, setDraftValue] = useState(serverValue ?? "");
  const [prevServerValue, setPrevServerValue] = useState(serverValue);
  /** El usuario tecleó y todavía no ha salido del campo. */
  const [isEditing, setIsEditing] = useState(false);
  /** Guardados rechazados, y cuántos ya se atendieron (ver abajo). */
  const [failedSaves, setFailedSaves] = useState(0);
  const [handledFailedSaves, setHandledFailedSaves] = useState(0);

  // Ajuste de estado derivado EN RENDER (el patrón documentado de React para
  // derivar de una prop sin `useEffect`), pero solo cuando no hay una edición
  // en curso que pisar.
  if (serverValue !== prevServerValue) {
    setPrevServerValue(serverValue);
    if (!isEditing) setDraftValue(serverValue ?? "");
  }

  // Un guardado se rechazó: se vuelve al valor del servidor, que no cambió.
  // Se resuelve aquí, en render, y no dentro del `catch`: ahí `serverValue` e
  // `isEditing` serían los del momento del guardado, y si el usuario ya volvió
  // a teclear no hay que pisarle lo nuevo.
  if (failedSaves !== handledFailedSaves) {
    setHandledFailedSaves(failedSaves);
    if (!isEditing) setDraftValue(serverValue ?? "");
  }

  const setDraft = (next: string) => {
    setIsEditing(true);
    setDraftValue(next);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const next = normalizeDraft(draft);
    // Sin cambios respecto al servidor no hay nada que guardar: evita un PATCH
    // por el simple hecho de entrar y salir del campo.
    if (next === normalizeDraft(serverValue)) return;
    const result = onSave(next);
    if (result) {
      result.catch(() => setFailedSaves((count) => count + 1));
    }
  };

  return { draft, setDraft, handleBlur };
}
