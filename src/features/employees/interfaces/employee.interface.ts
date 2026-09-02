import type { EstadoCivil, Sexo } from "../constants/employeeChoices";

/**
 * Convención de vacíos, heredada del modelo del backend:
 *  - `blank=True` SIN `null=True` → viaja y vuelve como cadena vacía.
 *  - nullable → viaja y vuelve como `null`.
 *
 * Los campos de texto añadidos en esta iteración se tratan como el primer
 * caso (cadena vacía), igual que `apellido_materno` y `telefono`, porque una
 * cadena vacía la acepta cualquier `CharField`/`TextField` con `blank=True`
 * sea o no nullable, mientras que un `null` revienta si el campo no lo es.
 * Las FECHAS son la excepción: un `DateField` no admite "" y su vacío es
 * `null`.
 */
export interface Employee {
  id: number;
  empresa: number;
  sucursal: number;
  departamento: number;
  puesto: number;
  numero_empleado: string;

  // ── Datos personales ──────────────────────────────────────────────────
  nombre: string;
  apellido_paterno: string;
  /** `blank=True` SIN `null=True`: viaja como cadena vacía, nunca como null. */
  apellido_materno: string;
  fecha_nacimiento: string | null;
  /**
   * Nullable: un `CharField` con `choices` sin capturar puede volver como
   * `null` y no como "". El tipo lo admite para que los consumidores tengan
   * que resolverlo — `getSexoLabel` y el sembrado del formulario ya lo hacen.
   */
  sexo: Sexo | null;
  estado_civil: EstadoCivil | null;
  nacionalidad: string;
  lugar_nacimiento: string;

  // ── Identificación fiscal y legal ─────────────────────────────────────
  curp: string | null;
  rfc: string | null;
  nss: string;
  infonavit: string;

  // ── Contacto ──────────────────────────────────────────────────────────
  email: string | null;
  /** `blank=True` SIN `null=True`: viaja como cadena vacía, nunca como null. */
  telefono: string;

  // ── Domicilio ─────────────────────────────────────────────────────────
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  /** Entidad federativa del DOMICILIO. No confundir con `activo` (estatus). */
  estado: string;

  // ── Datos bancarios ───────────────────────────────────────────────────
  banco: string;
  cuenta_bancaria: string;
  clabe: string;
  moneda_pago: string;

  // ── Contacto de emergencia y salud ────────────────────────────────────
  nombre_emergencia: string;
  parentesco_emergencia: string;
  telefono_emergencia: string;
  email_emergencia: string;
  tipo_sangre: string;
  alergias: string;
  enfermedades_cronicas: string;

  // ── Otros ─────────────────────────────────────────────────────────────
  foto_url: string;
  observaciones: string;

  // ── Relación laboral ──────────────────────────────────────────────────
  fecha_ingreso: string;
  fecha_baja: string | null;
  activo: boolean;
}

/**
 * Datos que captura el formulario.
 *
 * No incluye `empresa`: en alta la inyecta `useCreateEmployee` desde el
 * workspace activo y en edición se conserva la del registro. `activo` tampoco
 * viaja — lo administra el backend y al omitirlo conserva su valor actual.
 * `fecha_baja` solo aparece cuando se edita a un empleado ya inactivo.
 *
 * `turno` queda fuera a propósito: el módulo de turnos todavía no existe en el
 * frontend, así que no hay de dónde sacar las opciones del select.
 */
export interface EmployeeCreate {
  sucursal: number;
  departamento: number;
  puesto: number;
  numero_empleado: string;

  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string | null;
  sexo: Sexo;
  estado_civil: EstadoCivil;
  nacionalidad: string;
  lugar_nacimiento: string;

  curp: string | null;
  rfc: string | null;
  nss: string;
  infonavit: string;

  email: string | null;
  telefono: string;

  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;

  banco: string;
  cuenta_bancaria: string;
  clabe: string;
  moneda_pago: string;

  nombre_emergencia: string;
  parentesco_emergencia: string;
  telefono_emergencia: string;
  email_emergencia: string;
  tipo_sangre: string;
  alergias: string;
  enfermedades_cronicas: string;

  foto_url: string;
  observaciones: string;

  fecha_ingreso: string;
  fecha_baja?: string | null;
}

/** Cuerpo real que se envía al backend, ya con la empresa resuelta. */
export interface EmployeePayload extends EmployeeCreate {
  empresa: number;
}
