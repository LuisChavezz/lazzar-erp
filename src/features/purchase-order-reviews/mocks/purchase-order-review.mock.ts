import { faker } from "@faker-js/faker";
import type {
  PurchaseOrderReview,
  ReviewStatus,
  ReviewEventRecord,
  TipoCompra,
} from "../interfaces/purchase-order-review.interface";
import { REVIEW_STEPS, REVIEW_STATUS_LABELS } from "../interfaces/purchase-order-review.interface";

// Semilla fija para datos deterministas
faker.seed(5001);

// ── Catálogos de datos ────────────────────────────────────────────────────────

const PROVEEDORES = [
  { nombre: 'Textiles del Norte S.A. de C.V.',      rfc: 'TNO830412AB3' },
  { nombre: 'Hilos y Telas Monterrey S.A.',          rfc: 'HTM920714GH7' },
  { nombre: 'Distribuidora Textil Americana',        rfc: 'DTA001205XY9' },
  { nombre: 'Bordados Premium Querétaro S.A.',       rfc: 'BPQ951123PQ2' },
  { nombre: 'Insumos Industriales del Bajío',        rfc: 'IIB890312RS4' },
  { nombre: 'Hebras y Acabados CDMX S.A. de C.V.',   rfc: 'HAC781001UV6' },
  { nombre: 'Proveedora Textil Guadalajara',         rfc: 'PTG001014WX1' },
  { nombre: 'Fornituras y Etiquetas del Pacífico',   rfc: 'FEP940618YZ5' },
  { nombre: 'Accesorios de Moda Tijuana S.A.',       rfc: 'AMT870923AA8' },
  { nombre: 'Suministros Industriales Monterrey',    rfc: 'SIM991130BB2' },
];

const CATEGORIAS = [
  'Tela plana',
  'Tela de punto',
  'Hilos para bordado',
  'Accesorios (botones, cierres)',
  'Etiquetas y fornituras',
  'Entretela y fusionable',
  'Empaque y embalaje',
  'Insumos de corte',
  'Tinta y sublimación',
  'Materiales de confección',
];

const RESPONSABLES_COMPRAS = [
  'Ana Ramírez',
  'Carlos Mendoza',
  'Lucía Torres',
  'Humberto Vega',
];

const RESPONSABLES_ALMACEN = [
  'Javier Soto',
  'Martha Herrera',
  'Pedro Guzmán',
  'Liliana Cruz',
];

const RESPONSABLES_CXP = [
  'Elena Morales',
  'Roberto Ávila',
  'Patricia Jiménez',
];

// ── Distribución de estatus (total ~50 registros) ────────────────────────────

