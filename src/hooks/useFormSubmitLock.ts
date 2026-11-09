import { useRef, type RefObject } from "react";
import { useStore, type AnyFormApi } from "@tanstack/react-form";
import { runWithSubmitLock } from "@/src/utils/actionLocks";

/** Lo que el candado necesita de un formulario de TanStack Form. */
export type SubmitLockableForm = Pick<AnyFormApi, "baseStore" | "handleSubmit">;

export interface FormSubmitLockOptions {
  /**
   * Marca de SALIDA tras un guardado correcto. La declara el llamador ANTES de
   * `useForm` (su `onSubmit` la pone en `true` justo antes de navegar o de
   * cambiar a la vista de éxito) y el candado la lee en cada envío.
   *
   * Hace falta porque `runWithSubmitLock` suelta el candado al terminar el
   * envío, también el que salió bien, y el formulario sigue montado hasta que
   * llega la navegación o el render siguiente. Lo que cubre son los envíos
   * PROGRAMÁTICOS en ese hueco (`form.requestSubmit()`, `dispatchEvent` de un
   * `submit`…). Un Enter del teclado no llega: el botón de envío por defecto
   * sigue deshabilitado (`isPending`) y el navegador no hace el envío
   * implícito con ese botón deshabilitado.
   */
  leavingRef?: RefObject<boolean>;
}

/**
 * Candado contra el doble envío de un formulario de página (EC-753).
 *
 * - `handleFormSubmit`: `onSubmit` del `<form>`. Toma el candado de forma
 *   SÍNCRONA (`runWithSubmitLock`) antes de la validación asíncrona de TanStack
 *   Form y lo suelta al terminar, con cualquier resultado; un segundo disparo
 *   en el mismo tick (Enter + clic) no hace nada. Un `useState` no servía: el
 *   segundo disparo leía todavía el valor del render anterior. Con
 *   `leavingRef` marcado, no envía nada.
 * - `isSubmitLocked()`: para que `handleReset` no toque el formulario mientras
 *   se envía (ni después de un guardado correcto que ya está saliendo).
 * - `isFormSubmitting`: `isSubmitting` de TanStack SUSCRITO (no
 *   `form.state.isSubmitting`, que no vuelve a renderizar), para pintar
 *   "Guardando..." también mientras se valida. Solo es para pintar: llega un
 *   render tarde y nunca debe usarse como candado.
 */
export function useFormSubmitLock(
  form: SubmitLockableForm,
  { leavingRef }: FormSubmitLockOptions = {},
) {
  const submitLockRef = useRef(false);
  const isFormSubmitting = useStore(form.baseStore, (state) => state.isSubmitting);

  const isLeaving = () => Boolean(leavingRef?.current);

  const handleFormSubmit = (event?: { preventDefault(): void; stopPropagation(): void }) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isLeaving()) return;
    void runWithSubmitLock(submitLockRef, () => form.handleSubmit());
  };

  const isSubmitLocked = () => submitLockRef.current || isLeaving();

  return { handleFormSubmit, isSubmitLocked, isFormSubmitting };
}
