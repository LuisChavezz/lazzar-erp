import { faker } from '@faker-js/faker';
import type {
  EmbroideryOrder,
  EmbroideryOrderItem,
  EmbroideryStatusEvent,
  TipoSurtido,
  TecnicaImpresion,
  EstatusValidacionArte,
  ValidacionArte,
  EstatusHojaBordado,
  NumeroBordadora,
  ClasificacionPedido,
  NivelRack,
  RackSlot,
  Ponchado,
  TipoPonchado,
  EstatusPonchado,
} from '../interfaces/embroidery-order.interface';

// Semilla fija para datos deterministas (diferente a purchase-orders)
faker.seed(2027);

// Catálogo de clientes del sector retail/moda
const CLIENTES = [
  'LIVERPOOL S.A. DE C.V.',
  'PALACIO DE HIERRO S.A.B. DE C.V.',
  'SUBURBIA DE MEXICO S.A. DE C.V.',
  'COPPEL S.A. DE C.V.',
  'SORIANA MODA S.A. DE C.V.',
  'WALMART MEXICO S.A.B. DE C.V.',
  'SANBORNS HERMANOS S.A.',
  'SEARS OPERADORA MEXICO S.A. DE C.V.',
];

// Tipos de masuilero / entretela
const MASUILEROS = [
  'Entretela fusionable 30g',
  'Entretela tejida 50g',
  'Entretela no tejida 25g',
  'Tela de corte libre',
  'Organza de estabilización',
];

// Digitalizadores del área de ponchados
const DIGITALIZADORES = ['Roberto Sánchez', 'Patricia Cruz', 'Miguel Torres', 'Sofía Ramírez'];

// Nombres de diseños digitalizados
const NOMBRES_DISENO = [
  'Logo Corporativo Estándar', 'Escudo Institucional', 'Firma Floral',
  'Emblema deportivo', 'Monograma elegante', 'Texto bordado cursiva',
  'Insignia militar', 'Patrón vegetal moderno', 'Diseño escolar ribete',
];

// Catálogo predeterminado de artículos con bordado (provienen del pedido)
const CATALOGO_ARTICULOS: Omit<EmbroideryOrderItem, 'cantidad' | 'bordados_por_prenda'>[] = [
  { clave_articulo: 'A11665M', descripcion: 'Chamarra dama con bordado pecho', color: 'NEGRO', talla: 'M', distribucion_bordado: 'Pecho izquierdo' },
  { clave_articulo: 'A10961GR', descripcion: 'Playera cuello redondo logotipo', color: 'GRIS', talla: 'L', distribucion_bordado: 'Pecho izquierdo + Espalda' },
  { clave_articulo: 'B22301N', descripcion: 'Blusa manga larga bordada', color: 'BLANCO', talla: 'S', distribucion_bordado: 'Pecho derecho' },
  { clave_articulo: 'C45890A', descripcion: 'Sudadera capucha con escudo', color: 'AZUL MARINO', talla: 'XL', distribucion_bordado: 'Espalda completa' },
  { clave_articulo: 'D78123B', descripcion: 'Pants casual ribete bordado', color: 'NEGRO', talla: 'L', distribucion_bordado: 'Manga izquierda' },
  { clave_articulo: 'A11780R', descripcion: 'Camiseta polo corporativa', color: 'ROJO', talla: 'M', distribucion_bordado: 'Pecho izquierdo' },
  { clave_articulo: 'B33412V', descripcion: 'Chaleco ejecutivo bordado', color: 'NEGRO', talla: 'XL', distribucion_bordado: 'Pecho izquierdo + Pecho derecho' },
  { clave_articulo: 'C56781S', descripcion: 'Uniforme escolar con escuela', color: 'AZUL MARINO', talla: '10', distribucion_bordado: 'Pecho izquierdo' },
];

// Bordadoras disponibles
const BORDADORAS: NumeroBordadora[] = [
  'Máquina 1', 'Máquina 2', 'Máquina 3',
  'Máquina 4', 'Máquina 5', 'Máquina 6',
];

// Clasificaciones de pedido
const CLASIFICACIONES: ClasificacionPedido[] = [
  'clasificacion_b', 'ponchado_arreglo', 'externo', 'serigrafia',
];

// Niveles de rack por capacidad de máquina
const NIVELES_RACK: NivelRack[] = ['superior', 'medio', 'inferior'];

