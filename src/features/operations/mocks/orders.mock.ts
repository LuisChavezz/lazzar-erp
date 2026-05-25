import { faker } from '@faker-js/faker';
import type {
  OrderControl,
  OrderControlItem,
  OrderControlStatus,
} from '../types/order-control.types';

// Semilla fija para datos deterministicos
faker.seed(2025);

const PRODUCTOS_CATALOGO = [
  { id: 1, nombre: 'Playera Polo Piqué Bordada', unidad: 'PZA' },
  { id: 2, nombre: 'Chamarra Softshell Ejecutiva', unidad: 'PZA' },
  { id: 3, nombre: 'Pantalón Cargo Industrial', unidad: 'PZA' },
  { id: 4, nombre: 'Sudadera con Capucha Fleece', unidad: 'PZA' },
  { id: 5, nombre: 'Chaleco Reflectante Alta Visibilidad', unidad: 'PZA' },
  { id: 6, nombre: 'Uniforme Operativo Completo', unidad: 'JGO' },
  { id: 7, nombre: 'Camiseta Técnica Dry-Fit', unidad: 'PZA' },
  { id: 8, nombre: 'Gorra Premium Bordada', unidad: 'PZA' },
  { id: 9, nombre: 'Overol Industrial Denim', unidad: 'PZA' },
  { id: 10, nombre: 'Bata Médica Antifluido', unidad: 'PZA' },
  { id: 11, nombre: 'Camisa Manga Larga Corporativa', unidad: 'PZA' },
  { id: 12, nombre: 'Shorts Deportivo Técnico', unidad: 'PZA' },
];

const CLIENTES = [
  { id: 1, nombre: 'Carlos Mendoza', razon_social: 'Constructora Norteña S.A. de C.V.' },
  { id: 2, nombre: 'María García', razon_social: 'Hospital Regional del Norte S.A.' },
  { id: 3, nombre: 'Jorge Hernández', razon_social: 'Plásticos del Pacífico S.A. de C.V.' },
  { id: 4, nombre: 'Ana Ruiz', razon_social: 'Transportes Federales SAPI de C.V.' },
  { id: 5, nombre: 'Luis Torres', razon_social: 'Grupo Textil Monterrey S.A.' },
  { id: 6, nombre: 'Sofía Martínez', razon_social: 'Laboratorios Biosalud S.A. de C.V.' },
  { id: 7, nombre: 'Pedro López', razon_social: 'Minería Norteña S.A. de C.V.' },
  { id: 8, nombre: 'Carmen Flores', razon_social: 'Colegio Americano del Norte A.C.' },
  { id: 9, nombre: 'Roberto Sánchez', razon_social: 'Industrias Mecánicas del Centro' },
  { id: 10, nombre: 'Laura Vega', razon_social: 'Servicios Logísticos Express S.A.' },
];

function generateItems(): OrderControlItem[] {
  const count = faker.number.int({ min: 2, max: 5 });
  const productos = faker.helpers.arrayElements(PRODUCTOS_CATALOGO, count);

  return productos.map((p) => {
    const cantidadSolicitada = faker.number.int({ min: 10, max: 80 });

    return {
      productoId: p.id,
      descripcion: p.nombre,
      unidad: p.unidad,
      cantidadSolicitada,
    };
  });
}

function generateOrder(seq: number): OrderControl {
  const cliente = faker.helpers.arrayElement(CLIENTES);
  const items = generateItems();
  const piezas = items.reduce((s, i) => s + i.cantidadSolicitada, 0);
  const precioUnitario = faker.number.float({ min: 150, max: 850, fractionDigits: 2 });
  const granTotal = (piezas * precioUnitario).toFixed(2);
  const createdAt = faker.date.between({ from: '2025-02-01', to: '2025-05-10' }).toISOString();
  const folio = `ORD-${String(2400 + seq).padStart(4, '0')}`;
  const controlStatus: OrderControlStatus =
    seq <= 2
      ? 'liberado'
      : seq <= 4
        ? 'listo_para_liberar'
        : 'confirmado';

  const ocRaw = faker.helpers.maybe(
    () => `OC-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
    { probability: 0.65 },
  );

  return {
    id: seq,
    folio,
    estatus: 1,
    estatus_label: 'Autorizada',
    cliente: cliente.id,
    cliente_nombre: cliente.nombre,
    cliente_razon_social: cliente.razon_social,
    oc: ocRaw ?? '',
    uso_cfdi: 'G03',
    gran_total: granTotal,
    importe_sin_iva: Number((Number(granTotal) / 1.16).toFixed(2)),
    piezas,
    autorizada_at: createdAt,
    cambios_solicitados_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    items,
    controlStatus,
    deliveryDate: null,
  };
}

function buildMockOrders(): OrderControl[] {
  // distribución: 2 liberado + 2 listo_para_liberar + 26 confirmado = 30
  const total = 30;
  const orders: OrderControl[] = [];

  for (let i = 1; i <= total; i++) {
    orders.push(generateOrder(i));
  }

  return faker.helpers.shuffle(orders);
}

export const MOCK_ORDERS: OrderControl[] = buildMockOrders();
