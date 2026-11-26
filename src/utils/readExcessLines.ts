import { firstDrfMessage } from "./firstDrfMessage";

/**
 * Lee `detalles_exceso` del `400` de exceso de las altas de órdenes de trabajo
 * (bordado, reflejante, corte de manga): un ARREGLO de strings ya formateados
 * por el backend, uno por línea que excede su saldo. Se recorre entrada por
 * entrada (en vez de usar `firstDrfMessage` sobre el arreglo completo, que
 * devolvería solo la primera) porque el usuario necesita ver TODAS las líneas
 * que tiene que bajar. Devuelve `undefined` si no hay nada utilizable, para que
 * la presencia del campo siga siendo el discriminante del caso.
 *
 * Vive aquí, compartido por los tres parsers, para que un cambio de forma de
 * `detalles_exceso` se corrija en un solo sitio.
 */
export function readExcessLines(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const lines = value
    .map((entry) => firstDrfMessage(entry)?.trim())
    .filter((message): message is string => Boolean(message));
  return lines.length > 0 ? lines : undefined;
}
