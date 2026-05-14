import { faker } from '@faker-js/faker';
import type {
  PurchaseOrder,
  PurchaseOrderLifecycleStatus,
  TrackingInfo,
  TrackingEvento,
} from '../interfaces/purchase-order.interface';

// Semilla fija para datos deterministas
faker.seed(2026);

// Tipo extendido para el mock — agrega campos visuales no presentes en la API
export interface PurchaseOrderMock extends PurchaseOrder {
  proveedor_nombre: string;
  lifecycle_status: PurchaseOrderLifecycleStatus;
  tracking?: TrackingInfo;
}

// Catálogo de proveedores ficticios
const PROVEEDORES = [
  { id: 1, nombre: 'Textiles del Norte S.A. de C.V.' },
  { id: 2, nombre: 'Confecciones Monterrey S.A.' },
  { id: 3, nombre: 'Industrial Uniformes del Bajío' },
  { id: 4, nombre: 'Importaciones Tela Plus S.A.' },
  { id: 5, nombre: 'Global Fabrics México S.A. de C.V.' },
  { id: 6, nombre: 'Distribuidora Norteña de Insumos' },
  { id: 7, nombre: 'Proveedora Nacional de Ropa S.A.' },
];

// Transportistas internacionales ficticios
const TRANSPORTISTAS = [
  'DHL Express Freight',
  'FedEx International',
  'Maersk Line',
  'MSC México',
  'Kuehne + Nagel',
  'Geodis México',
];

// Orígenes de importación
const ORIGENES = [
  { ciudad: 'Shanghai', pais: 'China' },
  { ciudad: 'Guangzhou', pais: 'China' },
  { ciudad: 'Ho Chi Minh', pais: 'Vietnam' },
  { ciudad: 'Bangkok', pais: 'Tailandia' },
  { ciudad: 'Osaka', pais: 'Japón' },
  { ciudad: 'Taipei', pais: 'Taiwán' },
];

// Orden canónico del ciclo de vida (sin cancelada, que es transversal)
const LIFECYCLE_ORDER: PurchaseOrderLifecycleStatus[] = [
  'borrador',
  'pendiente',
  'autorizada',
  'en_transito',
  'en_aduana',
  'en_camino_almacen',
  'recibida',
  'completada',
];

// Distribución del ciclo de vida: 3+4+4+4+3+2+3+3+2 = 28 órdenes
type LifecycleEntry = { estatus: number; lifecycle: PurchaseOrderLifecycleStatus };
const LIFECYCLE_SEQUENCE: LifecycleEntry[] = [
  ...Array(3).fill(null).map(() => ({ estatus: 1, lifecycle: 'borrador' as const })),
  ...Array(4).fill(null).map(() => ({ estatus: 2, lifecycle: 'pendiente' as const })),
  ...Array(4).fill(null).map(() => ({ estatus: 3, lifecycle: 'autorizada' as const })),
  ...Array(4).fill(null).map(() => ({ estatus: 3, lifecycle: 'en_transito' as const })),
  ...Array(3).fill(null).map(() => ({ estatus: 3, lifecycle: 'en_aduana' as const })),
  ...Array(2).fill(null).map(() => ({ estatus: 4, lifecycle: 'en_camino_almacen' as const })),
  ...Array(3).fill(null).map(() => ({ estatus: 4, lifecycle: 'recibida' as const })),
  ...Array(3).fill(null).map(() => ({ estatus: 4, lifecycle: 'completada' as const })),
  ...Array(2).fill(null).map(() => ({ estatus: 5, lifecycle: 'cancelada' as const })),
];

/**
 * Genera la información de rastreo para órdenes que están en tránsito o más avanzadas.
 * El timeline muestra eventos completados hasta el estado actual + 1 paso adelante como pendiente.
 */
