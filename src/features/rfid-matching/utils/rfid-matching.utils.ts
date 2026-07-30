// Funciones PURAS del encuadre: resolución de un tag contra las líneas
// esperadas, recálculo de los derivados (leído / diferencia / totales) y KPIs
// del listado. Sin estado ni React — todo el estado mutable vive en
// `mocks/rfid-matches.mock.ts`, que se apoya en estas funciones para no tener
// una segunda derivación que pueda divergir de la que pinta el diálogo.

import type {
  RfidMatch,
  RfidMatchProductLine,
  RfidMatchReading,
} from "../interfaces/rfid-matching.interface";

/**
 * Variantes de búsqueda de un tag, réplica de `_lookup_tokens` en
 * `QA/views.py`: el valor crudo, su versión en mayúsculas y —si el tag viene
 * compuesto por separadores— cada parte, más el valor a la derecha de un `=` o
 * un `:`.
 *
 * Existe porque un tag real rara vez es solo el SKU: el lector suele entregar
 * algo como `EPC:30340C...|SKU=AMB-93E0-G`, y de ahí hay que extraer el token
 * que sí está en el catálogo. La comparación se hace SIEMPRE en mayúsculas
 * (todos los códigos del catálogo lo son), que es el equivalente en la maqueta
 * al `filter(sku__in=tokens)` contra una columna ya normalizada.
 */
export const lookupTokens = (rawTag: string): string[] => {
  const raw = rawTag.trim();
  if (raw === "") return [];

  const tokens = new Set<string>([raw.toUpperCase()]);

  for (const separator of ["|", ",", ";"]) {
    if (!raw.includes(separator)) continue;
    for (const part of raw.split(separator)) {
      const value = part.trim();
      if (value === "") continue;
      tokens.add(value.toUpperCase());
      // `split(sep, 1)` de Python: solo el PRIMER separador, el resto del
      // valor se conserva íntegro (un EPC puede contener más `:`).
      const equalsAt = value.indexOf("=");
      if (equalsAt !== -1) tokens.add(value.slice(equalsAt + 1).trim().toUpperCase());
      const colonAt = value.indexOf(":");
      if (colonAt !== -1) tokens.add(value.slice(colonAt + 1).trim().toUpperCase());
    }
  }

  return [...tokens].filter((token) => token !== "");
};

/**
 * Busca la línea esperada a la que corresponde un tag, con la misma prelación
 * que `_resolver_tag_recepcion`: primero por SKU de variante (el caso normal
 * de un tag físico) y, si no coincide, por `codigo` o `cod_proscai` del
 * producto. Devuelve `null` cuando el tag no pertenece a esta orden — esas
 * lecturas se guardan igual, pero SIN asignar.
 */
export const resolveLineaForTag = (
  lineas: RfidMatchProductLine[],
  rawTag: string,
): RfidMatchProductLine | null => {
  const tokens = lookupTokens(rawTag);
  if (tokens.length === 0) return null;

  const bySku = lineas.find((linea) =>
    linea.skus.some((sku) => tokens.includes(sku.toUpperCase())),
  );
  if (bySku) return bySku;

  return (
    lineas.find(
      (linea) =>
        tokens.includes(linea.codigo.toUpperCase()) ||
        tokens.includes(linea.cod_proscai.toUpperCase()),
    ) ?? null
  );
};

/**
 * DERIVACIÓN ÚNICA del encuadre. Recalcula, a partir de `lineas` (esperado) y
 * `lecturas`, el `leido`/`diferencia` de cada línea y los tres totales del
 * encabezado. Si cambia la definición de alguno de esos números, cambia aquí.
 *
 * `leido_total` cuenta TODAS las lecturas —asignadas y sin asignar—, igual que
 * `total_leido` en `_build_recepcion_summary`: el operador leyó esas piezas,
 * aunque el sistema no supiera a qué renglón pegarlas. `sin_asignar_total` es
 * el subconjunto no asignado, así que un tag desconocido suma en AMBOS; lo que
 * no toca es el `leido` de ninguna línea del desglose.
 */
export const recomputeRfidMatch = (match: RfidMatch): RfidMatch => {
  const leidoPorLinea = new Map<number, number>();
  let leidoTotal = 0;
  let sinAsignarTotal = 0;

  for (const lectura of match.lecturas) {
    leidoTotal += lectura.cantidad;
    if (lectura.linea_id === null) {
      sinAsignarTotal += lectura.cantidad;
      continue;
    }
    leidoPorLinea.set(
      lectura.linea_id,
      (leidoPorLinea.get(lectura.linea_id) ?? 0) + lectura.cantidad,
    );
  }

  let esperadoTotal = 0;
  const lineas = match.lineas.map((linea) => {
    const leido = leidoPorLinea.get(linea.id) ?? 0;
    esperadoTotal += linea.esperado;
    return { ...linea, leido, diferencia: linea.esperado - leido };
  });

  return {
    ...match,
    lineas,
    esperado_total: esperadoTotal,
    leido_total: leidoTotal,
    sin_asignar_total: sinAsignarTotal,
  };
};

