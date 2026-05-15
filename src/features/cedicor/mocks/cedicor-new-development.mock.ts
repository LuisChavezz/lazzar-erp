import { faker } from '@faker-js/faker';
import {
  FLOW_STEPS,
  type NewDevelopment,
  type FlowStatus,
  type FlowEventRecord,
  type MaterialVerificationStatus,
} from '../interfaces/cedicor-new-development.interface';

// Semilla fija para datos deterministas
faker.seed(3001);

// ── Catálogos ────────────────────────────────────────────────────────────────

const CLIENTES = [
  'LIVERPOOL S.A. DE C.V.',
  'PALACIO DE HIERRO S.A.B. DE C.V.',
  'SUBURBIA DE MEXICO S.A. DE C.V.',
  'COPPEL S.A. DE C.V.',
  'SORIANA MODA S.A. DE C.V.',
  'WALMART MEXICO S.A.B. DE C.V.',
  'SEARS OPERADORA MEXICO S.A. DE C.V.',
  'CIMACO S.A. DE C.V.',
  'FAMSA S.A. DE C.V.',
  'PORTO SEGURO S.A. DE C.V.',
];

const NOMBRES_PRODUCTO = [
  'Playera Cuello Redondo',
  'Polo Manga Corta',
  'Camiseta Técnica Deportiva',
  'Blusa Estampada',
  'Chamarra Ligera',
  'Pantalón Cargo',
  'Shorts Deportivos',
  'Vestido Casual',
  'Sudadera con Capucha',
  'Top Básico',
  'Camisola Sin Manga',
  'Pants Jogger',
  'Saco Sport',
  'Camisa Manga Larga',
  'Blusón Oversize',
];

const TEMPORADAS = [
  'Primavera-Verano 2025',
  'Otoño-Invierno 2025',
  'Resort 2025',
  'Primavera-Verano 2026',
  'Otoño-Invierno 2026',
];

const COLORES_DISPONIBLES = [
  'Blanco', 'Negro', 'Gris Melange', 'Azul Marino', 'Rojo', 'Verde Olivo',
  'Beige', 'Coral', 'Mostaza', 'Turquesa', 'Lila', 'Café', 'Rosa Palo',
];

