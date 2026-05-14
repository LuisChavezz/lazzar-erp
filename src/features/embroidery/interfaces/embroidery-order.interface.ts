// Tipo de surtido de prendas al área de bordado (reemplaza TipoRecibo)
export type TipoSurtido = 'completa' | 'parcial';

// Técnica de impresión/decoración textil asignada a la orden
export type TecnicaImpresion = 'dtf' | 'serigrafia' | 'vinil' | 'sublimado';

// Estatus del proceso de validación del arte (solo aplica antes de iniciar producción)
export type EstatusValidacionArte = 'pendiente' | 'aprobado' | 'en_correccion';

// Registro de validación del arte de bordado
export interface ValidacionArte {
  estatus: EstatusValidacionArte;
  /** Nombre del responsable que validó o rechazó el arte */
  validado_por: string | null;
  /** Fecha ISO de la última validación o rechazo */
  fecha_validacion: string | null;
  /** Observaciones o instrucciones de corrección */
  observaciones: string;
}

// Tipo de actividad registrada en la gestión diaria de ponchados
export type TipoPonchado =
  | 'bordado'
  | 'arreglo'
  | 'ponchado'
  | 'serigrafia'
  | 'envio_muestra';

// Estatus de un registro de ponchado
export type EstatusPonchado = 'pendiente' | 'en_proceso' | 'listo' | 'observacion';

// Registro individual en el log de actividades de ponchado del día
export interface Ponchado {
  id: number;
  tipo: TipoPonchado;
  /** Clave interna del diseño digitalizado, ej: PNCH-4231 */
  clave_diseno: string;
  nombre_diseno: string;
  /** Cantidad de puntos del diseño bordado */
  puntos: number;
  estatus: EstatusPonchado;
  fecha_solicitud: string;
  fecha_entrega: string | null;
  /** Responsable de la digitalización */
  digitalizador: string | null;
  observaciones: string;
}

// Posición asignada en el rack físico — se registra ANTES de iniciar el bordado
export interface RackSlot {
  nivel: NivelRack;
  /** Número de posición en el nivel, de izquierda a derecha (1-based) */
  posicion: number;
  /** Fecha ISO en que se realizó el acomodo en rack */
  asignado_en: string;
}

// Estatus de la hoja de bordado — fundamental para el seguimiento del proceso
export type EstatusHojaBordado =
  | 'sin_liberar'
  | 'liberada'
  | 'en_proceso'
  | 'terminada';

// Clasificación del pedido (Paso 2: Registro de Pedido de Forma Física)
export type ClasificacionPedido =
  | 'clasificacion_b'
  | 'ponchado_arreglo'
  | 'externo'
  | 'serigrafia';

// Nivel del rack donde se almacena la orden según capacidad de máquina
export type NivelRack = 'superior' | 'medio' | 'inferior';

// Bordadoras disponibles en planta
export type NumeroBordadora =
  | 'Máquina 1'
  | 'Máquina 2'
  | 'Máquina 3'
  | 'Máquina 4'
  | 'Máquina 5'
  | 'Máquina 6';

// Evento del historial de estatus de la orden (para el timeline)
export interface EmbroideryStatusEvent {
  estatus: EstatusHojaBordado;
  fecha: string;
  hora: string;
  usuario: string;
  nota?: string;
  completado: boolean;
  esCurrent: boolean;
}

// Artículo dentro de una orden de bordado (predeterminado desde el pedido)
export interface EmbroideryOrderItem {
  clave_articulo: string;
  descripcion: string;
  color: string;
  talla: string;
  cantidad: number;
  bordados_por_prenda: number;
  /** Distribución de bordados: separación por zonas (pecho, manga, espalda) */
  distribucion_bordado: string;
}

// Orden de bordado (OTB — Orden de Trabajo Bordado)
export interface EmbroideryOrder {
  id: number;
  /** Número de orden de bordado, formato OB-XXXXX */
  numero_orden: string;
  /** Número de pedido relacionado, formato P-XXXXX */
  pedido: string;
  cliente: string;
  /** Fecha en que se recibieron las prendas */
  fecha_recibo: string;
  /** Fecha compromiso de entrega del pedido completo */
  fecha_entrega_pedido: string | null;
  /** Fecha de entrega para una parcialidad específica */
  fecha_entrega_parcialidad: string | null;
  /** Clave de la Orden de Trabajo Bordado interna */
  orden_trabajo_bordado: string | null;
  fecha_otb: string | null;
  tipo_surtido: TipoSurtido;
  total_prendas_recibidas: number;
  bordados_requeridos_por_prenda: number;
  fecha_liberacion_cuadre: string | null;
  estatus_hoja: EstatusHojaBordado;
  numero_bordadora: NumeroBordadora | null;
  /** Tipo de masuilero / entretela usada */
  masuilero: string;
  /** Número de lote */
  lote: string;
  /** Clasificación del pedido físico (Paso 2) */
  clasificacion_pedido: ClasificacionPedido;
  /** Posición asignada en el rack físico antes de iniciar el bordado */
  rack_slot: RackSlot | null;
  /** Técnica de impresión/decoración asignada a esta orden (null si aún no se define) */
  tecnica_impresion: TecnicaImpresion | null;
  /** Estado del proceso de validación del arte (solo relevante antes de en_proceso) */
  validacion_arte: ValidacionArte;
  /** Actividades de ponchado y digitalización asociadas a la orden */
  ponchados: Ponchado[];
  /** Fecha estimada de conclusión del bordado (Paso 3) */
  fin_bordado_estimado: string | null;
  /** Fecha de entrega al área de deshebrado (Paso 3) */
  fecha_entrega_deshebrado: string | null;
  /** Artículos predeterminados desde el pedido que llevan bordado */
  articulos: EmbroideryOrderItem[];
  /** Historial de cambios de estatus para el timeline */
  historial_estatus: EmbroideryStatusEvent[];
  observaciones: string;
  created_at: string;
}