/**
 * ¿El conteo cuadra EXACTO? Todas las líneas en `diferencia === 0` y ningún
 * tag colgando sin asignar.
 *
 * Se evalúa POR LÍNEA y no contra `leido_total >= esperado_total`: el agregado
 * daría por cuadrado un encuadre en el que sobran piezas de un producto y
 * faltan de otro, que es justo la discrepancia que el encuadre existe para
 * detectar. Y `leido_total` incluye las lecturas sin asignar, así que bastaría
 * con escanear basura suficiente para "completarlo".
 *
 * EXIGE IGUALDAD, no `diferencia <= 0`: una línea leída de más (`diferencia
 * < 0`) es una discrepancia tan real como una faltante —la propia tabla de
 * desglose la resalta en rosa, "obliga a revisar el físico" (ver
 * `RfidMatchDetailDialog`)— así que no puede colar como "cuadrado". Ver
 * `unidadesSobrantes` para cuantificar ese excedente.
 *
 * OJO: esto NO es una condición para aceptar (ver `RfidMatchDetailDialog`) —
 * `aceptar_encuadre` en el backend no valida nada. Solo decide si la UI
 * presenta el encuadre como cuadrado o como aceptación con diferencia.
 */
export const isRfidMatchComplete = (match: RfidMatch): boolean =>
  match.lineas.length > 0 &&
  match.sin_asignar_total === 0 &&
  match.lineas.every((linea) => linea.diferencia === 0);

/** Piezas que aún faltan por leer (solo faltantes; los excedentes no restan). */
export const unidadesPendientes = (match: RfidMatch): number =>
  match.lineas.reduce((total, linea) => total + Math.max(0, linea.diferencia), 0);

/**
 * Piezas leídas DE MÁS en alguna línea (excedente), sumadas solo sobre las
 * líneas con `diferencia` negativa; las líneas cortas no restan aquí.
 * Complemento de `unidadesPendientes`: entre las dos cubren las dos formas en
 * que un encuadre puede no cuadrar exacto —falta algo, o sobra algo— y ambas
 * alimentan el mismo mensaje de "no cuadra" en `RfidMatchDetailDialog`.
 */
export const unidadesSobrantes = (match: RfidMatch): number =>
  match.lineas.reduce((total, linea) => total + Math.max(0, -linea.diferencia), 0);

/**
 * Piezas realmente EMPAREJADAS contra una línea esperada, acotadas a su
 * `esperado` (un excedente en una línea no "adelanta" el progreso más allá de
 * lo que esa línea pedía). Es el numerador correcto para una barra de avance:
 * a diferencia de `leido_total`, NO incluye lecturas sin asignar, así que
 * escanear tags que no resuelven a ninguna línea no la llena. Ver
 * `RfidMatchColumns.AvanceCell`, que reemplazó `leido_total` por este valor
 * tras el hallazgo de que el listado mostraba una barra llena y en verde para
 * un encuadre que, en su propio diálogo de detalle, seguía "sin cuadrar".
 */
export const unidadesEmparejadas = (match: RfidMatch): number =>
  Math.max(0, match.esperado_total - unidadesPendientes(match));

/** Últimas N lecturas — el backend recorta a 15 en `ultimas_lecturas`. */
export const ULTIMAS_LECTURAS_LIMIT = 15;

export const ultimasLecturas = (match: RfidMatch): RfidMatchReading[] =>
  match.lecturas.slice(0, ULTIMAS_LECTURAS_LIMIT);

export const lecturasSinAsignar = (match: RfidMatch): RfidMatchReading[] =>
  match.lecturas.filter((lectura) => lectura.linea_id === null);

/**
 * Códigos del catálogo de ESTE encuadre que todavía no se han escaneado.
 *
 * Afordancia exclusiva de la maqueta: en producción los tags los emite el
 * lector Zebra y el operador nunca los teclea. Sin esta lista no habría forma
 * de descubrir un código válido y toda lectura caería en "sin asignar", lo que
 * haría ver la simulación como rota.
 */
export const codigosDisponibles = (
  match: RfidMatch,
): { linea: RfidMatchProductLine; codigos: string[] }[] => {
  const yaLeidos = new Set(match.lecturas.map((lectura) => lectura.codigo.toUpperCase()));

  return match.lineas
    .map((linea) => ({
      linea,
      codigos: [...linea.skus, linea.codigo, linea.cod_proscai].filter(
        (codigo) => !yaLeidos.has(codigo.toUpperCase()),
      ),
    }))
    .filter((entry) => entry.codigos.length > 0);
};

export interface RfidMatchKpis {
  totalMatches: number;
  pendientes: number;
  aceptados: number;
  /** Piezas por leer, sumadas solo sobre los encuadres aún pendientes. */
  unidadesPorLeer: number;
}

export const computeRfidMatchKpis = (matches: RfidMatch[]): RfidMatchKpis => {
  let pendientes = 0;
  let aceptados = 0;
  let unidadesPorLeer = 0;

  for (const match of matches) {
    if (match.estado === "ACEPTADO") {
      aceptados += 1;
      continue;
    }
    // Cualquier estatus no terminal cuenta como pendiente: si el backend
    // llegara a introducir uno nuevo, el KPI lo incluye en vez de perderlo.
    pendientes += 1;
    unidadesPorLeer += unidadesPendientes(match);
  }

  return {
    totalMatches: matches.length,
    pendientes,
    aceptados,
    unidadesPorLeer,
  };
};
