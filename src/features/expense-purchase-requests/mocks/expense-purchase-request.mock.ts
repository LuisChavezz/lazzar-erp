import { faker } from "@faker-js/faker";
import type {
  ExpensePurchaseRequest,
  ExpenseRequestStatus,
  ExpenseRequestEventRecord,
  TipoGasto,
} from "../interfaces/expense-purchase-request.interface";
import {
  EXPENSE_REQUEST_STEPS,
  EXPENSE_REQUEST_STATUS_LABELS,
} from "../interfaces/expense-purchase-request.interface";

// Semilla fija para datos deterministas
faker.seed(5002);

// ── Catálogos de datos ────────────────────────────────────────────────────────

const PROVEEDORES = [
  { nombre: 'Office Depot de México S.A. de C.V.',      rfc: 'ODM980211XX5' },
  { nombre: 'Amazon Business Mexico S. de R.L.',        rfc: 'ABM190101AB3' },
  { nombre: 'Grupo Papelería León S.A.',                rfc: 'GPL850317CD7' },
  { nombre: 'Servicios de Limpieza Monterrey S.C.',     rfc: 'SLM000623EF9' },
  { nombre: 'Tecnología y Servicios Norte S.A.',        rfc: 'TSN920410GH2' },
  { nombre: 'Ferretería Industrial del Bajío',          rfc: 'FIB890714IJ4' },
  { nombre: 'Transportes y Logística Express S.A.',     rfc: 'TLE010903KL6' },
  { nombre: 'Hotel Camino Real Monterrey S.A.',         rfc: 'HCR740112MN8' },
  { nombre: 'Servicios Profesionales Asociados S.C.',   rfc: 'SPA951201OP1' },
  { nombre: 'Seguridad Privada Noreste S.A.',           rfc: 'SPN871025QR3' },
  { nombre: 'Cafetería El Rincón S.A. de C.V.',         rfc: 'CER001130ST5' },
  { nombre: 'Telecomunicaciones Empresariales S.A.',    rfc: 'TEM990521UV7' },
];

const AREAS = [
  'Producción',
  'Administración y Finanzas',
  'Ventas y Marketing',
  'Compras y SCM',
  'Almacén y Logística',
  'Recursos Humanos',
  'Sistemas e IT',
  'Dirección General',
  'Diseño y Desarrollo',
  'Control de Calidad',
];

const SOLICITANTES = [
  'Ricardo Flores',
  'Daniela Ríos',
  'Sergio Gutiérrez',
  'Mariana Castillo',
  'Ignacio Herrera',
  'Claudia Pérez',
  'Andrés López',
  'Fernanda Ochoa',
];

const RESPONSABLES_APROBACION = [
  'María González (Gerencia)',
  'Jorge Salinas (Cobranza)',
  'Beatriz Nava (Dirección)',
  'Felipe Rueda (Finanzas)',
];

const RESPONSABLES_COMPRAS = [
  'Ana Ramírez',
  'Carlos Mendoza',
  'Lucía Torres',
  'Humberto Vega',
];

const TIPOS_GASTO: TipoGasto[] = [
  'papeleria', 'material_oficina', 'limpieza', 'mantenimiento',
  'servicios_profesionales', 'transportacion', 'hospedaje_viaticos',
  'suscripciones', 'seguridad', 'cafeteria', 'otros',
];

// Descripciones por categoría de gasto
const DESCRIPCIONES_POR_TIPO: Record<TipoGasto, string[]> = {
  papeleria: [
    'Resmas de papel, carpetas y bolígrafos para oficinas',
    'Material de papelería general: clips, grapas, folders',
    'Insumos de escritorio para área administrativa',
  ],
  material_oficina: [
    'Silla ergonómica para estación de trabajo',
    'Monitor y teclado para área de diseño',
    'Utensilios y artículos para sala de juntas',
  ],
  limpieza: [
    'Servicio mensual de limpieza profunda en planta',
    'Productos de higiene y desinfección para instalaciones',
    'Servicio de sanitización y control de plagas',
  ],
  mantenimiento: [
    'Mantenimiento preventivo de equipo de aire acondicionado',
    'Reparación de compresor industrial en área de corte',
    'Servicio de plomería y electricidad en planta',
  ],
  servicios_profesionales: [
    'Servicio de auditoría contable trimestral',
    'Consultoría legal para revisión de contratos',
    'Servicios de diseño gráfico para catálogos de temporada',
  ],
  transportacion: [
    'Flete de mercancía Monterrey–CDMX',
    'Servicio de mensajería urgente para documentos',
    'Traslado de personal a planta foránea en Guadalajara',
  ],
  hospedaje_viaticos: [
    'Hospedaje para visita a proveedor en CDMX',
    'Viáticos para capacitación en planta de bordado',
    'Hotel y alimentación para auditor externo',
  ],
  suscripciones: [
    'Renovación anual de licencias de software de diseño',
    'Suscripción a plataforma de gestión de proyectos',
    'Licencias de antivirus y seguridad para equipos TI',
  ],
  seguridad: [
    'Servicio mensual de vigilancia privada en instalaciones',
    'Instalación de cámaras de seguridad en almacén',
    'Mantenimiento de sistema de acceso biométrico',
  ],
  cafeteria: [
    'Insumos para cafetería: café, azúcar y galletas',
    'Mantenimiento de máquina de café en sala de descanso',
    'Suministros de cocina para comedor de producción',
  ],
  otros: [
    'Material diverso para evento corporativo anual',
    'Artículos promocionales para feria de la industria',
    'Compra diversa autorizada por dirección general',
  ],
};

