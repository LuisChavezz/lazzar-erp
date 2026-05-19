import { faker } from "@faker-js/faker";
import type {
  PQOrder,
  PQOrderStatus,
  PQOrderEventRecord,
  CategoriaInsumo,
} from "../interfaces/pq-order.interface";
import {
  PQ_ORDER_STEPS,
  PQ_ORDER_STATUS_LABELS,
} from "../interfaces/pq-order.interface";

// Semilla fija para datos deterministas
faker.seed(5003);

// ── Catálogos de datos ────────────────────────────────────────────────────────

const PROVEEDORES_PQ = [
  { nombre: 'Textiles Industriales del Norte S.A.',     rfc: 'TIN950301AB1' },
  { nombre: 'Fibras y Tejidos del Bajío S.A.',          rfc: 'FTB880715CD3' },
  { nombre: 'Hilos y Accesorios Monterrey S.A.',        rfc: 'HAM920422EF5' },
  { nombre: 'Cremalleras y Botones del Pacífico S.A.',  rfc: 'CBP870630GH7' },
  { nombre: 'Telas Finas del Noreste S.A. de C.V.',     rfc: 'TFN010905IJ9' },
  { nombre: 'Etiquetas y Bordados Express S.C.',        rfc: 'EBE001210KL2' },
  { nombre: 'Materiales de Empaque Industrial S.A.',    rfc: 'MEI910215MN4' },
  { nombre: 'Tintorería Industrial del Norte S.A.',     rfc: 'TIN040820OP6' },
];

const RESPONSABLES_COMPRAS = [
  'Ana Ramírez',
  'Carlos Mendoza',
  'Lucía Torres',
  'Humberto Vega',
  'Patricia Salinas',
];

const UNIDADES = ['metros', 'kg', 'piezas', 'rollos', 'paquetes', 'docenas'];

const CATEGORIAS: CategoriaInsumo[] = [
  'telas_insumos', 'hilos_accesorios', 'empaque',
  'bordados_serigrafia', 'etiquetado', 'otros_materiales',
];

const DESCRIPCIONES_POR_CATEGORIA: Record<CategoriaInsumo, string[]> = {
  telas_insumos: [
    'Tela de algodón 200 hilos para colección primavera',
    'Jersey elastano gris 150g/m² — temporada SS',
    'Lona impermeable para forro exterior',
    'Gabardina stretch 280g/m² color marfil',
  ],
  hilos_accesorios: [
    'Hilos de bordado multicolor — pantones temporada AW',
    'Cremalleras YKK #5 en negro y blanco — 500 pzas',
    'Botones de resina 18mm línea premium — 1000 pzas',
    'Broches automáticos níquel 15mm — 2000 pzas',
  ],
  empaque: [
    'Bolsas de polietileno 12x18 transparentes anti-estática',
    'Cajas de cartón corrugado 30x20x10 con impresión',
    'Papel tissue 17g/m² para empaque de prendas',
    'Stretch film 20µ para paletizado de cajas',
  ],
  bordados_serigrafia: [
    'Aplicación de logo bordado en pecho izquierdo — 500 pzas',
    'Serigrafía 4 colores para camisetas — tirada 1000 pzas',
    'Transfer digital para sudaderas — colección nueva',
    'Parche tejido personalizado 4x4 cm',
  ],
  etiquetado: [
    'Etiquetas de composición y cuidado español/inglés — 5000 pzas',
    'Hangtags con código de barras y precio impreso',
    'Etiquetas de marca interior tejida 50mm',
    'Stickers de seguridad con holograma',
  ],
  otros_materiales: [
    'Entretela termoadhesiva 50g/m² para cuellos y puños',
    'Relleno de poliéster 250g/m² para chalecos acolchados',
    'Forro de bolsillos tafetán 70D blanco',
    'Velcro adhesivo de 2cm ancho en rollos de 25m',
  ],
};

// ── Distribución de estatus (~48 registros) ──────────────────────────────────

const STATUS_DISTRIBUTION: Array<{ estatus: PQOrderStatus; count: number }> = [
  { estatus: 'pedido_generado',       count: 3 },
  { estatus: 'cantidades_ingresadas', count: 5 },
  { estatus: 'verificando_surtido',   count: 6 },
  { estatus: 'en_seguimiento',        count: 8 },
  { estatus: 'confirmando_proveedor', count: 6 },
  { estatus: 'proveedor_procesando',  count: 5 },
  { estatus: 'contactando_almacen',   count: 4 },
  { estatus: 'surtido',               count: 8 },
  { estatus: 'cancelado',             count: 3 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula el número de paso para un estatus dado */
function getPasoActual(estatus: PQOrderStatus): number {
  const idx = (PQ_ORDER_STEPS as readonly string[]).indexOf(estatus);
  if (idx !== -1) return idx + 1;
  if (estatus === 'surtido')   return PQ_ORDER_STEPS.length + 1;
  if (estatus === 'cancelado') return faker.number.int({ min: 1, max: 4 });
  return 1;
}

/** Genera el historial de eventos para un pedido */
function generarHistorial(
  estatus: PQOrderStatus,
  pasoActual: number,
  fechaBase: Date,
  responsable: string,
  intentos: number,
): PQOrderEventRecord[] {
  const eventos: PQOrderEventRecord[] = [];
  const esCancelado = estatus === 'cancelado';
  const esSurtido   = estatus === 'surtido';

  const pasosFin = esSurtido
    ? PQ_ORDER_STEPS.length
    : esCancelado
    ? pasoActual - 1
    : pasoActual - 1;

  let fechaActual = new Date(fechaBase);

  for (let i = 0; i < pasosFin; i++) {
    const stepKey = PQ_ORDER_STEPS[i] as PQOrderStatus;
    fechaActual = faker.date.soon({ days: faker.number.int({ min: 1, max: 2 }), refDate: fechaActual });

    eventos.push({
      paso: i + 1,
      estatus: stepKey,
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        `${PQ_ORDER_STATUS_LABELS[stepKey]} registrado correctamente.`,
        `${PQ_ORDER_STATUS_LABELS[stepKey]} — sin incidencias.`,
        `Proceso de ${PQ_ORDER_STATUS_LABELS[stepKey].toLowerCase()} completado.`,
        faker.lorem.sentence(5),
      ]),
    });
  }

  // Agregar evento terminal si aplica
  if (esCancelado) {
    fechaActual = faker.date.soon({ days: 1, refDate: fechaActual });
    eventos.push({
      paso: pasoActual,
      estatus: 'cancelado',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        'Pedido cancelado por cambio en plan de producción.',
        'Cancelado por instrucción del área de compras.',
        'Proveedor no disponible en el período solicitado.',
        'Pedido cancelado; se emitirá nueva O.C. para el período siguiente.',
      ]),
    });
  } else if (esSurtido) {
    fechaActual = faker.date.soon({ days: 1, refDate: fechaActual });
    eventos.push({
      paso: PQ_ORDER_STEPS.length + 1,
      estatus: 'surtido',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: `Pedido surtido exitosamente en ${intentos} intento(s). Materiales confirmados en almacén.`,
    });
  }

  return eventos;
}

