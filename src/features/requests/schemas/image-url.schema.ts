/**
 * Schema reutilizable para validar URLs de imágenes.
 * Comprueba que la cadena sea una URL válida y que termine en una extensión
 * de imagen conocida.
 *
 * CLON de `quotes/schemas/image-url.schema.ts`. Ver la nota de
 * `request.schema.ts` sobre por qué el módulo de solicitudes mantiene su propia
 * capa de tipos en lugar de reexportar la de cotizaciones.
 */
import { z } from "zod";

const IMAGE_URL_EXTENSION_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i;

export const imageUrlSchema = z.string().trim().url("URL inválida").refine(
  (value) => {
    try {
      const parsed = new URL(value);
      return IMAGE_URL_EXTENSION_REGEX.test(parsed.pathname + parsed.search + parsed.hash);
    } catch {
      return false;
    }
  },
  "Debe incluir una extensión de imagen válida"
);
