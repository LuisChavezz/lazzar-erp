import { z } from "zod";

const emailSchema = z.string().email();

/**
 * Destinatarios de un campo de correo capturado a mano (p. ej.
 * `correo_facturas`), que puede traer varias direcciones separadas por coma o
 * punto y coma. Devuelve solo las válidas, sin repetir.
 */
export const parseEmailRecipients = (raw: string | null | undefined): string[] => {
  const seen = new Set<string>();
  return (raw ?? "")
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter((address) => {
      const key = address.toLowerCase();
      if (!address || seen.has(key) || !emailSchema.safeParse(address).success) return false;
      seen.add(key);
      return true;
    });
};

/**
 * Lista de destinatarios en el formato del encabezado `To` (RFC 5322: separados
 * por coma), que es como `/ai/google/gmail/send/` usa el campo `to` tal cual.
 */
export const formatEmailRecipients = (recipients: string[]): string => recipients.join(", ");