function generarTracking(
  lifecycle: PurchaseOrderLifecycleStatus,
  fechaOC: Date,
): TrackingInfo | undefined {
  const LIFECYCLE_CON_TRACKING: PurchaseOrderLifecycleStatus[] = [
    'en_transito',
    'en_aduana',
    'en_camino_almacen',
    'recibida',
    'completada',
  ];

  if (!LIFECYCLE_CON_TRACKING.includes(lifecycle)) return undefined;

  const origen = faker.helpers.arrayElement(ORIGENES);
  const origenStr = `${origen.ciudad}, ${origen.pais}`;
  const transportista = faker.helpers.arrayElement(TRANSPORTISTAS);
  const guia =
    faker.string.alpha({ length: 3, casing: 'upper' }) +
    faker.string.numeric(9);

  const eta = new Date(fechaOC);
  eta.setDate(eta.getDate() + faker.number.int({ min: 35, max: 55 }));

  const currentIdx = LIFECYCLE_ORDER.indexOf(lifecycle);

  // Definición de todos los eventos posibles en el timeline
  // statusIdx corresponde al índice en LIFECYCLE_ORDER
  const EVENTO_DEFS: {
    descripcion: string;
    ubicacion: string;
    offsetDays: number;
    hora: string;
    statusIdx: number;
  }[] = [
    {
      descripcion: 'OC registrada en sistema ERP',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 0,
      hora: '09:15',
      statusIdx: 0, // borrador
    },
    {
      descripcion: 'Orden enviada para autorización interna',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 1,
      hora: '10:00',
      statusIdx: 1, // pendiente
    },
    {
      descripcion: 'Orden de compra autorizada',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 3,
      hora: '11:30',
      statusIdx: 2, // autorizada
    },
    {
      descripcion: `Proveedor confirmó despacho — ${origenStr}`,
      ubicacion: origenStr,
      offsetDays: 7,
      hora: '14:00',
      statusIdx: 3, // en_transito
    },
    {
      descripcion: 'Salida del almacén del proveedor',
      ubicacion: origenStr,
      offsetDays: 9,
      hora: '08:00',
      statusIdx: 3, // en_transito
    },
    {
      descripcion: `Mercancía en tránsito marítimo hacia México`,
      ubicacion: `En ruta ${origen.ciudad} → Manzanillo`,
      offsetDays: 11,
      hora: '00:00',
      statusIdx: 3, // en_transito
    },
    {
      descripcion: 'Arribo al Puerto de Manzanillo, Colima',
      ubicacion: 'Manzanillo, Colima',
      offsetDays: 29,
      hora: '06:30',
      statusIdx: 4, // en_aduana
    },
    {
      descripcion: 'Documentos enviados al agente aduanal',
      ubicacion: 'Manzanillo, Colima',
      offsetDays: 29,
      hora: '11:00',
      statusIdx: 4, // en_aduana
    },
    {
      descripcion: 'Pedimento pagado · Mercancía liberada de aduana',
      ubicacion: 'Manzanillo, Colima',
      offsetDays: 32,
      hora: '15:20',
      statusIdx: 4, // en_aduana
    },
    {
      descripcion: 'Cargamento en transporte terrestre a destino',
      ubicacion: 'En ruta a Monterrey, N.L.',
      offsetDays: 33,
      hora: '08:00',
      statusIdx: 5, // en_camino_almacen
    },
    {
      descripcion: 'Recibida y validada en Almacén 04',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 36,
      hora: '10:00',
      statusIdx: 6, // recibida
    },
    {
      descripcion: 'Folio RC generado en sistema',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 36,
      hora: '11:30',
      statusIdx: 7, // completada
    },
    {
      descripcion: 'Gastos de importación cargados al RC',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 37,
      hora: '09:00',
      statusIdx: 7, // completada
    },
    {
      descripcion: 'Proceso cerrado · Contabilidad notificada',
      ubicacion: 'Monterrey, N.L.',
      offsetDays: 37,
      hora: '14:15',
      statusIdx: 7, // completada
    },
  ];

  // Mostrar todos los eventos hasta el estado actual + 1 paso adelante
  const maxStatusIdx = Math.min(currentIdx + 1, 7);
  const eventosVisibles = EVENTO_DEFS.filter((e) => e.statusIdx <= maxStatusIdx);

  const eventos: TrackingEvento[] = eventosVisibles.map((def, idx, arr) => {
    const fecha = new Date(fechaOC);
    fecha.setDate(fecha.getDate() + def.offsetDays);

    // El último evento del estado actual es "current"; los anteriores al estado actual son completados
    const isAtCurrentStatus = def.statusIdx === currentIdx;
    const isLastAtCurrentStatus =
      isAtCurrentStatus && !arr.slice(idx + 1).some((e) => e.statusIdx === currentIdx);

    const completado =
      def.statusIdx < currentIdx ||
      (isAtCurrentStatus && !isLastAtCurrentStatus);
    const esCurrent = isAtCurrentStatus && isLastAtCurrentStatus;

    return {
      fecha: fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      hora: def.hora,
      descripcion: def.descripcion,
      ubicacion: def.ubicacion,
      completado,
      esCurrent,
    };
  });

  return {
    numero_guia: guia,
    transportista,
    origen: origenStr,
    destino: 'Almacén 04 — Monterrey, N.L.',
    fecha_estimada_llegada: eta.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    eventos,
  };
}

