import type {
  EstadoIncidencia,
  GravedadIncidencia,
  TipoIncidencia,
} from "../constants/incidentChoices";

/**
 * Incidencia de un empleado.
 *
 * Como `Capacitacion` y `Contrato`, no tiene `empresa` propia: el backend
 * resuelve el tenant a partir de `empleado`. Los FK llegan como ID crudo, sin
 * nombres: `empleado` y `reportado_por` se resuelven en cliente.
 */
export interface Incident {
  id: number;
  /**
   * Baja lógica del registro. El DELETE del backend la pone en `false`; la
   * pantalla no usa DELETE sino PATCH `{activo}` en las dos direcciones.
   */
  activo: boolean;
  /** FK REQUERIDO a `hr.Empleado`, serializado como ID crudo. */
  empleado: number;
  tipo: TipoIncidencia;
  gravedad: GravedadIncidencia;
  estado: EstadoIncidencia;
  /** DateField `"YYYY-MM-DD"`. */
  fecha: string;
  /** Opcional pero NO nullable: vacío llega y viaja como `""`. */
  descripcion: string;
  /** Opcional y nullable; obligatoria en cliente cuando `estado` es "cerrado". */
  acciones_tomadas: string | null;
  /**
   * FK a `usuarios.Usuario`, SOLO LECTURA: lo fija el backend con quien crea el
   * registro. `null` en incidencias creadas por un admin sin usuario.
   */
  reportado_por: number | null;
  /** DateTime con offset, SOLO LECTURA: lo fija el backend al crear. */
  fecha_reporte: string;
}

/**
 * Cuerpo real que se envía al backend en el alta y en la edición (PATCH).
 *
 * Sin `id`, `activo` (lo administra `setIncidentActivo`), `reportado_por` ni
 * `fecha_reporte` (server-owned). `tipo`, `gravedad` y `estado` son
 * OBLIGATORIOS aquí aunque el backend tenga default: se envían siempre.
 */
export interface IncidentCreate {
  empleado: number;
  tipo: TipoIncidencia;
  gravedad: GravedadIncidencia;
  estado: EstadoIncidencia;
  fecha: string;
  descripcion: string;
  acciones_tomadas: string | null;
}

/** Variables de la mutación de edición: el cuerpo más el `id` de la ruta. */
export interface IncidentPayload extends IncidentCreate {
  id: number;
}

/** Variables del toggle de baja/reactivación. */
export interface ToggleIncidentActivoPayload {
  id: number;
  activo: boolean;
}
