/**
 * Datos ficticios de existencias para manufactura textil.
 * Generados con Faker — solo para propósitos de demostración.
 */
import { faker } from "@faker-js/faker";

// Semilla fija para resultados reproducibles
faker.seed(42);

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StockStatus = "full" | "ok" | "low" | "critical";

export type WarehouseColorKey = "sky" | "violet" | "emerald" | "rose";

export interface MockWarehouse {
  id: string;
  nombre: string;
  ciudad: string;
  colorKey: WarehouseColorKey;
}

export interface MockStockItem {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  almacen: MockWarehouse;
  ubicacion: string;
  unidad: string;
  capacidadMaxima: number;
  cantidadTotal: number;
  cantidadApartada: number;
  status: StockStatus;
}

// ─── Almacenes ficticios ───────────────────────────────────────────────────────

export const WAREHOUSES: MockWarehouse[] = [
  { id: "WH-01", nombre: "Almacén Central",   ciudad: "CDMX Norte",  colorKey: "sky"     },
  { id: "WH-02", nombre: "La Textilería",      ciudad: "Edo. Méx",    colorKey: "violet"  },
  { id: "WH-03", nombre: "Taller Hidalgo",     ciudad: "Hidalgo",     colorKey: "emerald" },
  { id: "WH-04", nombre: "La Costura",         ciudad: "Puebla",      colorKey: "rose"    },
];

// ─── Categorías ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Telas",
  "Avíos",
  "Terminado",
] as const;

export type StockCategory = (typeof CATEGORIES)[number];

// ─── Prefijos SKU por categoría ───────────────────────────────────────────────

const SKU_PREFIX: Record<StockCategory, string> = {
  Telas:     "TEL",
  Avíos:     "AVI",
  Terminado: "TER",
};

// ─── Productos textiles ───────────────────────────────────────────────────────

const TEXTILE_PRODUCTS: Array<{
  nombre: string;
  categoria: StockCategory;
  unidad: string;
  max: number;
}> = [
  // ── Telas ─────────────────────────────────────────────────────────────────
  { nombre: "Tela Oxford Azul",                 categoria: "Telas",     unidad: "m",      max: 2000  },
  { nombre: "Tela Denim 12oz Índigo",           categoria: "Telas",     unidad: "m",      max: 1800  },
  { nombre: "Tela Popelina Blanca 45\"",         categoria: "Telas",     unidad: "m",      max: 1500  },
  { nombre: "Tela Jersey Gris Melange",          categoria: "Telas",     unidad: "m",      max: 1600  },
  { nombre: "Tela Terciopelo Negro 150cm",       categoria: "Telas",     unidad: "m",      max: 900   },
  { nombre: "Tela Lino Natural 140cm",           categoria: "Telas",     unidad: "m",      max: 1200  },
  { nombre: "Tela Gabardina Beige 60\"",         categoria: "Telas",     unidad: "m",      max: 1400  },
  { nombre: "Tela Sarga Algodón Verde",          categoria: "Telas",     unidad: "m",      max: 1100  },
  // ── Avíos (insumos y accesorios) ──────────────────────────────────────────
  { nombre: "Cierre YKK Invisible 20cm",        categoria: "Avíos",     unidad: "pzas",   max: 3000  },
  { nombre: "Botones Concha 20mm Nácar",        categoria: "Avíos",     unidad: "pzas",   max: 5000  },
  { nombre: "Hilo Poliéster Blanco 100g",       categoria: "Avíos",     unidad: "rollos", max: 500   },
  { nombre: "Elástico Tejido 2.5cm Blanco",     categoria: "Avíos",     unidad: "m",      max: 3000  },
  { nombre: "Entretela Fusionable Media 90cm",  categoria: "Avíos",     unidad: "m",      max: 1000  },
  { nombre: "Ribete Satinado Negro 2cm",        categoria: "Avíos",     unidad: "m",      max: 2000  },
  { nombre: "Remache Dorado #8 Industrial",     categoria: "Avíos",     unidad: "pzas",   max: 20000 },
  { nombre: "Velcro Adhesivo Blanco 2cm",       categoria: "Avíos",     unidad: "m",      max: 2000  },
  { nombre: "Cinta Sesgada Blanca 1.5cm",       categoria: "Avíos",     unidad: "m",      max: 2500  },
  // ── Terminado (productos confeccionados) ──────────────────────────────────
  { nombre: "Camisa Oxford Azul M",             categoria: "Terminado", unidad: "pzas",   max: 300   },
  { nombre: "Pantalón Denim Recto 34",          categoria: "Terminado", unidad: "pzas",   max: 250   },
  { nombre: "Vestido Jersey Gris Talla Única",  categoria: "Terminado", unidad: "pzas",   max: 150   },
  { nombre: "Chaqueta Terciopelo Negra M",      categoria: "Terminado", unidad: "pzas",   max: 120   },
  { nombre: "Blusa Lino Natural Talla Única",   categoria: "Terminado", unidad: "pzas",   max: 200   },
  { nombre: "Gabardina Beige 60\"",             categoria: "Terminado", unidad: "pzas",   max: 180   },
  { nombre: "Falda Sarga Verde M",              categoria: "Terminado", unidad: "pzas",   max: 160   },
  { nombre: "Camiseta Algodón Blanca L",        categoria: "Terminado", unidad: "pzas",   max: 400   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(total: number, max: number): StockStatus {
  const pct = total / max;
  if (pct > 0.6)  return "full";
  if (pct > 0.35) return "ok";
  if (pct > 0.15) return "low";
  return "critical";
}

function buildSku(categoria: StockCategory, index: number): string {
  return `${SKU_PREFIX[categoria]}-${String(index + 1).padStart(3, "0")}`;
}

function buildUbicacion(): string {
  const rack   = `Rack ${String.fromCharCode(65 + faker.number.int({ min: 0, max: 7 }))}`;
  const nivel  = faker.number.int({ min: 1, max: 5 });
  const pos    = String(faker.number.int({ min: 1, max: 20 })).padStart(2, "0");
  return `${rack} · Nivel ${nivel} · Pos ${pos}`;
}

// ─── Generación de datos ──────────────────────────────────────────────────────

export const MOCK_STOCK_ITEMS: MockStockItem[] = TEXTILE_PRODUCTS.map((p, i) => {
  const cantidadTotal = faker.number.int({
    min: Math.floor(p.max * 0.05),
    max: p.max,
  });

  // ~70% de artículos tienen cantidad apartada
  const tieneApartado = faker.datatype.boolean({ probability: 0.7 });
  const cantidadApartada = tieneApartado
    ? faker.number.int({ min: 1, max: Math.floor(cantidadTotal * 0.35) })
    : 0;

  return {
    id:               faker.string.uuid(),
    sku:              buildSku(p.categoria, i),
    nombre:           p.nombre,
    categoria:        p.categoria,
    almacen:          faker.helpers.arrayElement(WAREHOUSES),
    ubicacion:        buildUbicacion(),
    unidad:           p.unidad,
    capacidadMaxima:  p.max,
    cantidadTotal,
    cantidadApartada,
    status:           getStatus(cantidadTotal, p.max),
  };
});
