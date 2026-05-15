// ─────────────────────────────────────────────────────────────────────────────
// Interfaces del flujo "Nuevo Desarrollo de Producto" — Módulo de Producción
// Cedicor — proceso de 10 pasos desde recepción de solicitud hasta despacho
// Basado en el diagrama de flujo oficial del proceso de nuevo desarrollo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pasos del flujo de producción para un nuevo desarrollo de producto.
 * El orden del array define la progresión canónica del proceso.
 *
 * Áreas responsables por paso:
 *  1-2   → PRODUCCIÓN (inicia con solicitud del cliente/desarrollo)
 *  3     → PRODUCCIÓN (envío OP por correo)
 *  4     → ALMACÉN (validación de materiales y existencia)
 *  5-6   → PRODUCCIÓN / DISEÑO (preficha, muestra física, trazo, aprobación)
 *  7     → ALMACÉN (revisión y liberación de material)
 *  8     → DISEÑO / CORTE (trazo de producción + corte de tela)
 *  9-10  → ALMACÉN (recepción, consumo y despacho a confección)
 */
export const FLOW_STEPS = [
  'solicitud_recibida',    // 1 — Desarrollo recibe solicitud y captura specs en Drive
  'ordenes_generadas',     // 2 — Producción genera orden de corte (OC) y orden de producción (OP)
  'op_enviada_areas',      // 3 — Producción envía OP a todas las áreas por correo
  'validacion_materiales', // 4 — Almacén valida materiales y existencia
  'preficha_muestra',      // 5 — Preficha generada; muestra física enviada; diseño realiza trazo
  'muestra_validada',      // 6 — Muestra revisada y producto autorizado (Producción)
  'material_liberado',     // 7 — Almacén revisa tela/avíos y libera material completo
  'en_corte',              // 8 — Diseño entrega trazo; corte de tela en proceso
  'consumo_capturado',     // 9 — Corte entrega material cortado; almacén captura consumo
  'despachado_confeccion', // 10 — Almacén integra habilitación y despacha a confección
] as const;

/**
 * Unión de los valores del flujo + estados especiales:
 *  - material_faltante: estado bloqueante en el paso 7 cuando almacén detecta
 *    faltantes y genera órdenes de compra. Se resuelve al recibir el material.
 *  - cancelado: estado terminal; conserva el último paso alcanzado.
 */
export type FlowStatus = (typeof FLOW_STEPS)[number] | 'material_faltante' | 'cancelado';

/** Etiquetas legibles por humano para cada estatus del flujo */
export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  solicitud_recibida:    'Solicitud Recibida',
  ordenes_generadas:     'Órdenes Generadas',
  op_enviada_areas:      'OP Enviada a Áreas',
  validacion_materiales: 'Validando Materiales',
  preficha_muestra:      'Preficha / Muestra',
  muestra_validada:      'Muestra Validada',
  material_liberado:     'Material Liberado',
  en_corte:              'En Corte',
  consumo_capturado:     'Consumo Capturado',
  despachado_confeccion: 'Despachado a Confección',
  material_faltante:     'Material Faltante',
  cancelado:             'Cancelado',
};

/** Resultado de la verificación de materiales por parte de almacén */
export type MaterialVerificationStatus = 'sin_verificar' | 'disponible' | 'faltante' | 'parcial';

/** Registro de un evento en el historial de trazabilidad del desarrollo */
export interface FlowEventRecord {
  paso: number;
  estatus: FlowStatus;
  fecha: string;
  responsable: string;
  notas: string;
}

/** Entidad principal que representa un orden de nuevo desarrollo de producto */
export interface NewDevelopment {
  id: string;
  /** Folio único, ej: ND-2025-001 */
  folio: string;
  fecha_creacion: string;
  fecha_estimada_entrega: string | null;
  /** Razón social del cliente */
  cliente: string;
  nombre_producto: string;
  /** Descripción breve o referencia del producto */
  descripcion: string;
  /** Temporada o colección (ej: "Otoño-Invierno 2025") */
  temporada: string;
  /** Clave interna de estilo */
  clave_estilo: string;
  colores: string[];
  tallas: string[];
  cantidad_total: number;
  estatus: FlowStatus;
  /** Número de paso activo (1-10); para cancelado/material_faltante se conserva el último paso alcanzado */
  paso_actual: number;
  /** Área o persona responsable en el paso actual */
  responsable_actual: string;
  responsable_desarrollo: string;
  responsable_produccion: string;
  responsable_almacen: string;
  responsable_diseno: string;
  /** Si el flujo incluye la variante con muestra (siempre true para nuevo desarrollo) */
  tiene_muestra: boolean;
  verificacion_materiales: MaterialVerificationStatus;
  observaciones: string;
  historial: FlowEventRecord[];
}
