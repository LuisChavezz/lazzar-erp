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

const matchesPath = (path: string, field: string) =>
  path === field || path.startsWith(`${field}.`);

interface ErrorTarget {
  element: HTMLElement;
  /** Qué enfocar al llegar: el control mismo o el primer botón de la celda. */
  focusable: HTMLElement | null;
}

/**
 * Destino de UN error: su control con `name`; si no tiene, su celda propia
 * (`data-error-field`, p. ej. el color de una partida, EC-641); si tampoco, el
 * ancla de su sección.
 */
const resolveTarget = (
  formElement: HTMLFormElement,
  controls: HTMLElement[],
  path: string
): ErrorTarget | null => {
  const control = controls.find((element) => {
    const name = (element as HTMLInputElement).name;
    return path === name || path.startsWith(`${name}.`) || name.startsWith(`${path}.`);
  });
  if (control) {
    return { element: control, focusable: control };
  }

  const fieldCell = Array.from(
    formElement.querySelectorAll<HTMLElement>("[data-error-field]")
  ).find((element) => element.dataset.errorField === path);
  if (fieldCell) {
    return {
      element: fieldCell,
      focusable: fieldCell.querySelector<HTMLElement>("button:not([disabled])"),
    };
  }

  // Solo cuenta un ancla que EXISTA en el DOM: un error cuya sección no esté
  // renderizada no debe abortar la búsqueda de las demás.
  for (const anchor of SECTION_ANCHORS) {
    if (!matchesPath(path, anchor)) {
      continue;
    }
    const element = formElement.querySelector<HTMLElement>(`[data-error-anchor="${anchor}"]`);
    if (element) {
      return { element, focusable: null };
    }
  }
  return null;
};

/**
 * Cada error se resuelve a su destino y se va al que esté MÁS ARRIBA en el
 * documento, que es el orden en que el usuario lee el formulario. Antes se
 * probaban por tipo (controles, luego celdas, luego secciones), así que un
 * control al final del formulario ganaba a una celda o sección de más arriba.
 */
export const scrollToFirstValidationError = (
  formElement: HTMLFormElement,
  issuePaths: string[]
) => {
  const normalizedIssuePaths = issuePaths.filter(Boolean);
  if (normalizedIssuePaths.length === 0) {
    return;
  }

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

  const first = normalizedIssuePaths
    .map((path) => resolveTarget(formElement, controls, path))
    .filter((target): target is ErrorTarget => target !== null)
    .reduce<ErrorTarget | null>(
      (best, target) =>
        !best ||
        best.element.compareDocumentPosition(target.element) & Node.DOCUMENT_POSITION_PRECEDING
          ? target
          : best,
      null
    );

  if (!first) {
    return;
  }
  first.element.scrollIntoView({ behavior: "smooth", block: "center" });
  first.focusable?.focus({ preventScroll: true });
};
