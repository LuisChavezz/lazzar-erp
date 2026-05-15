import { faker } from '@faker-js/faker';
import {
  PRODUCTION_ORDER_STEPS,
  type ProductionOrder,
  type ProductionOrderStatus,
  type ProductionOrderEventRecord,
  type MaterialVerificationStatus,
} from '../interfaces/cedicor-production-order.interface';

// Semilla fija para datos deterministas
faker.seed(3002);

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
  'Pants Jogger',
  'Saco Sport',
  'Camisa Manga Larga',
  'Blusón Oversize',
  'Chaleco Corporativo',
];

const CLAVES_PRODUCTO = [
  'CAM-001', 'CAM-002', 'CAM-003',
  'POLO-001', 'POLO-002',
  'PANT-001', 'PANT-002',
  'CHAP-001', 'CHAP-002',
  'VEST-001', 'VEST-002',
  'SHORT-001', 'BERM-001',
  'SUDAD-001', 'CHALECO-001',
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

const RESPONSABLES_PRODUCCION   = ['Mario Ortega', 'Patricia Luna', 'Roberto Sosa'];
const RESPONSABLES_ING_PRODUCTO = ['Ana González', 'Carlos Medina', 'Fernanda Ríos'];
const RESPONSABLES_ALMACEN      = ['Luis Herrera', 'Sandra Pérez', 'Tomás Vargas'];
const RESPONSABLES_TRAZO        = ['Daniela Flores', 'Emilio Castro'];
const RESPONSABLES_CORTE        = ['Héctor Vega', 'Valeria Reyes', 'Jorge Ramos'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Devuelve el número de paso actual a partir del estatus.
 * - material_faltante se posiciona en el paso 4 (bloqueado en verificación)
 * - cancelado recibe un paso aleatorio entre 2 y 6
 */
function getPasoActual(estatus: ProductionOrderStatus): number {
  if (estatus === 'material_faltante') return 4;
  if (estatus === 'cancelado')         return faker.number.int({ min: 2, max: 6 });
  return PRODUCTION_ORDER_STEPS.indexOf(estatus as typeof PRODUCTION_ORDER_STEPS[number]) + 1;
}

/**
 * Mapa del responsable principal por número de paso (1-9).
 * Pasos 1-2: producción. Paso 3: ingeniería. Pasos 4-5 y 8-9: almacén.
 * Paso 6: trazo. Paso 7: corte.
 */
const RESPONSABLE_POR_PASO_KEY: Array<keyof Pick<
  ProductionOrder,
  'responsable_produccion' | 'responsable_ing_producto' | 'responsable_almacen' | 'responsable_trazo' | 'responsable_corte'
>> = [
  'responsable_produccion',    // paso 1 — orden_generada
  'responsable_produccion',    // paso 2 — op_enviada_correo
  'responsable_ing_producto',  // paso 3 — ficha_tecnica_generada
  'responsable_almacen',       // paso 4 — verificacion_materiales
  'responsable_almacen',       // paso 5 — entregado_a_trazo
  'responsable_trazo',         // paso 6 — trazo_a_corte
  'responsable_corte',         // paso 7 — corte_completado
  'responsable_almacen',       // paso 8 — consumo_capturado
  'responsable_almacen',       // paso 9 — despachado_confeccion
];

/**
 * Genera el historial de eventos desde el paso 1 hasta el paso actual.
 * El último evento registra el estatus real (incluyendo material_faltante o cancelado).
 */
function generarHistorial(
  pasoActual: number,
  estatus: ProductionOrderStatus,
  responsables: Pick<
    ProductionOrder,
    'responsable_produccion' | 'responsable_ing_producto' | 'responsable_almacen' | 'responsable_trazo' | 'responsable_corte'
  >,
  fechaBase: Date
): ProductionOrderEventRecord[] {
  const historial: ProductionOrderEventRecord[] = [];
  let fechaEvento = new Date(fechaBase);

  for (let paso = 1; paso <= pasoActual; paso++) {
    // Cada paso avanza entre 1 y 3 días hábiles
    fechaEvento = new Date(fechaEvento.getTime() + faker.number.int({ min: 1, max: 3 }) * 86_400_000);

    let estatusPaso: ProductionOrderStatus;
    if (paso === pasoActual && estatus === 'cancelado') {
      estatusPaso = 'cancelado';
    } else if (paso === pasoActual && estatus === 'material_faltante') {
      estatusPaso = 'material_faltante';
    } else {
      estatusPaso = PRODUCTION_ORDER_STEPS[paso - 1];
    }

    const responsableKey = RESPONSABLE_POR_PASO_KEY[paso - 1];
    historial.push({
      paso,
      estatus: estatusPaso,
      fecha: fechaEvento.toISOString(),
      responsable: responsables[responsableKey],
      notas: faker.helpers.arrayElement([
        'Completado sin observaciones.',
        'Se realizó ajuste menor antes de avanzar.',
        'Proceso completado en tiempo estimado.',
        'Se coordinó con el área responsable para continuar.',
        faker.lorem.sentence(6),
      ]),
    });
  }

  return historial;
}

// ── Pool de estatus — 40 registros en total ───────────────────────────────────
// Distribución: 3+3+3+4+4+4+4+4+5+3+3 = 40

const POOL_ESTATUS: Array<{ estatus: ProductionOrderStatus; paso: number }> = [
  ...Array(3).fill(null).map(() => ({ estatus: 'orden_generada'          as ProductionOrderStatus, paso: 1 })),
  ...Array(3).fill(null).map(() => ({ estatus: 'op_enviada_correo'       as ProductionOrderStatus, paso: 2 })),
  ...Array(3).fill(null).map(() => ({ estatus: 'ficha_tecnica_generada'  as ProductionOrderStatus, paso: 3 })),
  ...Array(4).fill(null).map(() => ({ estatus: 'verificacion_materiales' as ProductionOrderStatus, paso: 4 })),
  ...Array(4).fill(null).map(() => ({ estatus: 'entregado_a_trazo'       as ProductionOrderStatus, paso: 5 })),
  ...Array(4).fill(null).map(() => ({ estatus: 'trazo_a_corte'           as ProductionOrderStatus, paso: 6 })),
  ...Array(4).fill(null).map(() => ({ estatus: 'corte_completado'        as ProductionOrderStatus, paso: 7 })),
  ...Array(4).fill(null).map(() => ({ estatus: 'consumo_capturado'       as ProductionOrderStatus, paso: 8 })),
  ...Array(5).fill(null).map(() => ({ estatus: 'despachado_confeccion'   as ProductionOrderStatus, paso: 9 })),
  ...Array(3).fill(null).map(() => ({ estatus: 'material_faltante'       as ProductionOrderStatus, paso: 4 })),
  ...Array(3).fill(null).map(() => ({ estatus: 'cancelado'               as ProductionOrderStatus, paso: 0 })), // paso calculado dinámicamente
];

// ── Generación del catálogo mock ──────────────────────────────────────────────

export const MOCK_CEDICOR_PRODUCTION_ORDERS: ProductionOrder[] = Array.from(
  { length: 40 },
  (_, i) => {
    const { estatus } = POOL_ESTATUS[i];
    const pasoActual  = getPasoActual(estatus);

    // Fechas base distribuidas en los últimos 6 meses
    const fechaCreacion = new Date(
      Date.now() - faker.number.int({ min: 10, max: 180 }) * 86_400_000
    );

    const diasEstimados = faker.number.int({ min: 20, max: 60 });
    const fechaEstimada =
      estatus === 'cancelado'
        ? null
        : new Date(fechaCreacion.getTime() + diasEstimados * 86_400_000).toISOString();

    // Responsables del registro
    const responsable_produccion   = faker.helpers.arrayElement(RESPONSABLES_PRODUCCION);
    const responsable_ing_producto = faker.helpers.arrayElement(RESPONSABLES_ING_PRODUCTO);
    const responsable_almacen      = faker.helpers.arrayElement(RESPONSABLES_ALMACEN);
    const responsable_trazo        = faker.helpers.arrayElement(RESPONSABLES_TRAZO);
    const responsable_corte        = faker.helpers.arrayElement(RESPONSABLES_CORTE);

    // Responsable actual según el paso
    const responsableActualKey = RESPONSABLE_POR_PASO_KEY[Math.min(pasoActual, 9) - 1];
    const responsablesMap = {
      responsable_produccion,
      responsable_ing_producto,
      responsable_almacen,
      responsable_trazo,
      responsable_corte,
    };
    const responsable_actual = responsablesMap[responsableActualKey];

    // Estado de verificación según el avance
    let verificacion_materiales: MaterialVerificationStatus;
    if (estatus === 'material_faltante') {
      verificacion_materiales = 'faltante';
    } else if (pasoActual < 4) {
      verificacion_materiales = 'sin_verificar';
    } else if (pasoActual === 4) {
      verificacion_materiales = faker.helpers.arrayElement(['sin_verificar', 'parcial'] as MaterialVerificationStatus[]);
    } else {
      verificacion_materiales = 'disponible';
    }

    const tiene_ficha_tecnica = pasoActual >= 3;

    const clave_estilo = `EST-${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`;

    const colores = faker.helpers.arrayElements(COLORES_DISPONIBLES, { min: 1, max: 3 });
    const tallas  = faker.helpers.arrayElements(TALLAS_DISPONIBLES,  { min: 2, max: 4 });

    const historial = generarHistorial(
      pasoActual,
      estatus,
      responsablesMap,
      fechaCreacion
    );

    const folioSeq = String(i + 1).padStart(3, '0');

    return {
      id:                      faker.string.uuid(),
      folio:                   `OP-2025-${folioSeq}`,
      fecha_creacion:          fechaCreacion.toISOString(),
      fecha_estimada_entrega:  fechaEstimada,
      cliente:                 faker.helpers.arrayElement(CLIENTES),
      nombre_producto:         faker.helpers.arrayElement(NOMBRES_PRODUCTO),
      clave_producto:          faker.helpers.arrayElement(CLAVES_PRODUCTO),
      descripcion:             faker.commerce.productDescription(),
      temporada:               faker.helpers.arrayElement(TEMPORADAS),
      clave_estilo,
      colores,
      tallas,
      cantidad_total:          faker.number.int({ min: 50, max: 2_000 }),
      estatus,
      paso_actual:             pasoActual,
      responsable_actual,
      responsable_produccion,
      responsable_ing_producto,
      responsable_almacen,
      responsable_trazo,
      responsable_corte,
      tiene_ficha_tecnica,
      verificacion_materiales,
      observaciones:           faker.helpers.arrayElement([
        '',
        '',
        'Revisar especificaciones de tela con proveedor.',
        'Pendiente confirmar colores con cliente.',
        'Urgente: entrega comprometida para feria.',
        faker.lorem.sentence(8),
      ]),
      historial,
    } satisfies ProductionOrder;
  }
);
