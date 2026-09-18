import type { EstadoContrato, TipoContrato } from "../constants/contractChoices";

/**
 * Contrato laboral de un empleado.
 *
 * `Contrato` no tiene `empresa` ni `sucursal` propias: el backend resuelve el
 * tenant a partir de `empleado`, igual que calendarios lo resuelve a partir de
 * `turno`.
 */
export interface Contract {
  id: number;
  /** Baja lógica del registro. NO es el `estado` de negocio del contrato. */
  activo: boolean;
  /** FK REQUERIDO a `hr.Empleado`, serializado como ID crudo. */
  empleado: number;
  tipo: TipoContrato;
  fecha_inicio: string;
  fecha_fin: string | null;
  /** Decimal(10,2) como string (`"12345.00"`), igual que `salario_base` en puestos. */
  salario: string;
  estado: EstadoContrato;
  /** Texto libre: no hay subida de archivo ni validación de URL en el backend. */
  archivo_url: string | null;
  /** Lo asigna el backend desde `request.user`; solo lectura. */
  creado_por: number | null;
  observaciones: string | null;
  prestaciones: string | null;
}

/**
 * Cuerpo real que se envía al backend.
 *
 * No existe un tipo `ContractPayload` aparte porque `empresa` nunca viaja. Sin
 * `id`, `activo` (lo administra el DELETE) ni `creado_por` (server-owned).
 *
 * `estado` es OBLIGATORIO aquí aunque el backend tenga default: enviarlo
 * siempre cierra un hueco de validación del backend.
 */
export interface ContractCreate {
  empleado: number;
  tipo: TipoContrato;
  fecha_inicio: string;
  fecha_fin: string | null;
  salario: string;
  estado: EstadoContrato;
  archivo_url: string | null;
  observaciones: string | null;
  prestaciones: string | null;
}
