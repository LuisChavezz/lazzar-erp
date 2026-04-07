/**
 * Schema reutilizable para validar URLs de imágenes.
 * Comprueba que la cadena sea una URL válida y que termine en una extensión
 * de imagen conocida.
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