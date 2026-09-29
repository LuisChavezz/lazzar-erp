import type { EstadoAsistencia } from "../constants/attendanceChoices";

/**
 * Registro de asistencia tal como lo devuelve `/hr/asistencias/` (listado,
 * detalle y las acciones del checador comparten la forma). Los FK llegan como
 * id crudo, sin nombres anidados.
 *
 * Un registro por empleado y día: `(empleado, fecha)` es único en el backend.
 */
export interface Attendance {
  id: number;
  /** "YYYY-MM-DD". */
  fecha: string;
  /** Datetime ISO con el offset de México, o `null` si no hay entrada (falta). */
  hora_entrada: string | null;
  /** Datetime ISO con el offset de México, o `null`. Nunca sin entrada. */
  hora_salida: string | null;
  /**
   * Lo DERIVA el servidor en cada guardado (sin entrada → `falta`; entrada
   * fuera de tolerancia → `retardo`; si no, `puntual`). `justificada` es el
   * único que se fija a mano y se conserva.
   */
  estado: EstadoAsistencia;
  /** `TextField` con `null=True, blank=True`: puede volver como `null` o "". */
  observaciones: string | null;
  /** Solo lectura: minutos fuera de la tolerancia del turno. */
  readonly minutos_retardo: number;
  /** Solo lectura: tolerancia del turno copiada al guardar. */
  readonly minutos_tolerancia: number;
  /** Solo lectura. Decimal como string; `null` mientras no haya salida. */
  readonly horas_normales: string | null;
  /** Solo lectura. Decimal como string; `null` mientras no haya salida. */
  readonly horas_extra: string | null;
  empleado: number;
  turno: number;
  /**
   * Existe en la respuesta, pero el módulo lo ignora: no se muestra ni se
   * envía (decisión de producto). Solo vive en esta interfaz de LECTURA.
   */
  autorizado_por: number | null;
}

/** Filtros de SERVIDOR que usa el módulo (`filterset_fields` del backend). */
export interface AttendanceListParams {
  fecha?: string;
  fecha__gte?: string;
  fecha__lte?: string;
}

/**
 * Alta manual ("Marcar falta"): empleado, turno y fecha, sin horas. El servidor
 * deriva `estado` = `falta` porque no hay entrada.
 */
export interface AttendanceCreateBody {
  empleado: number;
  turno: number;
  fecha: string;
}

/**
 * Corrección (PATCH): solo los campos que cambiaron. NUNCA lleva `estado`: un
 * PATCH que lo omite conserva el guardado, así que un registro justificado
 * sigue justificado aunque se corrijan sus horas. Las horas viajan como ISO con
 * offset de México; `null` las borra.
 */
export interface AttendanceCorrectionBody {
  hora_entrada?: string | null;
  hora_salida?: string | null;
  observaciones?: string;
}

/**
 * Cambio de justificación (PATCH). Solo `estado`: ver
 * `ESTADO_AL_QUITAR_JUSTIFICACION` para el valor que se manda al quitarla.
 */
export interface AttendanceJustificationBody {
  estado: EstadoAsistencia;
}

/**
 * Cuerpo de `registrar_entrada/` y `registrar_salida/`. `fecha` siempre viaja
 * (la del pase de lista); `hora` ("YYYY-MM-DD HH:MM:SS", hora local de México)
 * solo en días pasados: hoy, el servidor usa su hora actual.
 */
export interface AttendanceCheckInBody {
  empleado_id: number;
  fecha: string;
  hora?: string;
}
