/**
 * Lleva el viewport al primer campo inválido tras un submit fallido.
 *
 * Vivía DUPLICADA en `useQuoteForm` y `useQuoteEditForm`. Las dos copias se
 * separaron y el resultado fue que un error de la edición no tenía a dónde
 * hacer scroll. Vive aquí para que las dos pantallas no puedan volver a
 * divergir.
 */

/**
 * Anclas de sección, en el orden visual del formulario. Se usan cuando el error
 * no corresponde a ningún control con `name` (por ejemplo, un error a nivel de
 * arreglo como "agrega al menos un producto").
 */
const SECTION_ANCHORS = [
  "clienteBusqueda",
  "servicios_extras",
  "items",
] as const;

const matchesPath = (issuePaths: string[], field: string) =>
  issuePaths.some((path) => path === field || path.startsWith(`${field}.`));

export const scrollToFirstValidationError = (
  formElement: HTMLFormElement,
  issuePaths: string[]
) => {
  if (issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  const controls = Array.from(
    formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    )
  ).filter(
    (element) =>
      Boolean(element.name) &&
      !element.disabled &&
      !(element instanceof HTMLInputElement && element.type === "hidden")
  );

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some(
      (path) =>
        path === control.name ||
        path.startsWith(`${control.name}.`) ||
        control.name.startsWith(`${path}.`)
    )
  );

  if (firstInvalidControl) {
    firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidControl.focus({ preventScroll: true });
    return;
  }

  // Se recorren todas las anclas candidatas y solo se detiene en una que EXISTA
  // en el DOM. Antes cada rama hacía `return` incondicional, así que un error
  // cuya sección no estuviera renderizada abortaba la búsqueda: el submit
  // fallaba sin mover la vista ni señalar nada.
  for (const anchor of SECTION_ANCHORS) {
    if (!matchesPath(normalizedIssuePaths, anchor)) {
      continue;
    }
    const element = formElement.querySelector<HTMLElement>(
      `[data-error-anchor="${anchor}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
};