// Técnicas de impresión disponibles en planta
const TECNICAS: TecnicaImpresion[] = ['dtf', 'serigrafia', 'vinil', 'sublimado'];

// Responsables de validación de arte en el área de diseño
const VALIDADORES_ARTE = ['Diana Ortega', 'Ernesto Vega', 'Laura Medina', 'Jesús Herrera'];

// Orden canónico de estatus para el historial
const ORDEN_ESTATUS: EstatusHojaBordado[] = [
  'sin_liberar', 'liberada', 'en_proceso', 'terminada',
];

// Genera los artículos predeterminados (subconjunto del catálogo, como si vinieran del pedido)
function generarArticulos(cantidad: number): EmbroideryOrderItem[] {
  const seleccion = faker.helpers.arrayElements(CATALOGO_ARTICULOS, cantidad);
  return seleccion.map((base) => ({
    ...base,
    cantidad: faker.number.int({ min: 5, max: 80 }),
    bordados_por_prenda: faker.helpers.arrayElement([1, 2, 3]),
  }));
}

// Genera una fecha ISO aleatoria entre dos fechas
function fechaAleatoria(inicio: Date, fin: Date): string {
  return faker.date.between({ from: inicio, to: fin }).toISOString().split('T')[0];
}

// Genera el historial de estatus hasta el estatus actual
function generarHistorial(
  estatusActual: EstatusHojaBordado,
  fechaBase: string
): EmbroideryStatusEvent[] {
  const indexActual = ORDEN_ESTATUS.indexOf(estatusActual);
  const USUARIOS = ['Ana García', 'Luis Reyes', 'María López', 'Carlos Mendez', 'Rosa Flores'];
  const NOTAS: Partial<Record<EstatusHojaBordado, string>> = {
    sin_liberar: 'Orden recibida. Pendiente de revisión y liberación.',
    liberada: 'Muestra aprobada. Orden lista para iniciar producción.',
    en_proceso: 'Asignada a bordadora. Producción iniciada.',
    terminada: 'Bordado concluido. Listo para entrega a deshebrado.',
  };

  let fechaCursor = new Date(fechaBase + 'T08:00:00');

  return ORDEN_ESTATUS.map((estatus, idx) => {
    const completado = idx < indexActual;
    const esCurrent = idx === indexActual;
    // Avanza la fecha cursor solo para eventos completados
    if (idx > 0 && (completado || esCurrent)) {
      fechaCursor = new Date(
        fechaCursor.getTime() + faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000
      );
    }
    const fechaEvento = completado || esCurrent
      ? fechaCursor.toISOString().split('T')[0]
      : '';
    const horaEvento = completado || esCurrent
      ? `${String(faker.number.int({ min: 7, max: 18 })).padStart(2, '0')}:${String(faker.number.int({ min: 0, max: 59 })).padStart(2, '0')}`
      : '';

    return {
      estatus,
      fecha: fechaEvento,
      hora: horaEvento,
      usuario: completado || esCurrent ? faker.helpers.arrayElement(USUARIOS) : '',
      nota: NOTAS[estatus],
      completado,
      esCurrent,
    };
  });
}

// Genera el slot de rack (solo si la orden fue liberada o avanzó)
function generarRackSlot(
  estatus: EstatusHojaBordado,
  nivel: NivelRack | null,
  fechaBase: string
): RackSlot | null {
  // Sin liberar = aún no ingresó al rack físico
  if (estatus === 'sin_liberar' || !nivel) return null;
  return {
    nivel,
    posicion: faker.number.int({ min: 1, max: 12 }),
    asignado_en: fechaAleatoria(new Date(fechaBase), new Date(fechaBase.replace(/(\d{4})/, (_, y) => String(+y + 1)))),
  };
}

