import { z } from "zod";
import { ESTADO_CIVIL_VALUES, SEXO_VALUES } from "../constants/employeeChoices";

// Misma forma que el correo opcional de clientes: válido o vacío.
const optionalEmailSchema = z.union([z.string().email("Correo inválido"), z.literal("")]);

/**
 * Campo opcional con formato fijo: la cadena vacía SIEMPRE pasa y el formato
 * solo se exige cuando hay valor.
 *
 * Se usa `.refine` y no `z.union([...])` a propósito: en Zod 4 una unión que
 * falla reporta un issue `invalid_union` cuyo mensaje es el genérico "Invalid
 * input", y `validateField` lee `issues[0].message` — el texto en español se
 * perdería. Es además el idioma que ya usa `salario_base` en el schema de
 * puestos.
 */
const optionalWithFormat = (isValid: (value: string) => boolean, message: string) =>
  z.string().refine((value) => value === "" || isValid(value), message);

/**
 * Los FKs usan 0 como centinela de "Seleccionar..." y el schema lo rechaza.
 *
 * CURP, RFC, NSS, CLABE y código postal son opcionales pero estrictos cuando
 * traen valor. Mantener válida la cadena vacía no es un detalle: los empleados
 * dados de alta antes de esta validación pueden tener esos campos vacíos y de
 * otro modo no se podrían editar.
 */
export const EmployeeFormSchema = z.object({
  // ── Datos personales ──────────────────────────────────────────────────
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
  sexo: z.enum(SEXO_VALUES),
  estado_civil: z.enum(ESTADO_CIVIL_VALUES),
  nacionalidad: z.string().max(50, "La nacionalidad no puede exceder 50 caracteres"),
  lugar_nacimiento: z
    .string()
    .max(150, "El lugar de nacimiento no puede exceder 150 caracteres"),

  // ── Identificación fiscal y legal ─────────────────────────────────────
  curp: optionalWithFormat((value) => value.length === 18, "La CURP debe tener 18 caracteres"),
  rfc: optionalWithFormat(
    (value) => value.length >= 12 && value.length <= 13,
    "El RFC debe tener 12 o 13 caracteres"
  ),
  // El regex cubre longitud y "solo dígitos" a la vez: un `.length()` extra
  // sería redundante y partiría el mensaje en dos.
  nss: optionalWithFormat((value) => /^\d{11}$/.test(value), "El NSS debe tener 11 dígitos"),
  infonavit: z.string().max(20, "El INFONAVIT no puede exceder 20 caracteres"),

  // ── Contacto ──────────────────────────────────────────────────────────
  email: optionalEmailSchema,
  telefono: z.string().max(20, "El teléfono no puede exceder 20 caracteres"),

  // ── Domicilio ─────────────────────────────────────────────────────────
  calle: z.string().max(200, "La calle no puede exceder 200 caracteres"),
  numero_exterior: z.string().max(20, "El número exterior no puede exceder 20 caracteres"),
  numero_interior: z.string().max(20, "El número interior no puede exceder 20 caracteres"),
  colonia: z.string().max(100, "La colonia no puede exceder 100 caracteres"),
  codigo_postal: optionalWithFormat(
    (value) => /^\d{5}$/.test(value),
    "El código postal debe tener 5 dígitos"
  ),
  ciudad: z.string().max(100, "La ciudad no puede exceder 100 caracteres"),
  estado: z.string().max(100, "El estado no puede exceder 100 caracteres"),

  // ── Datos bancarios ───────────────────────────────────────────────────
  banco: z.string().max(100, "El banco no puede exceder 100 caracteres"),
  cuenta_bancaria: z.string().max(20, "La cuenta no puede exceder 20 caracteres"),
  clabe: optionalWithFormat((value) => /^\d{18}$/.test(value), "La CLABE debe tener 18 dígitos"),
  moneda_pago: z.string().max(3, "La moneda no puede exceder 3 caracteres"),

  // ── Contacto de emergencia y salud ────────────────────────────────────
  nombre_emergencia: z.string().max(150, "El nombre no puede exceder 150 caracteres"),
  parentesco_emergencia: z.string().max(50, "El parentesco no puede exceder 50 caracteres"),
  telefono_emergencia: z.string().max(20, "El teléfono no puede exceder 20 caracteres"),
  email_emergencia: optionalEmailSchema,
  tipo_sangre: z.string().max(5, "El tipo de sangre no puede exceder 5 caracteres"),
  alergias: z.string(),
  enfermedades_cronicas: z.string(),

  // ── Otros ─────────────────────────────────────────────────────────────
  foto_url: z.string().max(255, "La URL no puede exceder 255 caracteres"),
  observaciones: z.string(),

  // ── Relación laboral ──────────────────────────────────────────────────
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
