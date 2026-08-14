import { z } from "zod";

// Misma forma que el correo opcional de clientes: válido o vacío.
const optionalEmailSchema = z.union([z.string().email("Correo inválido"), z.literal("")]);

/**
 * Los FKs usan 0 como centinela de "Seleccionar..." y el schema lo rechaza.
 *
 * CURP y RFC solo se limitan por longitud, sin regex de formato: el backend
 * tampoco valida el formato, así que exigirlo aquí bloquearía altas que la API
 * sí acepta.
 */
export const EmployeeFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  apellido_paterno: z
    .string()
    .min(1, "El apellido paterno es requerido")
    .max(150, "El apellido paterno no puede exceder 150 caracteres"),
  apellido_materno: z.string().max(150, "El apellido materno no puede exceder 150 caracteres"),
  fecha_nacimiento: z.string(),
  curp: z.string().max(18, "La CURP no puede exceder 18 caracteres"),
  rfc: z.string().max(13, "El RFC no puede exceder 13 caracteres"),
  email: optionalEmailSchema,
  telefono: z.string().max(20, "El teléfono no puede exceder 20 caracteres"),
  numero_empleado: z
    .string()
    .min(1, "El número de empleado es requerido")
    .max(20, "El número de empleado no puede exceder 20 caracteres"),
  sucursal: z.number().int("La sucursal es inválida").positive("La sucursal es requerida"),
  departamento: z
    .number()
    .int("El departamento es inválido")
    .positive("El departamento es requerido"),
  puesto: z.number().int("El puesto es inválido").positive("El puesto es requerido"),
  fecha_ingreso: z.string().min(1, "La fecha de ingreso es requerida"),
  fecha_baja: z.string(),
});

export type EmployeeFormValues = z.infer<typeof EmployeeFormSchema>;
