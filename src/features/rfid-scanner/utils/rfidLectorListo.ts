/**
 * ¿Ya se sabe con qué lector lee una captura con antena (Recepción, Surtido,
 * encuadre)? No mientras el catálogo de lectores no responda: antes de eso
 * `lectores` está vacío, `lectorId` es `null` y se sondearía SIN `?lector=`,
 * así que entrarían lecturas de los otros lectores de la empresa (EC-997).
 * Tampoco con varios lectores y ninguno elegido: leer de todos mezclaría
 * cajones. Solo si el backend no tiene el catálogo (404) se lee de todos,
 * como siempre (`estadoCatalogoLectores`).
 */
export const rfidLectorListo = ({
  catalogoResuelto,
  lectores,
  lectorId,
}: {
  catalogoResuelto: boolean;
  lectores: number;
  lectorId: number | null;
}) => catalogoResuelto && !(lectores > 1 && lectorId === null);

/**
 * Estado del catálogo de lectores para las capturas con antena (EC-997):
 * `resuelto` si ya respondió con la lista, o si el backend no tiene el
 * endpoint (404, `noDisponible`: se lee de todos los lectores, el respaldo
 * de siempre); `fallido` si falló de otra forma y nunca cargó. Con un fallo
 * pasajero la antena NO lee de todos: queda apagada mientras el catálogo
 * vuelve a intentarlo (`useRfidLectores` reintenta y sondea cada 30 s).
 */
export const estadoCatalogoLectores = ({
  hasLoaded,
  isInitialError,
  noDisponible,
}: {
  hasLoaded: boolean;
  isInitialError: boolean;
  noDisponible: boolean;
}) => ({
  resuelto: hasLoaded || noDisponible,
  fallido: !hasLoaded && !noDisponible && isInitialError,
});
