import type { EstadoCapacitacion } from "../constants/trainingChoices";

/**
 * Capacitación de un empleado.
 *
 * Como `Contrato`, no tiene `empresa` ni `sucursal` propias: el backend resuelve
 * el tenant a partir de `empleado`. Tampoco tiene `activo`: el DELETE borra la
 * fila físicamente y la "cancelación" de negocio es `estado: "cancelado"`.
 */
export interface Training {
  id: number;
  /** FK REQUERIDO a `hr.Empleado`, serializado como ID crudo (sin nombre). */
  empleado: number;
  nombre: string;
  /** Opcional pero NO nullable: vacío llega y viaja como `""`. */
  institucion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  /** Entero positivo. */
  horas: number | null;
  estado: EstadoCapacitacion;
  /** Decimal(5,2) como string (`"95.50"`), escala 0–100. */
  calificacion: string | null;
  /** Texto libre (un enlace): no hay subida de archivo en el backend. */
  constancia_url: string | null;
}

/**
 * Cuerpo real que se envía al backend en el alta y en la edición (PATCH).
 *
 * `estado` es OBLIGATORIO aquí aunque el backend tenga default: se envía
 * siempre. `calificacion` y `constancia_url` son `null` fuera de "Finalizado".
 */
export interface TrainingCreate {
  empleado: number;
  nombre: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  horas: number | null;
  estado: EstadoCapacitacion;
  calificacion: string | null;
  constancia_url: string | null;
}

/** Variables de la mutación de edición: el cuerpo más el `id` de la ruta. */
export interface TrainingPayload extends TrainingCreate {
  id: number;
}