const STATUS_DISTRIBUTION: Array<{ estatus: ReviewStatus; count: number }> = [
  { estatus: 'solicitud_generada',     count: 4 },
  { estatus: 'oc_creada',              count: 5 },
  { estatus: 'esperando_confirmacion', count: 8 }, // Absorbe los anteriores 'oc_enviada'
  { estatus: 'en_seguimiento',         count: 5 },
  { estatus: 'material_no_recibido',   count: 3 }, // Bloqueado: material no llegó
  { estatus: 'contando_registrando',   count: 4 },
  { estatus: 'recepcion_confirmada',   count: 4 },
  { estatus: 'factura_subida',         count: 4 },
  { estatus: 'cxp_revisado',           count: 3 },
  { estatus: 'completado',             count: 5 },
  { estatus: 'no_recontactar',         count: 3 },
  { estatus: 'cancelado',              count: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula el número de paso para un estatus dado */
function getPasoActual(estatus: ReviewStatus): number {
  const idx = (REVIEW_STEPS as readonly string[]).indexOf(estatus);
  if (idx !== -1) return idx + 1;
  if (estatus === 'completado') return REVIEW_STEPS.length + 1;
  if (estatus === 'no_recontactar') return 3;       // Bloqueado en paso 3: esperando_confirmacion
  if (estatus === 'material_no_recibido') return 4; // Bloqueado en paso 4: en_seguimiento
  if (estatus === 'cancelado') return faker.number.int({ min: 1, max: 6 });
  return 1;
}

/** Genera el historial de eventos hasta el paso actual */
function generarHistorial(
  estatus: ReviewStatus,
  pasoActual: number,
  fechaBase: Date,
  responsable: string,
): ReviewEventRecord[] {
  const eventos: ReviewEventRecord[] = [];
  const esCancelado           = estatus === 'cancelado';
  const esNoRecontactar        = estatus === 'no_recontactar';
  const esMaterialNoRecibido   = estatus === 'material_no_recibido';
  const esCompletado           = estatus === 'completado';

  // Determinar cuántos pasos canónicos se completaron antes del evento especial
  const pasosFin = esCompletado
    ? REVIEW_STEPS.length
    : esCancelado
    ? pasoActual - 1
    : esNoRecontactar
    ? 3 // Completó hasta paso 3 (esperando_confirmacion); luego sin recontacto
    : esMaterialNoRecibido
    ? 4 // Completó hasta paso 4 (en_seguimiento); material no llegó
    : pasoActual - 1;

  let fechaActual = new Date(fechaBase);

  for (let i = 0; i < pasosFin; i++) {
    const stepKey = REVIEW_STEPS[i] as ReviewStatus;
    fechaActual = faker.date.soon({ days: faker.number.int({ min: 1, max: 4 }), refDate: fechaActual });

    eventos.push({
      paso: i + 1,
      estatus: stepKey,
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        REVIEW_STATUS_LABELS[stepKey] + ' registrado correctamente.',
        `${REVIEW_STATUS_LABELS[stepKey]} — sin incidencias.`,
        `Proceso de ${REVIEW_STATUS_LABELS[stepKey].toLowerCase()} completado.`,
        faker.lorem.sentence(6),
      ]),
    });
  }

  // Agregar evento especial si aplica
  if (esCancelado) {
    fechaActual = faker.date.soon({ days: 1, refDate: fechaActual });
    eventos.push({
      paso: pasoActual,
      estatus: 'cancelado',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        'Pedido cancelado por el proveedor.',
        'Cancelado por cambio en requerimiento de producción.',
        'Proveedor no pudo cumplir con las especificaciones.',
        'Presupuesto insuficiente; cancelado por dirección.',
      ]),
    });
  } else if (esNoRecontactar) {
    fechaActual = faker.date.soon({ days: 1, refDate: fechaActual });
    eventos.push({
      paso: 3,
      estatus: 'no_recontactar',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        'Proveedor no confirmó recepción de OC. Marcado como NO recontactar.',
        'Sin respuesta del proveedor tras 5 días hábiles. No recontactar.',
        'Proveedor reportó problemas de comunicación. Decisión: no recontactar.',
      ]),
    });
  } else if (esMaterialNoRecibido) {
    fechaActual = faker.date.soon({ days: 2, refDate: fechaActual });
    eventos.push({
      paso: 4,
      estatus: 'material_no_recibido',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        'Seguimiento confirmó que el material no fue entregado en la fecha acordada.',
        'Proveedor no pudo despachar el material. Pendiente de segunda recepción.',
        'Material retenido en tránsito. Sin confirmación de entrega.',
        'Almacén reporta que el material no llegó según lo estipulado.',
      ]),
    });
  } else if (esCompletado) {
    fechaActual = faker.date.soon({ days: 2, refDate: fechaActual });
    eventos.push({
      paso: REVIEW_STEPS.length + 1,
      estatus: 'completado',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: 'Revisión de pedido cerrada satisfactoriamente. Todos los pasos completados.',
    });
  }

  return eventos;
}

// ── Generador principal ───────────────────────────────────────────────────────

