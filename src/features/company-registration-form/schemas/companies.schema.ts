import { z } from "zod";

export const CompanyFormSchema = z.object({
  codigo: z.string().min(1, "Código es requerido"),
  razon_social: z.string().min(1, "Razón social es requerida"),
  nombre_comercial: z.string().min(1, "Nombre comercial es requerido"),
  rfc: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value || value.length === 0) return true;
        const rfcRegex =
          /^([A-Z&Ñ]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/i;
        return rfcRegex.test(value);
      },
      "RFC no es válido"
    ),
  email_contacto: z
    .string()
    .min(1, "Email de contacto es requerido")
    .email("Email no es válido"),
  telefono: z.string().min(7, "Teléfono es requerido"),
  sitio_web: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        value.length === 0 ||
        /^https?:\/\//.test(value) ||
        /^www\./.test(value),
      "URL no es válida"
    ),
  moneda_base: z.enum(["MXN", "USD", "EUR"], {
    message: "Moneda base es requerida",
  }),
  timezone: z.enum(["America/Mexico_City", "America/New_York", "Europe/Madrid"], {
    message: "Zona horaria es requerida",
  }),
  idioma: z.enum(["es-MX", "en-US", "es-ES"], {
    message: "Idioma es requerido",
  }),
  estatus: z.enum(["activo", "suspendido"], {
    message: "Estatus es requerido",
  }),
  logo_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (value) =>
        !value ||
        value.length === 0 ||
        /^https?:\/\//.test(value) ||
        /^www\./.test(value),
      "URL no es válida"
    ),
});

export type CompanyFormValues = z.infer<typeof CompanyFormSchema>;
