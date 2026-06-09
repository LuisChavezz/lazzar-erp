import { faker } from "@faker-js/faker";
import type {
  LocationDashboardData,
  LocationSlot,
  LocationAisle,
  LocationZone,
  StoredSku,
} from "../types/location-dashboard.types";

// Semilla fija para datos determinísticos entre renders
faker.seed(2025);

// ─── Catálogos base ───────────────────────────────────────────────────────────

const MATERIALES_ROLLOS = [
  "Rollo Denim 14oz",
  "Rollo Denim 12oz",
  "Rollo Lona 18oz",
  "Rollo Gabardina 10oz",
  "Rollo Sarga 11oz",
  "Rollo Drill 9oz",
];

const MATERIALES_AVIOS = [
  "Botón Metálico 24L",
  "Cierre YKK #5",
  "Hilo Poliéster Tex 40",
  "Etiqueta Térmica",
  "Remache 9mm",
  "Broche Plástico",
  "Cinta Reflejante 5cm",
  "Elástico 25mm",
];

const COLORES_DENIM = [
  "Indigo Dark",
  "Indigo Medium",
  "Raw Finish",
  "Black Overdye",
  "Stone Wash",
];

const UNIDADES_ROLLO = ["mts", "yds"];
const UNIDADES_AVIO = ["PZA", "MLL", "MT", "ROL"];

// ─── Generadores ──────────────────────────────────────────────────────────────

function generarSkuRollo(indice: number): StoredSku {
  const color = faker.helpers.arrayElement(COLORES_DENIM);
  return {
    sku: `DEN-${String(indice).padStart(3, "0")}-${faker.string.alpha({ length: 3, casing: "upper" })}`,
    descripcion: `${faker.number.float({ min: 10, max: 150, fractionDigits: 1 })} ${faker.helpers.arrayElement(UNIDADES_ROLLO)} | ${color}`,
    cantidad: faker.number.int({ min: 1, max: 3 }),
    unidad: "Rollo",
    color,
  };
}

function generarSkuAvio(indice: number): StoredSku {
  const material = faker.helpers.arrayElement(MATERIALES_AVIOS);
  return {
    sku: `AVI-${String(indice).padStart(3, "0")}-${faker.string.alpha({ length: 2, casing: "upper" })}`,
    descripcion: material,
    cantidad: faker.number.int({ min: 500, max: 5000 }),
    unidad: faker.helpers.arrayElement(UNIDADES_AVIO),
  };
}

function generarUbicacionRollo(
  id: string,
  nombre: string,
): LocationSlot {
  const ocupacion = faker.number.int({ min: 0, max: 100 });
  const estatus: LocationSlot["estatus"] =
    ocupacion >= 95 ? "lleno" : ocupacion >= 70 ? "critico" : "disponible";

  const skusCount = estatus === "disponible" ? 0 : faker.number.int({ min: 1, max: 4 });
  const items: StoredSku[] = Array.from({ length: skusCount }, (_, i) =>
    generarSkuRollo((parseInt(id.replace(/\D/g, ""), 10) || 1) * 10 + i),
  );

  const horasAtras = faker.number.int({ min: 0, max: 72 });
  const ultimoMovimiento =
    horasAtras === 0
      ? "Ahora"
      : horasAtras < 1
        ? `Hace ${faker.number.int({ min: 5, max: 55 })}min`
        : `Hace ${horasAtras}h`;

  return {
    id,
    nombre,
    estatus,
    ocupacionPorcentaje: ocupacion > 0 ? ocupacion : faker.number.int({ min: 5, max: 30 }),
    tipoMaterial: items.length > 0 ? faker.helpers.arrayElement(MATERIALES_ROLLOS) : undefined,
    skusCount,
    items,
    ultimoMovimiento,
  };
}

function generarUbicacionAvio(
  id: string,
  nombre: string,
): LocationSlot {
  const ocupacion = faker.number.int({ min: 0, max: 100 });
  const estatus: LocationSlot["estatus"] =
    ocupacion >= 95 ? "lleno" : ocupacion >= 70 ? "critico" : "disponible";

  const skusCount = estatus === "disponible" ? 0 : faker.number.int({ min: 2, max: 8 });
  const items: StoredSku[] = Array.from({ length: skusCount }, (_, i) =>
    generarSkuAvio((parseInt(id.replace(/\D/g, ""), 10) || 1) * 10 + i),
  );

  const horasAtras = faker.number.int({ min: 0, max: 48 });
  const ultimoMovimiento =
    horasAtras === 0
      ? "Ahora"
      : horasAtras < 1
        ? `Hace ${faker.number.int({ min: 5, max: 55 })}min`
        : `Hace ${horasAtras}h`;

  return {
    id,
    nombre,
    estatus,
    ocupacionPorcentaje: ocupacion > 0 ? ocupacion : faker.number.int({ min: 10, max: 50 }),
    tipoMaterial: items.length > 0 ? faker.helpers.arrayElement(MATERIALES_AVIOS) : undefined,
    skusCount,
    items,
    ultimoMovimiento,
  };
}

