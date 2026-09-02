/**
 * Lleva a la vista el primer campo inválido tras una validación local fallida.
 *
 * "Primero" se resuelve por ORDEN DEL DOM y no por el orden de las claves del
 * objeto de errores: se recorren los controles del formulario tal como están
 * montados y se elige el primero que aparezca entre los inválidos. El orden en
 * que Zod emite sus issues sigue la declaración del schema, que no tiene por
 * qué coincidir con lo que el usuario ve de arriba abajo — en formularios
 * largos son órdenes distintos y el de las claves manda al campo equivocado.
 *
 * El emparejamiento tolera rutas anidadas (`lineas.0.cantidad`) además de los
 * nombres planos, para servir a formularios con arrays de campos.
 *
 * El scroll se difiere un frame a propósito: quien llama acaba de programar un
 * re-render con los mensajes de error, y centrar antes de que se pinten movería
 * la vista a una posición que cambia enseguida.
 *
 * @param formElement Formulario donde buscar. `null` es un no-op, para poder
 *                    pasar un `ref.current` sin comprobarlo antes.
 * @param issuePaths  Nombres (o rutas) de los campos inválidos.
 */
export const scrollToFirstValidationError = (
  formElement: HTMLFormElement | null,
  issuePaths: string[]
) => {
  if (!formElement || issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  if (normalizedIssuePaths.length === 0) {
    return;
  }

  requestAnimationFrame(() => {
    // El formulario pudo desmontarse entre la llamada y el frame siguiente.
    if (!formElement.isConnected) {
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

    const firstInvalidControl = controls.find((control) =>
      normalizedIssuePaths.some(
        (path) =>
          path === control.name ||
          path.startsWith(`${control.name}.`) ||
          control.name.startsWith(`${path}.`)
      )
    );

    if (!firstInvalidControl) {
      return;
    }

    firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidControl.focus({ preventScroll: true });
  });
};
