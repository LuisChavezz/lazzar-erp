/**
 * ¿Ya se sabe con qué lector lee una captura con antena (Recepción, Surtido,
 * encuadre)? No mientras el catálogo de lectores no responda: antes de eso
 * `lectores` está vacío, `lectorId` es `null` y se sondearía SIN `?lector=`,
 * así que entrarían lecturas de los otros lectores de la empresa (EC-997).
 * Tampoco con varios lectores y ninguno elegido: leer de todos mezclaría
 * cajones. Con un catálogo que no respondió se lee de todos, como siempre
 * (`useRfidLectorSeleccionado`).
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