// Genera registros de actividad de ponchado asociados a la orden
function generarPonchados(
  clasificacion: ClasificacionPedido,
  fechaBase: string,
  estatus: EstatusHojaBordado
): Ponchado[] {
  // Órdenes sin liberar usualmente no tienen ponchados asignados aún
  if (estatus === 'sin_liberar' && faker.datatype.boolean(0.65)) return [];

  const cantidad = faker.number.int({ min: 1, max: 3 });

  // Tipo principal según clasificación del pedido
  const tipoBase: TipoPonchado =
    clasificacion === 'serigrafia' ? 'serigrafia' :
    clasificacion === 'ponchado_arreglo'
      ? faker.helpers.arrayElement(['ponchado', 'arreglo'] as TipoPonchado[])
      : clasificacion === 'externo'
        ? faker.helpers.arrayElement(['bordado', 'envio_muestra'] as TipoPonchado[])
        : 'bordado';

  return Array.from({ length: cantidad }, (_, i) => {
    const estatusPonchado: EstatusPonchado = faker.helpers.weightedArrayElement([
      { value: 'pendiente' as EstatusPonchado, weight: 3 },
      { value: 'en_proceso' as EstatusPonchado, weight: 4 },
      { value: 'listo' as EstatusPonchado, weight: 8 },
      { value: 'observacion' as EstatusPonchado, weight: 2 },
    ]);
    const fechaSolicitud = fechaAleatoria(new Date(fechaBase), FIN);
    return {
      id: i + 1,
      tipo: tipoBase,
      clave_diseno: `PNCH-${String(faker.number.int({ min: 1000, max: 9999 }))}`,
      nombre_diseno: faker.helpers.arrayElement(NOMBRES_DISENO),
      puntos: faker.number.int({ min: 2000, max: 85000 }),
      estatus: estatusPonchado,
      fecha_solicitud: fechaSolicitud,
      fecha_entrega: estatusPonchado === 'listo'
        ? fechaAleatoria(new Date(fechaSolicitud), FIN)
        : null,
      digitalizador: estatusPonchado !== 'pendiente'
        ? faker.helpers.arrayElement(DIGITALIZADORES)
        : null,
      observaciones: faker.datatype.boolean(0.3)
        ? faker.helpers.arrayElement([
            'Requiere ajuste de densidad de puntos.',
            'Diseño validado con muestra física.',
            'Actualización de colores pendiente.',
            'Tamaño ajustado a prenda.',
            'En revisión por el cliente.',
          ])
        : '',
    };
  });
}

// Genera la validación de arte según el estatus de la orden
// Solo aplica antes de en_proceso; las órdenes avanzadas se consideran aprobadas
function generarValidacionArte(
  estatus: EstatusHojaBordado,
  fechaBase: string
): ValidacionArte {
  // Órdenes en proceso o terminadas ya tienen el arte aprobado
  if (estatus === 'en_proceso' || estatus === 'terminada') {
    return {
      estatus: 'aprobado',
      validado_por: faker.helpers.arrayElement(VALIDADORES_ARTE),
      fecha_validacion: fechaBase,
      observaciones: '',
    };
  }
  // Órdenes sin liberar o liberadas tienen validación en cualquier estado
  const estatusArte = faker.helpers.weightedArrayElement([
    { value: 'pendiente' as EstatusValidacionArte, weight: 5 },
    { value: 'aprobado' as EstatusValidacionArte, weight: 4 },
    { value: 'en_correccion' as EstatusValidacionArte, weight: 3 },
  ]);
  return {
    estatus: estatusArte,
    validado_por: estatusArte !== 'pendiente'
      ? faker.helpers.arrayElement(VALIDADORES_ARTE)
      : null,
    fecha_validacion: estatusArte !== 'pendiente'
      ? fechaBase
      : null,
    observaciones: estatusArte === 'en_correccion'
      ? faker.helpers.arrayElement([
          'El tamaño del diseño excede la zona de bordado permitida.',
          'Los colores no coinciden con la muestra aprobada por el cliente.',
          'La resolución del archivo no es suficiente para el ponchado.',
          'Ajustar la densidad de puntos en la zona del logo.',
          'El texto bordado es ilegible en la talla S, reducir elementos.',
        ])
      : '',
  };
}

// Construye el arreglo de órdenes de bordado mock
const INICIO = new Date('2025-01-01');
const FIN = new Date('2026-04-30');

