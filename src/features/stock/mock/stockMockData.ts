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
  "Botones",
  "Cierres",
  "Hilos",
  "Elásticos",
  "Entretelas",
  "Ribetes",
  "Forros",
  "Accesorios",
] as const;

export type StockCategory = (typeof CATEGORIES)[number];

// ─── Prefijos SKU por categoría ───────────────────────────────────────────────

const SKU_PREFIX: Record<StockCategory, string> = {
  Telas:      "TEL",
  Botones:    "BOT",
  Cierres:    "CIE",
  Hilos:      "HIL",
  Elásticos:  "ELA",
  Entretelas: "ENT",
  Ribetes:    "RIB",
  Forros:     "FOR",
  Accesorios: "ACC",
};

// ─── Productos textiles ───────────────────────────────────────────────────────

const TEXTILE_PRODUCTS: Array<{
  nombre: string;
  categoria: StockCategory;
  unidad: string;
  max: number;
}> = [
  { nombre: "Tela Denim 12oz Índigo",           categoria: "Telas",      unidad: "m",      max: 2000  },
  { nombre: "Tela Popelina Blanca 45\"",         categoria: "Telas",      unidad: "m",      max: 1500  },
  { nombre: "Tela Jersey Gris Melange",          categoria: "Telas",      unidad: "m",      max: 1800  },
  { nombre: "Tela Terciopelo Negro 150cm",       categoria: "Telas",      unidad: "m",      max: 800   },
  { nombre: "Tela Lino Natural 140cm",           categoria: "Telas",      unidad: "m",      max: 1200  },
  { nombre: "Tela Gabardina Beige 60\"",         categoria: "Telas",      unidad: "m",      max: 1600  },
  { nombre: "Botones Concha 20mm Nácar",         categoria: "Botones",    unidad: "pzas",   max: 5000  },
  { nombre: "Botones Metálicos Dorados 18mm",    categoria: "Botones",    unidad: "pzas",   max: 8000  },
  { nombre: "Botones Resina Negros 15mm",        categoria: "Botones",    unidad: "pzas",   max: 12000 },
  { nombre: "Cierre YKK Invisible 20cm",         categoria: "Cierres",    unidad: "pzas",   max: 3000  },
  { nombre: "Cierre Metálico #5 Dorado",         categoria: "Cierres",    unidad: "pzas",   max: 2500  },
  { nombre: "Cierre Plástico #3 Negro",          categoria: "Cierres",    unidad: "pzas",   max: 4000  },
  { nombre: "Hilo Poliéster Blanco 100g",        categoria: "Hilos",      unidad: "rollos", max: 500   },
  { nombre: "Hilo Overlock Crema 5000m",         categoria: "Hilos",      unidad: "rollos", max: 400   },
  { nombre: "Hilo Metálico Dorado 200m",         categoria: "Hilos",      unidad: "rollos", max: 200   },
  { nombre: "Elástico Tejido 2.5cm Blanco",      categoria: "Elásticos",  unidad: "m",      max: 3000  },
  { nombre: "Elástico Liso 1cm Negro",           categoria: "Elásticos",  unidad: "m",      max: 5000  },
  { nombre: "Entretela Fusionable Media 90cm",   categoria: "Entretelas", unidad: "m",      max: 1000  },
  { nombre: "Entretela Rígida Blanca 100cm",     categoria: "Entretelas", unidad: "m",      max: 800   },
  { nombre: "Ribete Satinado Negro 2cm",         categoria: "Ribetes",    unidad: "m",      max: 2000  },
  { nombre: "Encaje Algodón Blanco 3cm",         categoria: "Ribetes",    unidad: "m",      max: 1500  },
  { nombre: "Forro Acetate Negro 140cm",         categoria: "Forros",     unidad: "m",      max: 1200  },
  { nombre: "Forro Viscosa Crema 140cm",         categoria: "Forros",     unidad: "m",      max: 1000  },
  { nombre: "Remache Dorado #8 Industrial",      categoria: "Accesorios", unidad: "pzas",   max: 20000 },
  { nombre: "Velcro Adhesivo Blanco 2cm",        categoria: "Accesorios", unidad: "m",      max: 2000  },
  { nombre: "Cinta Sesgada Blanca 1.5cm",        categoria: "Accesorios", unidad: "m",      max: 3000  },
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