function generarOrden(seq: number): PurchaseOrderMock {
  const entry = LIFECYCLE_SEQUENCE[seq - 1] ?? { estatus: 2, lifecycle: 'pendiente' as const };
  const { estatus, lifecycle } = entry;

  const proveedor = faker.helpers.arrayElement(PROVEEDORES);
  const fechaOC = faker.date.between({ from: '2025-01-01', to: '2026-04-30' });
  const fechaEntrega = new Date(fechaOC);
  fechaEntrega.setDate(fechaEntrega.getDate() + faker.number.int({ min: 15, max: 60 }));

  // Solo órdenes autorizadas o completadas tienen fecha de autorización
  const fechaAutorizacion =
    [3, 4].includes(estatus)
      ? new Date(
          fechaOC.getTime() + faker.number.int({ min: 1, max: 5 }) * 86_400_000,
        ).toISOString()
      : null;

  const subtotal = faker.number.float({ min: 5_000, max: 150_000, fractionDigits: 2 });
  const descuento = faker.number.float({ min: 0, max: subtotal * 0.05, fractionDigits: 2 });
  const impuestos = parseFloat(((subtotal - descuento) * 0.16).toFixed(2));
  const total = parseFloat((subtotal - descuento + impuestos).toFixed(2));

  const folio = `OC-${String(1000 + seq).padStart(4, '0')}`;
  const referencia =
    faker.helpers.maybe(
      () => `REF-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
      { probability: 0.7 },
    ) ?? '';

  const createdAt = fechaOC.toISOString();
  const tracking = generarTracking(lifecycle, fechaOC);

  return {
    id: seq,
    folio,
    referencia,
    fecha_oc: fechaOC.toISOString().split('T')[0],
    fecha_entrega_estimada: fechaEntrega.toISOString().split('T')[0],
    fecha_autorizacion: fechaAutorizacion,
    estatus,
    subtotal: subtotal.toFixed(2),
    descuento: descuento.toFixed(2),
    impuestos: impuestos.toFixed(2),
    total: total.toFixed(2),
    observaciones:
      faker.helpers.maybe(
        () => faker.lorem.sentence({ min: 5, max: 15 }),
        { probability: 0.4 },
      ) ?? '',
    activo: estatus !== 5,
    created_at: createdAt,
    updated_at: createdAt,
    empresa: 1,
    sucursal: faker.number.int({ min: 1, max: 3 }),
    proveedor: proveedor.id,
    proveedor_nombre: proveedor.nombre,
    lifecycle_status: lifecycle,
    tracking,
    solicitud_compra: 1_000 + seq,
    moneda: faker.helpers.arrayElement([1, 2]), // 1 = MXN · 2 = USD
    usuario: faker.number.int({ min: 1, max: 5 }),
    pedido: 2_000 + seq,
  };
}

function construirMockOrdenes(): PurchaseOrderMock[] {
  const ordenes: PurchaseOrderMock[] = [];
  for (let i = 1; i <= 28; i++) {
    ordenes.push(generarOrden(i));
  }
  return faker.helpers.shuffle(ordenes);
}

export const MOCK_PURCHASE_ORDERS: PurchaseOrderMock[] = construirMockOrdenes();