// ── Generador principal ───────────────────────────────────────────────────────

function generarPedidoPQ(index: number, estatus: PQOrderStatus): PQOrder {
  const folio       = `PQ-2025-${String(index + 1).padStart(3, '0')}`;
  const ocNum       = faker.number.int({ min: 1, max: 50 });
  const oc_referencia = `OC-2025-${String(ocNum).padStart(3, '0')}`;
  const proveedor   = faker.helpers.arrayElement(PROVEEDORES_PQ);
  const categoria   = faker.helpers.arrayElement(CATEGORIAS) as CategoriaInsumo;
  const unidad      = faker.helpers.arrayElement(UNIDADES);
  const responsable = faker.helpers.arrayElement(RESPONSABLES_COMPRAS);

  const fechaSolicitud = faker.date.between({
    from: new Date('2025-01-01'),
    to:   new Date('2025-04-30'),
  });

  const diasEntrega = faker.number.int({ min: 3, max: 15 });
  const fechaEstimadaEntrega = estatus === 'cancelado'
    ? null
    : (() => {
        const d = new Date(fechaSolicitud);
        d.setDate(d.getDate() + diasEntrega);
        return d.toISOString();
      })();

  const pasoActual = getPasoActual(estatus);

  // Intentos de surtido — aumenta cuando el pedido pasa por seguimiento/retry
  const intentos_surtido = (estatus === 'surtido' || pasoActual >= 4)
    ? faker.number.int({ min: 1, max: 3 })
    : 1;

  // Fecha real de surtido
  const fechaSurtidoReal = estatus === 'surtido' && fechaEstimadaEntrega
    ? faker.date.between({ from: fechaSolicitud, to: new Date(fechaEstimadaEntrega) }).toISOString()
    : null;

  // Cantidades surtidas vs solicitadas
  const cantidad_solicitada = faker.number.int({ min: 50, max: 1000 });
  const surtidoPercent = estatus === 'surtido'
    ? 1.0
    : pasoActual >= 6
    ? faker.number.float({ min: 0.5, max: 0.9, fractionDigits: 2 })
    : 0;
  const cantidad_surtida = Math.round(cantidad_solicitada * surtidoPercent);

  const monto_estimado = faker.number.float({ min: 1500, max: 120000, fractionDigits: 2 });
  const descripcion    = faker.helpers.arrayElement(DESCRIPCIONES_POR_CATEGORIA[categoria]);
  const historial      = generarHistorial(estatus, pasoActual, fechaSolicitud, responsable, intentos_surtido);

  return {
    id: faker.string.uuid(),
    folio,
    oc_referencia,
    proveedor:           proveedor.nombre,
    rfc_proveedor:       proveedor.rfc,
    descripcion,
    categoria,
    cantidad_solicitada,
    cantidad_surtida,
    unidad,
    monto_estimado,
    responsable_compras: responsable,
    fecha_solicitud:     fechaSolicitud.toISOString(),
    fecha_estimada_entrega: fechaEstimadaEntrega,
    fecha_surtido_real:  fechaSurtidoReal,
    estatus,
    paso_actual:         pasoActual,
    intentos_surtido,
    observaciones: faker.helpers.arrayElement([
      'Sin observaciones.',
      `Urgente: requerido para línea de producción del ${faker.date.soon({ days: 10 }).toLocaleDateString('es-MX')}.`,
      'Insumo crítico para colección de temporada. Prioridad alta.',
      faker.lorem.sentence(5),
    ]),
    historial,
  };
}

// ── Exportación ───────────────────────────────────────────────────────────────

/** ~48 Pedidos PQ generados con Faker.js (seed 5003) */
export const MOCK_PQ_ORDERS: PQOrder[] = STATUS_DISTRIBUTION.flatMap(
  ({ estatus, count }) =>
    Array.from({ length: count }, (_, i) => {
      const totalAntes = STATUS_DISTRIBUTION.slice(
        0,
        STATUS_DISTRIBUTION.findIndex((s) => s.estatus === estatus),
      ).reduce((acc, s) => acc + s.count, 0);
      return generarPedidoPQ(totalAntes + i, estatus);
    }),
);