function generarPasillosRollos(zonaId: string): LocationAisle[] {
  const cantidad = faker.number.int({ min: 3, max: 5 });
  return Array.from({ length: cantidad }, (_, ai) => {
    const nombre = `PASILLO ${String(ai + 1).padStart(2, "0")}-A`;
    const rackCount = faker.number.int({ min: 5, max: 12 });
    const ubicaciones: LocationSlot[] = Array.from({ length: rackCount }, (_, ri) =>
      generarUbicacionRollo(
        `${zonaId}-${nombre}-R${String(ri + 1).padStart(2, "0")}`,
        `Rack ${String.fromCharCode(65 + ri)}-${String(ri + 1).padStart(2, "0")}`,
      ),
    );

    const ocupacionPromedio = Math.round(
      ubicaciones.reduce((s, u) => s + u.ocupacionPorcentaje, 0) / ubicaciones.length,
    );

    return {
      id: `${zonaId}-${nombre}`,
      nombre,
      zonaId,
      ubicaciones,
      ocupacionPorcentaje: ocupacionPromedio,
    };
  });
}

function generarBloquesAvios(zonaId: string): LocationAisle[] {
  const cantidad = faker.number.int({ min: 4, max: 5 });
  return Array.from({ length: cantidad }, (_, bi) => {
    const nombre = `BLOQUE B${bi + 1}`;
    const slotCount = faker.number.int({ min: 4, max: 8 });
    const ubicaciones: LocationSlot[] = Array.from({ length: slotCount }, (_, si) =>
      generarUbicacionAvio(
        `${zonaId}-${nombre}-E${String(si + 1).padStart(2, "0")}`,
        `Estante ${String.fromCharCode(65 + si)}`,
      ),
    );

    const ocupacionPromedio = Math.round(
      ubicaciones.reduce((s, u) => s + u.ocupacionPorcentaje, 0) / ubicaciones.length,
    );

    return {
      id: `${zonaId}-${nombre}`,
      nombre,
      zonaId,
      ubicaciones,
      ocupacionPorcentaje: ocupacionPromedio,
    };
  });
}

function calcularStats(zonas: LocationZone[]): LocationDashboardData["stats"] {
  const todasUbicaciones = zonas.flatMap((z) =>
    z.pasillos.flatMap((p) => p.ubicaciones),
  );

  const ocupacionTotal = Math.round(
    todasUbicaciones.reduce((s, u) => s + u.ocupacionPorcentaje, 0) /
      Math.max(todasUbicaciones.length, 1),
  );

  const rollos = zonas
    .filter((z) => z.tipo === "rollos")
    .flatMap((z) => z.pasillos.flatMap((p) => p.ubicaciones));
  const avios = zonas
    .filter((z) => z.tipo === "avios")
    .flatMap((z) => z.pasillos.flatMap((p) => p.ubicaciones));

  const ocupacionRollos = Math.round(
    rollos.length > 0
      ? rollos.reduce((s, u) => s + u.ocupacionPorcentaje, 0) / rollos.length
      : 0,
  );

  const ocupacionAvios = Math.round(
    avios.length > 0
      ? avios.reduce((s, u) => s + u.ocupacionPorcentaje, 0) / avios.length
      : 0,
  );

  return {
    capacidadTotalPorcentaje: ocupacionTotal,
    ocupacionRollosPorcentaje: ocupacionRollos,
    ocupacionAviosPorcentaje: ocupacionAvios,
    totalUbicaciones: todasUbicaciones.length,
    ubicacionesDisponibles: todasUbicaciones.filter((u) => u.estatus === "disponible").length,
    ubicacionesCriticas: todasUbicaciones.filter((u) => u.estatus === "critico").length,
    ubicacionesLlenas: todasUbicaciones.filter((u) => u.estatus === "lleno").length,
  };
}

// ─── Constructor principal ────────────────────────────────────────────────────

export function generarLocationDashboardData(): LocationDashboardData {
  const zonaRollos: LocationZone = {
    id: "zona-a",
    nombre: "Zona A: Racks de Rollos",
    tipo: "rollos",
    descripcion: "Almacenamiento de rollos de tela en racks verticales.",
    pasillos: generarPasillosRollos("zona-a"),
    ocupacionPorcentaje: 0, // se recalcula abajo
  };

  const zonaAvios: LocationZone = {
    id: "zona-b",
    nombre: "Zona B: Estantería de Avíos",
    tipo: "avios",
    descripcion: "Estantería para avíos, insumos y accesorios de confección.",
    pasillos: generarBloquesAvios("zona-b"),
    ocupacionPorcentaje: 0,
  };

  // Recalcular ocupación por zona
  zonaRollos.ocupacionPorcentaje = Math.round(
    zonaRollos.pasillos.reduce((s, p) => s + p.ocupacionPorcentaje, 0) /
      Math.max(zonaRollos.pasillos.length, 1),
  );
  zonaAvios.ocupacionPorcentaje = Math.round(
    zonaAvios.pasillos.reduce((s, p) => s + p.ocupacionPorcentaje, 0) /
      Math.max(zonaAvios.pasillos.length, 1),
  );

  const zonas: LocationZone[] = [zonaRollos, zonaAvios];

  return {
    stats: calcularStats(zonas),
    zonas,
  };
}
