import type { EstadoAusencia, TipoAusencia } from "../constants/absenceChoices";

/**
 * Permiso, incapacidad o falta injustificada de un empleado.
 *
 * Listado, detalle y respuestas de acción comparten la MISMA forma
 * (`fields = '__all__'`), arreglo plano sin paginación ordenado por
 * `-fecha_solicitud`. Los FK llegan como ID crudo: `empleado` se resuelve
 * contra el catálogo de empleados y los usuarios contra `/usuarios/`.
 *
 * Sin `empresa` ni `activo`: el tenant sale de `empleado` y el DELETE borra
 * físicamente en cualquier estado.
 */
export interface Absence {
  id: number;
  /** FK REQUERIDO a `hr.Empleado`. */
  empleado: number;
  tipo: TipoAusencia;
  /** DateField `"YYYY-MM-DD"`. */
  fecha_inicio: string;
  /** DateField `"YYYY-MM-DD"`, nunca anterior a `fecha_inicio`. */
  fecha_fin: string;
  con_goce_sueldo: boolean;
  /** `blank=True` SIN `null=True`: vacío es `""`, nunca `null`. */
  motivo: string;
  estado: EstadoAusencia;

  // ── Trazabilidad: SOLO LECTURA, las fija el servidor ─────────────────────
  solicitado_por: number | null;
  fecha_solicitud: string;
  autorizado_por: number | null;
  fecha_aprobacion: string | null;
  rechazado_por: number | null;
  fecha_rechazo: string | null;
  /** Solo lo escribe `rechazar/`. Puede llegar como `""` en vez de `null`. */
  motivo_rechazo: string | null;
}

/**
 * Cuerpo real del alta y de la edición (PATCH). Campo por campo: NUNCA lleva
 * `estado`, `motivo_rechazo` ni la trazabilidad. En la edición las dos fechas
 * viajan juntas: el backend solo compara las que recibe.
 */
export interface AbsenceWrite {
  empleado: number;
  tipo: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  con_goce_sueldo: boolean;
  /** `""` cuando no se captura: el campo no admite `null`. */
  motivo: string;
}

export interface AbsenceUpdateVariables extends AbsenceWrite {
  id: number;
}

/** Cuerpo de `POST /hr/permisos-ausencias/{id}/rechazar/`. */
export interface AbsenceRejectBody {
  motivo_rechazo: string;
}

export interface AbsenceRejectVariables extends AbsenceRejectBody {
  id: number;
}