function generarRevision(index: number, estatus: ReviewStatus): PurchaseOrderReview {
  const folio = `REV-2025-${String(index + 1).padStart(3, '0')}`;
  const ocRef = `OC-2025-${String(faker.number.int({ min: 1, max: 999 })).padStart(3, '0')}`;

  const proveedor = faker.helpers.arrayElement(PROVEEDORES);
  const categoria = faker.helpers.arrayElement(CATEGORIAS);
  const tipoCompra: TipoCompra = faker.helpers.arrayElement(['directa', 'stock']);

  const fechaSolicitud = faker.date.between({
    from: new Date('2025-01-01'),
    to:   new Date('2025-04-30'),
  });

  const diasEntrega = faker.number.int({ min: 7, max: 45 });
  const fechaEstimadaEntrega = new Date(fechaSolicitud);
  fechaEstimadaEntrega.setDate(fechaEstimadaEntrega.getDate() + diasEntrega);

  const pasoActual = getPasoActual(estatus);
  const responsableCompras = faker.helpers.arrayElement(RESPONSABLES_COMPRAS);
  const responsableAlmacen = faker.helpers.arrayElement(RESPONSABLES_ALMACEN);
  const responsableCxp = faker.helpers.arrayElement(RESPONSABLES_CXP);

  // Fecha real de recepción (disponible desde paso 6 en adelante)
  const pasoRecepcion = (REVIEW_STEPS as readonly string[]).indexOf('contando_registrando') + 1;
  const tieneRecepcion = pasoActual >= pasoRecepcion && estatus !== 'cancelado';
  const fechaRecepcionReal = tieneRecepcion
    ? faker.date.between({ from: fechaSolicitud, to: fechaEstimadaEntrega }).toISOString()
    : null;

  // Folio R.T. (disponible desde paso 7)
  const pasoFolioRT = (REVIEW_STEPS as readonly string[]).indexOf('recepcion_confirmada') + 1;
  const tieneFolioRT = pasoActual >= pasoFolioRT && estatus !== 'cancelado';
  const folioRT = tieneFolioRT
    ? `RT-${faker.date.past({ years: 1 }).getFullYear()}-${String(faker.number.int({ min: 1, max: 999 })).padStart(3, '0')}`
    : null;

  // Nota de crédito (solo si tiene folio RT y con cierta probabilidad)
  const tieneNotaCredito = tieneFolioRT && faker.datatype.boolean({ probability: 0.25 });
  const notaCreditoMonto = tieneNotaCredito
    ? faker.number.float({ min: 500, max: 15000, fractionDigits: 2 })
    : null;

  const monto = faker.number.float({ min: 3000, max: 250000, fractionDigits: 2 });

  const historial = generarHistorial(estatus, pasoActual, fechaSolicitud, responsableCompras);

  return {
    id:                  faker.string.uuid(),
    folio,
    oc_referencia:       ocRef,
    tipo_compra:         tipoCompra,
    proveedor:           proveedor.nombre,
    rfc_proveedor:       proveedor.rfc,
    categoria,
    descripcion:         `${categoria} para pedido de ${faker.helpers.arrayElement(['verano', 'invierno', 'temporada alta', 'resurtido urgente', 'lote especial'])}`,
    fecha_solicitud:     fechaSolicitud.toISOString(),
    fecha_estimada_entrega: fechaEstimadaEntrega.toISOString(),
    fecha_recepcion_real: fechaRecepcionReal,
    monto_total:         monto,
    estatus,
    paso_actual:         pasoActual,
    responsable_compras: responsableCompras,
    responsable_almacen: responsableAlmacen,
    responsable_cxp:     responsableCxp,
    folio_rt:            folioRT,
    tiene_nota_credito:  tieneNotaCredito,
    nota_credito_monto:  notaCreditoMonto,
    observaciones:       faker.helpers.arrayElement([
      'Sin observaciones.',
      `Proveedor indicó entrega en ${faker.number.int({ min: 3, max: 10 })} días hábiles.`,
      `Material crítico para producción de ${faker.helpers.arrayElement(['camisas', 'pantalones', 'uniformes', 'ropa deportiva'])}.`,
      'Cotización aprobada por dirección. Urgente.',
      faker.lorem.sentence(8),
    ]),
    historial,
  };
}

// ── Exportación ───────────────────────────────────────────────────────────────

/** 50 revisiones de pedidos generadas con Faker.js (seed 5001) */
export const MOCK_PURCHASE_ORDER_REVIEWS: PurchaseOrderReview[] = STATUS_DISTRIBUTION.flatMap(
  ({ estatus, count }) =>
    Array.from({ length: count }, (_, i) => {
      const totalAntes = STATUS_DISTRIBUTION.slice(
        0,
        STATUS_DISTRIBUTION.findIndex((s) => s.estatus === estatus),
      ).reduce((acc, s) => acc + s.count, 0);
      return generarRevision(totalAntes + i, estatus);
    }),
);
