import { z } from "zod";

export const CustomerFormSchema = z.object({
  razonSocial: z.string().min(1, "Requerido"),
  contacto: z.string().min(1, "Requerido"),
  telefono: z.string().min(1, "Requerido"),
  correo: z.string().email("Correo inválido"),
  rfc: z.string().min(1, "Requerido"),
  regimenFiscal: z.enum(["601", "603", "605"], { message: "Requerido" }),
  direccionFiscal: z.string().min(1, "Requerido"),
  coloniaFiscal: z.string().min(1, "Requerido"),
  codigoPostalFiscal: z.string().min(1, "Requerido"),
  ciudadFiscal: z.string().min(1, "Requerido"),
  estadoFiscal: z.string().min(1, "Requerido"),
  giroEmpresa: z.string().min(1, "Requerido"),
  destinatario: z.string().min(1, "Requerido"),
  empresaEnvio: z.string().min(1, "Requerido"),
  telefonoEnvio: z.string().min(1, "Requerido"),
  celularEnvio: z.string().min(1, "Requerido"),
  direccionEnvio: z.string().min(1, "Requerido"),
  coloniaEnvio: z.string().min(1, "Requerido"),
  codigoPostalEnvio: z.string().min(1, "Requerido"),
  ciudadEnvio: z.string().min(1, "Requerido"),
  estadoEnvio: z.string().min(1, "Requerido"),
  referenciasEnvio: z.string().optional(),
});

export type CustomerFormValues = z.output<typeof CustomerFormSchema>;