// ── Distribución de estatus (~50 registros) ──────────────────────────────────

const STATUS_DISTRIBUTION: Array<{ estatus: ExpenseRequestStatus; count: number }> = [
  { estatus: 'revision_requerimiento', count: 3 },
  { estatus: 'contactando_proveedor',  count: 4 },
  { estatus: 'cotizacion_solicitada',  count: 5 },
  { estatus: 'en_revision',            count: 6 },
  { estatus: 'pedido_emitido',         count: 5 },
  { estatus: 'en_seguimiento',         count: 4 },
  { estatus: 'compra_recibida',        count: 4 },
  { estatus: 'factura_firmada',        count: 3 },
  { estatus: 'rg_registrado',          count: 3 },
  { estatus: 'documentos_integrados',  count: 3 },
  { estatus: 'completado',             count: 5 },
  { estatus: 'rechazado',              count: 3 },
  { estatus: 'cancelado',              count: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula el número de paso para un estatus dado */
function getPasoActual(estatus: ExpenseRequestStatus): number {
  const idx = (EXPENSE_REQUEST_STEPS as readonly string[]).indexOf(estatus);
  if (idx !== -1) return idx + 1;
  if (estatus === 'completado') return EXPENSE_REQUEST_STEPS.length + 1;
  if (estatus === 'rechazado')  return 4; // Bloqueado en paso 4: en_revision
  if (estatus === 'cancelado')  return faker.number.int({ min: 1, max: 5 });
  return 1;
}

/** Genera el historial de eventos hasta el paso actual */
function generarHistorial(
  estatus: ExpenseRequestStatus,
  pasoActual: number,
  fechaBase: Date,
  responsable: string,
): ExpenseRequestEventRecord[] {
  const eventos: ExpenseRequestEventRecord[] = [];
  const esCancelado  = estatus === 'cancelado';
  const esRechazado  = estatus === 'rechazado';
  const esCompletado = estatus === 'completado';

  // Pasos canónicos completados antes del evento especial
  const pasosFin = esCompletado
    ? EXPENSE_REQUEST_STEPS.length
    : esCancelado
    ? pasoActual - 1
    : esRechazado
    ? 3 // Completó pasos 1-3; en el paso 4 (en_revision) fue rechazado
    : pasoActual - 1;

  let fechaActual = new Date(fechaBase);

  for (let i = 0; i < pasosFin; i++) {
    const stepKey = EXPENSE_REQUEST_STEPS[i] as ExpenseRequestStatus;
    fechaActual = faker.date.soon({ days: faker.number.int({ min: 1, max: 3 }), refDate: fechaActual });

    eventos.push({
      paso: i + 1,
      estatus: stepKey,
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        `${EXPENSE_REQUEST_STATUS_LABELS[stepKey]} registrado correctamente.`,
        `${EXPENSE_REQUEST_STATUS_LABELS[stepKey]} — sin incidencias.`,
        `Proceso de ${EXPENSE_REQUEST_STATUS_LABELS[stepKey].toLowerCase()} completado.`,
        faker.lorem.sentence(5),
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
        'Solicitud cancelada por cambio en presupuesto.',
        'Cancelado por instrucción de gerencia.',
        'Proveedor no disponible; solicitud cancelada.',
        'Requerimiento cancelado por el área solicitante.',
      ]),
    });
  } else if (esRechazado) {
    fechaActual = faker.date.soon({ days: 1, refDate: fechaActual });
    eventos.push({
      paso: 4,
      estatus: 'rechazado',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: faker.helpers.arrayElement([
        'Solicitud rechazada: monto excede el presupuesto aprobado para el área.',
        'Rechazada por Gerencia: justificación insuficiente.',
        'Cobranza rechazó: proveedor no está en la lista de aprobados.',
        'Solicitud rechazada: duplicado de compra reciente. Revisar antes de reactivar.',
      ]),
    });
  } else if (esCompletado) {
    fechaActual = faker.date.soon({ days: 2, refDate: fechaActual });
    eventos.push({
      paso: EXPENSE_REQUEST_STEPS.length + 1,
      estatus: 'completado',
      fecha: fechaActual.toISOString(),
      responsable,
      notas: 'Documentos enviados a Cobranza. Solicitud de gasto cerrada satisfactoriamente.',
    });
  }

  return eventos;
}

// ── Generador principal ───────────────────────────────────────────────────────

