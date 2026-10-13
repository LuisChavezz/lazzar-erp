import { z } from "zod";

/**
 * Correo OPCIONAL de un formulario: un email válido o la cadena vacía. Una sola
 * definición para que "correo opcional" valide igual (mismo formato, mismo
 * mensaje) en clientes, empleados y oportunidades.
 */
export const optionalEmailSchema = z.union([z.string().email("Correo inválido"), z.literal("")]);
