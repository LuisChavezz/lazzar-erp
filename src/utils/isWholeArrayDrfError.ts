/**
 * `true` si el error de DRF de un arreglo anidado de renglones NO viene indexado
 * por renglón.
 *
 * DRF, al validar un `many=True` anidado, devuelve una lista ALINEADA POR ÍNDICE
 * con un objeto por renglón (`{}` para los válidos). En cambio
 * `raise ValidationError({"<renglones>": "..."})` —que es como llegan los errores
 * de negocio de los servicios, p. ej. el descuadre de
 * `PolizaService.validar_suma_cero`— produce una lista de STRINGS que habla del
 * documento ENTERO, no de su primer renglón.
 *
 * Sin esta distinción, "La suma de cargos (100.00) debe ser igual a la suma de
 * abonos (90.00)" se pintaría bajo el renglón 1 —probablemente correcto— y el
 * usuario buscaría el problema donde no está.
 *
 * Compartida por `parsePolizaError` y `parseSupplierInvoiceError`.
 */
export const isWholeArrayDrfError = (entries: unknown[]): boolean =>
  entries.length > 0 &&
  entries.every((entry) => entry === null || typeof entry === "string");
