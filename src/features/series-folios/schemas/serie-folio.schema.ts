import { z } from "zod";

export const SerieFolioFormSchema = z
  .object({
    tipo_documento: z.string().min(1, "El tipo de documento es requerido"),
    serie: z.string().min(1, "La serie es requerida").max(20, "La serie no puede tener más de 20 caracteres"),
    folio_inicial: z.number().min(1, "El folio inicial es requerido"),
    folio_final: z.number().min(1, "El folio final es requerido"),
    prefijo: z.string().min(1, "El prefijo es requerido").max(20, "El prefijo no puede tener más de 20 caracteres"),
    sufijo: z.string().min(1, "El sufijo es requerido").max(20, "El sufijo no puede tener más de 20 caracteres"),
    relleno_ceros: z.number().min(0, "El relleno de ceros no puede ser negativo"),
    separador: z.string().min(1, "El separador es requerido").max(5, "El separador no puede tener más de 5 carácter"),
    incluir_anio: z.boolean(),
    reiniciar_anual: z.boolean(),
    sucursal: z.number().min(1, "La sucursal es requerida"),
  })
  .refine((data) => data.folio_final >= data.folio_inicial, {
    path: ["folio_final"],
    message: "El folio final debe ser mayor o igual al folio inicial",
  });

export type SerieFolioFormValues = z.infer<typeof SerieFolioFormSchema>;
