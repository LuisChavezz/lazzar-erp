import { faker } from '@faker-js/faker';

// Categorías de materias primas
export type CategoriaMaterial = 'telas' | 'hilos' | 'botones_cierres' | 'accesorios';

export interface MateriaPrima {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaMaterial;
  unidad: string;
  precio_unitario: number;
  stock_disponible: number;
}

// Semilla fija para datos deterministas
faker.seed(3001);

// Catálogo base de materias primas para fabricación textil/uniformes
const CATALOGO_BASE: Omit<MateriaPrima, 'id' | 'stock_disponible'>[] = [
  // ── Telas ─────────────────────────────────────────────────────────────────
  {
    clave: 'TEL-001',
    nombre: 'Tela Polar Fleece 300g',
    descripcion: 'Polar suave anti-pilling para sudaderas y chaquetas',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 85.0,
  },
  {
    clave: 'TEL-002',
    nombre: 'Tela Piqué Premium',
    descripcion: 'Piqué 100% algodón peinado para playeras polo',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 62.5,
  },
  {
    clave: 'TEL-003',
    nombre: 'Denim 14oz Industrial',
    descripcion: 'Mezclilla rígida para overoles y pantalones industriales',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 95.0,
  },
  {
    clave: 'TEL-004',
    nombre: 'Softshell 3 Capas',
    descripcion: 'Membrana transpirable cortaviento para chamarras ejecutivas',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 148.0,
  },
  {
    clave: 'TEL-005',
    nombre: 'Popelina 100% Algodón',
    descripcion: 'Tejido liso fino para camisas y uniformes corporativos',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 54.0,
  },
  {
    clave: 'TEL-006',
    nombre: 'Spandex Microperforado',
    descripcion: 'Alto rendimiento elástico para shorts y ropa técnica',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 72.0,
  },
  {
    clave: 'TEL-007',
    nombre: 'Microfibra Dry-Fit',
    descripcion: 'Tela técnica de secado rápido para camisetas deportivas',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 68.0,
  },
  {
    clave: 'TEL-008',
    nombre: 'Gabardina Antifluido',
    descripcion: 'Gabardina tratada para batas médicas y antiderrames',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 78.5,
  },
  {
    clave: 'TEL-009',
    nombre: 'Franjas Reflectantes 50mm',
    descripcion: 'Cinta reflectante para chalecos de alta visibilidad',
    categoria: 'telas',
    unidad: 'MT',
    precio_unitario: 42.0,
  },
  // ── Hilos ─────────────────────────────────────────────────────────────────
  {
    clave: 'HIL-001',
    nombre: 'Hilo Poliéster 40/2 Negro',
    descripcion: 'Hilo de costura resistente para prendas industriales',
    categoria: 'hilos',
    unidad: 'CON',
    precio_unitario: 18.5,
  },
  {
    clave: 'HIL-002',
    nombre: 'Hilo Algodón Mercerizado',
    descripcion: 'Hilo fino brillante para bordado y acabados decorativos',
    categoria: 'hilos',
    unidad: 'CON',
    precio_unitario: 22.0,
  },
  {
    clave: 'HIL-003',
    nombre: 'Hilo Nylon Alta Resistencia',
    descripcion: 'Para costuras en puntos de estrés y carga máxima',
    categoria: 'hilos',
    unidad: 'CON',
    precio_unitario: 28.0,
  },
  {
    clave: 'HIL-004',
    nombre: 'Hilo Overlock Poliéster',
    descripcion: 'Cono 3000m para máquina overlock, varios colores',
    categoria: 'hilos',
    unidad: 'CON',
    precio_unitario: 35.0,
  },
  // ── Botones y cierres ─────────────────────────────────────────────────────
  {
    clave: 'BOT-001',
    nombre: 'Botón Nácar 4 Hoyos 16L',
    descripcion: 'Botón imitación nácar para camisas ejecutivas',
    categoria: 'botones_cierres',
    unidad: 'GRO',
    precio_unitario: 95.0,
  },
  {
    clave: 'BOT-002',
    nombre: 'Botón Metálico Dorado 20mm',
    descripcion: 'Botón prensado metálico dorado mate para chamarras',
    categoria: 'botones_cierres',
    unidad: 'PZA',
    precio_unitario: 3.8,
  },
  {
    clave: 'BOT-003',
    nombre: 'Cierre YKK Nylon 50cm',
    descripcion: 'Cierre invisible de alta calidad, disponible en varios colores',
    categoria: 'botones_cierres',
    unidad: 'PZA',
    precio_unitario: 8.5,
  },
  {
    clave: 'BOT-004',
    nombre: 'Cierre Separable 60cm',
    descripcion: 'Para chamarras y chalecos, cursor metálico antioxidante',
    categoria: 'botones_cierres',
    unidad: 'PZA',
    precio_unitario: 14.0,
  },
  {
    clave: 'BOT-005',
    nombre: 'Velcro Autoadherible 2cm',
    descripcion: 'Cinta velcro macho-hembra en rollo 25m',
    categoria: 'botones_cierres',
    unidad: 'ROL',
    precio_unitario: 165.0,
  },
  {
    clave: 'BOT-006',
    nombre: 'Broche de Presión Metálico',
    descripcion: 'Broche tipo snap 12mm niquelado para cierres rápidos',
    categoria: 'botones_cierres',
    unidad: 'GRO',
    precio_unitario: 78.0,
  },
  // ── Accesorios ────────────────────────────────────────────────────────────
  {
    clave: 'ACC-001',
    nombre: 'Etiqueta Tejida Personalizada',
    descripcion: 'Etiqueta de marca en telar jacquard a color',
    categoria: 'accesorios',
    unidad: 'MLL',
    precio_unitario: 420.0,
  },
  {
    clave: 'ACC-002',
    nombre: 'Elástico Plano 2.5cm',
    descripcion: 'Elástico tejido para cinturillas y puños',
    categoria: 'accesorios',
    unidad: 'MT',
    precio_unitario: 4.5,
  },
  {
    clave: 'ACC-003',
    nombre: 'Hombrera Foam 10mm',
    descripcion: 'Hombrera espuma recubierta para sacos y uniformes formales',
    categoria: 'accesorios',
    unidad: 'PAR',
    precio_unitario: 9.0,
  },
  {
    clave: 'ACC-004',
    nombre: 'Cinta Ribete Poliéster 2cm',
    descripcion: 'Cinta al bies para acabados y ribeteado de costuras',
    categoria: 'accesorios',
    unidad: 'ROL',
    precio_unitario: 55.0,
  },
  {
    clave: 'ACC-005',
    nombre: 'Entretela Termofusible',
    descripcion: 'Entretela no tejida para refuerzo de pecheras y solapas',
    categoria: 'accesorios',
    unidad: 'MT',
    precio_unitario: 22.0,
  },
];

// Filtros de categoría para el selector
export const CATEGORIAS_MATERIALES: {
  key: CategoriaMaterial | 'todas';
  label: string;
}[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'telas', label: 'Telas' },
  { key: 'hilos', label: 'Hilos' },
  { key: 'botones_cierres', label: 'Botones y Cierres' },
  { key: 'accesorios', label: 'Accesorios' },
];

// Genera stock disponible aleatorio para cada material
export const MOCK_RAW_MATERIALS: MateriaPrima[] = CATALOGO_BASE.map((item, idx) => ({
  ...item,
  id: idx + 1,
  stock_disponible: faker.number.int({ min: 20, max: 600 }),
}));
