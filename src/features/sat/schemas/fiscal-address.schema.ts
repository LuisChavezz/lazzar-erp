import { z } from "zod";

/**
 * Mismas reglas que el backend (`nucleo/api/domicilio_fiscal.py`, EC-860):
 * todos los campos son opcionales y aceptan vacío; solo se limitan las
 * longitudes y, si viene, el código postal debe ser de 5 dígitos.
 */
const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} no puede tener más de ${max} caracteres`);

export const FiscalAddressSchema = z.object({
  calle: optionalText(255, "La calle"),
  numero_exterior: optionalText(30, "El número exterior"),
  numero_interior: optionalText(30, "El número interior"),
  colonia: optionalText(120, "La colonia"),
  localidad: optionalText(120, "La localidad"),
  municipio: optionalText(120, "El municipio"),
  estado: optionalText(120, "El estado"),
  pais: optionalText(3, "El país"),
  codigo_postal: z
    .string()
    .refine((value) => value === "" || /^\d{5}$/.test(value), "El código postal debe tener 5 dígitos"),
});

export type FiscalAddressFormValues = z.infer<typeof FiscalAddressSchema>;