const TALLAS_DISPONIBLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const RESPONSABLES_DESARROLLO = ['Ana González', 'Carlos Medina', 'Fernanda Ríos', 'Héctor Vega'];
const RESPONSABLES_PRODUCCION = ['Mario Ortega', 'Patricia Luna', 'Roberto Sosa'];
const RESPONSABLES_ALMACEN   = ['Luis Herrera', 'Sandra Pérez', 'Tomás Vargas'];
const RESPONSABLES_DISENO    = ['Daniela Flores', 'Emilio Castro', 'Valeria Reyes'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determina el índice de paso a partir del estatus.
 *  - material_faltante se posiciona en el paso 7 (bloqueado antes de material_liberado)
 *  - cancelado devuelve un paso aleatorio entre 1 y 6
 */
function getPasoActual(estatus: FlowStatus): number {
  if (estatus === 'material_faltante') return 7;
  if (estatus === 'cancelado') return faker.number.int({ min: 1, max: 6 });
  return FLOW_STEPS.indexOf(estatus) + 1;
}

/**
 * Mapa de área responsable por número de paso (1-10).
 * Producción inicia y conduce los pasos 1-3, 5 y 6.
 * Almacén toma pasos 4, 7, 9 y 10.
 * Diseño/Corte toma el paso 8.
 */
const RESPONSABLE_POR_PASO_KEY = [
  'responsable_desarrollo', // paso 1 — solicitud_recibida
  'responsable_produccion', // paso 2 — ordenes_generadas
  'responsable_produccion', // paso 3 — op_enviada_areas
  'responsable_almacen',    // paso 4 — validacion_materiales
  'responsable_produccion', // paso 5 — preficha_muestra
  'responsable_produccion', // paso 6 — muestra_validada
  'responsable_almacen',    // paso 7 — material_liberado / material_faltante
  'responsable_diseno',     // paso 8 — en_corte
  'responsable_almacen',    // paso 9 — consumo_capturado
  'responsable_almacen',    // paso 10 — despachado_confeccion
] as const;

/**
 * Genera el historial de eventos desde el paso 1 hasta el paso actual.
 * Para material_faltante registra el evento bloqueante al llegar al paso 7.
 */
function generarHistorial(
  pasoActual: number,
  estatus: FlowStatus,
  responsables: Pick<
    NewDevelopment,
    'responsable_desarrollo' | 'responsable_produccion' | 'responsable_almacen' | 'responsable_diseno'
  >,
  fechaBase: Date
): FlowEventRecord[] {
  const historial: FlowEventRecord[] = [];
  let fechaEvento = new Date(fechaBase);

  for (let paso = 1; paso <= pasoActual; paso++) {
    // Cada paso avanza entre 1 y 3 días hábiles
    fechaEvento = new Date(fechaEvento.getTime() + faker.number.int({ min: 1, max: 3 }) * 86_400_000);

    // Determina el estatus del evento en este paso
    let estatusPaso: FlowStatus;
    if (paso === pasoActual && estatus === 'cancelado') {
      estatusPaso = 'cancelado';
    } else if (paso === pasoActual && estatus === 'material_faltante') {
      estatusPaso = 'material_faltante';
    } else {
      estatusPaso = FLOW_STEPS[paso - 1];
    }

    const responsableKey = RESPONSABLE_POR_PASO_KEY[paso - 1];
    historial.push({
      paso,
      estatus: estatusPaso,
      fecha: fechaEvento.toISOString(),
      responsable: responsables[responsableKey],
      notas: faker.helpers.arrayElement([
        'Completado sin observaciones.',
        'Se realizó corrección menor antes de avanzar.',
        'Proceso completado en tiempo.',
        faker.lorem.sentence(6),
      ]),
    });
  }

  return historial;
}

/**
 * Determina el responsable actual según el número de paso del flujo.
 */
function getResponsableActual(
  paso: number,
  responsables: Pick<
    NewDevelopment,
    'responsable_desarrollo' | 'responsable_produccion' | 'responsable_almacen' | 'responsable_diseno'
  >
): string {
  const key = RESPONSABLE_POR_PASO_KEY[paso - 1];
  return key ? responsables[key] : 'N/A';
}

/**
 * Determina el estatus de verificación de materiales según el paso y estatus.
 * La verificación se realiza por almacén en los pasos 4 y 7.
 */
function getVerificacionMateriales(
  paso: number,
  estatus: FlowStatus
): MaterialVerificationStatus {
  if (estatus === 'cancelado')         return faker.helpers.arrayElement(['faltante', 'parcial', 'sin_verificar']);
  if (estatus === 'material_faltante') return 'faltante';
  if (paso <= 3)                        return 'sin_verificar';
  if (paso === 4)                       return faker.helpers.arrayElement(['sin_verificar', 'parcial']);
  if (paso <= 6)                        return faker.helpers.arrayElement(['sin_verificar', 'parcial']);
  return 'disponible';
}

// ── Pool de estatus para distribución realista ────────────────────────────────

/**
 * Distribuye los 40 registros de manera que todos los estatus queden
 * representados: ~3 registros por cada uno de los 10 pasos, ~3 con
 * material_faltante y ~4 cancelados.
 */
const ESTATUS_POOL: FlowStatus[] = [
  ...FLOW_STEPS,          // 10 items — una vez cada paso
  ...FLOW_STEPS,          // 10 items — segunda ronda
  ...FLOW_STEPS,          // 10 items — tercera ronda
  'material_faltante',     // casos de material bloqueado
  'material_faltante',
  'material_faltante',
  'cancelado',             // órdenes canceladas
  'cancelado',
  'cancelado',
  'cancelado',
  // Total: 37 — los índices 37-39 repiten los primeros 3 del pool
];

// ── Generador principal ───────────────────────────────────────────────────────

function generarNewDevelopment(index: number): NewDevelopment {
  const estatus = ESTATUS_POOL[index % ESTATUS_POOL.length];
  const paso    = getPasoActual(estatus);

  const responsables = {
    responsable_desarrollo: faker.helpers.arrayElement(RESPONSABLES_DESARROLLO),
    responsable_produccion: faker.helpers.arrayElement(RESPONSABLES_PRODUCCION),
    responsable_almacen:    faker.helpers.arrayElement(RESPONSABLES_ALMACEN),
    responsable_diseno:     faker.helpers.arrayElement(RESPONSABLES_DISENO),
  };

  const fechaCreacion = faker.date.between({
    from: new Date('2025-01-01'),
    to:   new Date('2025-10-31'),
  });

  const diasEstimados = faker.number.int({ min: 20, max: 60 });
  const fechaEntrega  = new Date(fechaCreacion.getTime() + diasEstimados * 86_400_000);

  const coloresSel = faker.helpers.arrayElements(
    COLORES_DISPONIBLES,
    faker.number.int({ min: 1, max: 4 })
  );
  const tallasSel = faker.helpers.arrayElements(
    TALLAS_DISPONIBLES,
    faker.number.int({ min: 2, max: 6 })
  );

  const folio = `ND-${fechaCreacion.getFullYear()}-${String(index + 1).padStart(3, '0')}`;

  return {
    id: faker.string.uuid(),
    folio,
    fecha_creacion: fechaCreacion.toISOString(),
    fecha_estimada_entrega: fechaEntrega.toISOString(),
    cliente: faker.helpers.arrayElement(CLIENTES),
    nombre_producto: faker.helpers.arrayElement(NOMBRES_PRODUCTO),
    descripcion: faker.commerce.productDescription(),
    temporada: faker.helpers.arrayElement(TEMPORADAS),
    clave_estilo: `EST-${faker.string.alphanumeric({ length: 5, casing: 'upper' })}`,
    colores: coloresSel,
    tallas: tallasSel,
    cantidad_total: faker.number.int({ min: 100, max: 5000 }),
    estatus,
    paso_actual: paso,
    responsable_actual: getResponsableActual(paso, responsables),
    ...responsables,
    tiene_muestra: true,
    verificacion_materiales: getVerificacionMateriales(paso, estatus),
    observaciones: faker.helpers.maybe(() => faker.lorem.sentence(8), { probability: 0.4 }) ?? '',
    historial: generarHistorial(paso, estatus, responsables, fechaCreacion),
  };
}

// ── Exportación ───────────────────────────────────────────────────────────────

/** Colección de 40 órdenes de nuevo desarrollo de producto con datos deterministas */
export const MOCK_CEDICOR_NEW_DEVELOPMENT: NewDevelopment[] = Array.from(
  { length: 40 },
  (_, i) => generarNewDevelopment(i)
);


