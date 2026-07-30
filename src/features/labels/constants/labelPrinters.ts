import type { LabelPrinter } from "../interfaces/label.interface";

/**
 * Impresoras Zebra "detectadas" por Browser Print. Lista fija y COMPARTIDA
 * por las 3 etiquetas de la maqueta — a diferencia de `sku`/`zpl`/etc., la
 * impresora no es un atributo de una etiqueta en particular (el mismo equipo
 * imprime cualquiera de ellas), así que no se genera por registro en
 * `mocks/labels.mock.ts`. Nada detrás detecta ni valida estos equipos.
 */
export const MOCK_LABEL_PRINTERS: LabelPrinter[] = [
  { id: "zebra-zd621r-1", nombre: "Zebra ZD621R-203dpi", ip: "192.168.10.41" },
  { id: "zebra-zt411r-1", nombre: "Zebra ZT411R-300dpi", ip: "192.168.10.57" },
  { id: "zebra-zd621r-2", nombre: "Zebra ZD621R-203dpi (Corte)", ip: "192.168.10.63" },
];