function generarSolicitud(index: number, estatus: ExpenseRequestStatus): ExpensePurchaseRequest {
  const folio      = `SGE-2025-${String(index + 1).padStart(3, '0')}`;
  const proveedor  = faker.helpers.arrayElement(PROVEEDORES);
  const tipoGasto: TipoGasto = faker.helpers.arrayElement(TIPOS_GASTO);
  const area       = faker.helpers.arrayElement(AREAS);
  const solicitante = faker.helpers.arrayElement(SOLICITANTES);

  const fechaSolicitud = faker.date.between({
    from: new Date('2025-01-01'),
    to:   new Date('2025-04-30'),
  });

  const diasPago = faker.number.int({ min: 5, max: 30 });
  const esTerminal = estatus === 'cancelado' || estatus === 'rechazado';
  const fechaEstimadaPago = esTerminal
    ? null
    : (() => {
        const d = new Date(fechaSolicitud);
        d.setDate(d.getDate() + diasPago);
        return d.toISOString();
      })();

  const pasoActual = getPasoActual(estatus);
  const responsableCompras = faker.helpers.arrayElement(RESPONSABLES_COMPRAS);

  // Fecha real de recepción disponible desde paso 7 (compra_recibida)
  const pasoRecepcion = (EXPENSE_REQUEST_STEPS as readonly string[]).indexOf('compra_recibida') + 1;
  const tieneRecepcion = pasoActual >= pasoRecepcion && !esTerminal;
  const fechaRecepcionReal = tieneRecepcion && fechaEstimadaPago
    ? faker.date.between({ from: fechaSolicitud, to: new Date(fechaEstimadaPago) }).toISOString()
    : null;

  // Folio R.G. disponible desde paso 9 (rg_registrado)
  const pasoRG = (EXPENSE_REQUEST_STEPS as readonly string[]).indexOf('rg_registrado') + 1;
  const tieneFolioRG = pasoActual >= pasoRG && !esTerminal;
  const folioRG = tieneFolioRG
    ? `RG-${faker.date.past({ years: 1 }).getFullYear()}-${String(faker.number.int({ min: 1, max: 999 })).padStart(3, '0')}`
    : null;

  // Aprobador disponible desde paso 5 (pedido_emitido)
  const pasoAprobacion = (EXPENSE_REQUEST_STEPS as readonly string[]).indexOf('pedido_emitido') + 1;
  const tieneAprobacion = pasoActual >= pasoAprobacion && !esTerminal;
  const aprobadoPor = tieneAprobacion ? faker.helpers.arrayElement(RESPONSABLES_APROBACION) : null;

  // Motivo de rechazo
  const motivoRechazo = estatus === 'rechazado'
    ? faker.helpers.arrayElement([
        'Monto excede el presupuesto aprobado para el área.',
        'Justificación insuficiente. Requiere nueva cotización.',
        'Proveedor no está en la lista de proveedores aprobados.',
        'Duplicado de solicitud reciente. Revisar antes de reactivar.',
      ])
    : null;

  const descripcion = faker.helpers.arrayElement(DESCRIPCIONES_POR_TIPO[tipoGasto]);
  const monto = faker.number.float({ min: 300, max: 50000, fractionDigits: 2 });
  const historial = generarHistorial(estatus, pasoActual, fechaSolicitud, responsableCompras);

  return {
    id:                  faker.string.uuid(),
    folio,
    solicitante,
    area,
    tipo_gasto:          tipoGasto,
    proveedor:           proveedor.nombre,
    rfc_proveedor:       proveedor.rfc,
    descripcion,
    justificacion:       faker.helpers.arrayElement([
      `Necesario para la operación continua del área de ${area}.`,
      'Autorizado en el presupuesto anual vigente.',
      `Solicitud urgente aprobada por ${solicitante}.`,
      faker.lorem.sentence(6),
    ]),
    monto,
    fecha_solicitud:     fechaSolicitud.toISOString(),
    fecha_estimada_pago: fechaEstimadaPago,
    fecha_recepcion_real: fechaRecepcionReal,
    estatus,
    paso_actual:         pasoActual,
    aprobado_por:        aprobadoPor,
    motivo_rechazo:      motivoRechazo,
    folio_rg:            folioRG,
    observaciones:       faker.helpers.arrayElement([
      'Sin observaciones.',
      `Urgente: requerido antes del ${faker.date.soon({ days: 10 }).toLocaleDateString('es-MX')}.`,
      'Cotización adjunta en expediente físico.',
      faker.lorem.sentence(5),
    ]),
    historial,
  };
}

// ── Exportación ───────────────────────────────────────────────────────────────

/** ~50 solicitudes de compra de gastos generadas con Faker.js (seed 5002) */
export const MOCK_EXPENSE_PURCHASE_REQUESTS: ExpensePurchaseRequest[] = STATUS_DISTRIBUTION.flatMap(
  ({ estatus, count }) =>
    Array.from({ length: count }, (_, i) => {
      const totalAntes = STATUS_DISTRIBUTION.slice(
        0,
        STATUS_DISTRIBUTION.findIndex((s) => s.estatus === estatus),
      ).reduce((acc, s) => acc + s.count, 0);
      return generarSolicitud(totalAntes + i, estatus);
    }),
);
