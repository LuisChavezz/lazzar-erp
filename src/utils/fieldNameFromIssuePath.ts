/**
 * Ruta de un issue de Zod → `name` del control en el DOM.
 *
 * Son dos convenciones distintas para lo mismo: Zod entrega
 * `["poliza_detalles", 0, "cargo"]` y TanStack Form nombra ese campo
 * `poliza_detalles[0].cargo` (con corchetes), que es el `name` —y por tanto el
 * `id`— que acaba en el input. `scrollToFirstValidationError` empareja por
 * `name`, así que sin esta traducción los errores de los renglones de un
 * arreglo de campos no encontrarían su input.
 *
 * El mapa de errores de los formularios que la usan sigue en la forma con PUNTOS
 * (`poliza_detalles.0.cargo`), que es la que consulta `getError` en la vista;
 * esta conversión es solo para el emparejamiento con el DOM.
 *
 * Compartida por `usePolizaForm` y `useSupplierInvoiceForm`.
 */
export const fieldNameFromIssuePath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>(
    (name, segment) =>
      typeof segment === "number"
        ? `${name}[${segment}]`
        : name
          ? `${name}.${String(segment)}`
          : String(segment),
    "",
  );