export const MOCK_EMBROIDERY_ORDERS: EmbroideryOrder[] = Array.from(
  { length: 28 },
  (_, i) => {
    const id = i + 1;
    const fechaRecibo = fechaAleatoria(INICIO, FIN);
    const estatus = faker.helpers.weightedArrayElement([
      { value: 'sin_liberar' as EstatusHojaBordado, weight: 5 },
      { value: 'liberada' as EstatusHojaBordado, weight: 6 },
      { value: 'en_proceso' as EstatusHojaBordado, weight: 10 },
      { value: 'terminada' as EstatusHojaBordado, weight: 7 },
    ]);

    // Las órdenes terminadas o en proceso tienen bordadora asignada
    const tieneBordadora = estatus === 'en_proceso' || estatus === 'terminada';
    const tieneOtb = estatus !== 'sin_liberar';
    const fechaOtb = tieneOtb ? fechaAleatoria(new Date(fechaRecibo), FIN) : null;

    // Nivel de rack según si tiene bordadora (mayor avance → nivel inferior por peso)
    const nivelRack: NivelRack | null = tieneOtb
      ? faker.helpers.arrayElement(NIVELES_RACK)
      : null;

    // Rack slot: se asigna cuando la orden fue liberada (antes de iniciar bordado)
    const rackSlot = generarRackSlot(estatus, nivelRack, fechaOtb ?? fechaRecibo);

    // Fechas de fin de bordado y entrega a deshebrado (solo si está en proceso o terminada)
    const finBordadoEstimado =
      estatus === 'en_proceso' || estatus === 'terminada'
        ? fechaAleatoria(new Date(fechaOtb ?? fechaRecibo), FIN)
        : null;
    const fechaEntregaDeshebrado =
      estatus === 'terminada' && finBordadoEstimado
        ? fechaAleatoria(new Date(finBordadoEstimado), FIN)
        : null;

    return {
      id,
      numero_orden: `OB-${String(15800 + id).padStart(5, '0')}`,
      pedido: `P${String(97000 + faker.number.int({ min: 100, max: 1500 }))}`,
      cliente: faker.helpers.arrayElement(CLIENTES),
      fecha_recibo: fechaRecibo,
      fecha_entrega_pedido: faker.datatype.boolean(0.85)
        ? fechaAleatoria(new Date(fechaRecibo), FIN)
        : null,
      fecha_entrega_parcialidad: faker.datatype.boolean(0.5)
        ? fechaAleatoria(new Date(fechaRecibo), FIN)
        : null,
      orden_trabajo_bordado: tieneOtb
        ? `OTB-${String(faker.number.int({ min: 600, max: 2000 })).padStart(4, '0')}`
        : null,
      fecha_otb: fechaOtb,
      tipo_surtido: faker.helpers.weightedArrayElement([
        { value: 'completa' as TipoSurtido, weight: 6 },
        { value: 'parcial' as TipoSurtido, weight: 5 },
      ]),
      total_prendas_recibidas: faker.number.int({ min: 1, max: 250 }),
      bordados_requeridos_por_prenda: faker.helpers.arrayElement([1, 2, 3]),
      fecha_liberacion_cuadre:
        estatus === 'liberada' || estatus === 'en_proceso' || estatus === 'terminada'
          ? fechaAleatoria(new Date(fechaRecibo), FIN)
          : null,
      estatus_hoja: estatus,
      numero_bordadora: tieneBordadora
        ? faker.helpers.arrayElement(BORDADORAS)
        : null,
      masuilero: faker.helpers.arrayElement(MASUILEROS),
      lote: `LOTE-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
      clasificacion_pedido: faker.helpers.arrayElement(CLASIFICACIONES),
      rack_slot: rackSlot,
      // Solo el 50% de las órdenes tienen técnica de impresión asignada
      tecnica_impresion: faker.datatype.boolean(0.5)
        ? faker.helpers.arrayElement(TECNICAS)
        : null,
      validacion_arte: generarValidacionArte(estatus, fechaOtb ?? fechaRecibo),
      fin_bordado_estimado: finBordadoEstimado,
      fecha_entrega_deshebrado: fechaEntregaDeshebrado,
      articulos: generarArticulos(faker.number.int({ min: 1, max: 4 })),
      historial_estatus: generarHistorial(estatus, fechaRecibo),
      ponchados: generarPonchados(faker.helpers.arrayElement(CLASIFICACIONES), fechaRecibo, estatus),
      observaciones: faker.datatype.boolean(0.4)
        ? faker.helpers.arrayElement([
            'Entrega urgente, cliente prioritario.',
            'Requiere verificación de muestra antes de producción.',
            'Parcialidad acordada con el cliente.',
            'Prendas con diseño especial, confirmar con muestra aprobada.',
            'Segunda corrida del mismo diseño.',
          ])
        : '',
      created_at: faker.date.between({ from: INICIO, to: new Date(fechaRecibo) }).toISOString(),
    };
  }
);
