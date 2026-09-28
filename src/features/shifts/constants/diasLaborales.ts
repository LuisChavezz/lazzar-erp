/**
 * Catálogo de días laborales del turno.
 *
 * `dias_laborales` es un `str≤50` LIBRE en el backend: no lo valida ni lo
 * parsea, y su filtro es de coincidencia exacta sobre la cadena completa. Eso
 * obliga a que el frontend emita SIEMPRE el mismo orden canónico — si un turno
 * guardara "V,L" y otro "L,V", serían dos valores distintos para el mismo
 * horario y el filtro los separaría.
 *
 * Las claves son las iniciales españolas, con X para miércoles (convención
 * habitual en México para desambiguarlo de martes).
 *
 * Esta convención es propiedad del frontend. El backend aceptará cualquier
 * cadena, incluidos valores heredados capturados a mano antes de este módulo.
 */

export const DIA_LABORAL_OPTIONS = [
  { value: "L", label: "Lunes" },
  { value: "M", label: "Martes" },
  { value: "X", label: "Miércoles" },
  { value: "J", label: "Jueves" },
  { value: "V", label: "Viernes" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
] as const;

/** Orden canónico de emisión: el del catálogo, de lunes a domingo. */
const CANONICAL_ORDER = DIA_LABORAL_OPTIONS.map((option) => option.value);

const isDiaLaboral = (value: string): boolean =>
  (CANONICAL_ORDER as readonly string[]).includes(value);

/**
 * Serializa los días seleccionados en el orden canónico, sin importar en qué
 * orden se hayan marcado. Devuelve "" cuando no hay ninguno.
 */
export const serializeDiasLaborales = (selected: readonly string[]): string =>
  CANONICAL_ORDER.filter((dia) => selected.includes(dia)).join(",");

/**
 * Lee una cadena guardada y devuelve los días reconocidos, en orden canónico.
 *
 * Es TOLERANTE a propósito: separa por coma, recorta espacios, normaliza a
 * mayúsculas y descarta lo que no sea un código conocido. Un valor heredado
 * como "Lunes a viernes" devuelve `[]` — el llamador decide qué hacer con la
 * cadena original, que esta función nunca destruye.
 *
 * Formato heredado previo a la convención `X`: turnos capturados como
 * "L,M,M,J,V" usan `M` para martes Y miércoles. Si `M` aparece repetida y no
 * hay `X`, la repetición se lee como miércoles (en orden de semana es la única
 * lectura posible). Una `M` sola sigue siendo martes, como dice el catálogo.
 * `serializeDiasLaborales` emite siempre `X`, así que re-guardar normaliza.
 */
export const parseDiasLaborales = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  const entries = value.split(",").map((entry) => entry.trim().toUpperCase());
  const parsed = entries.filter(isDiaLaboral);

  const hasLegacyMiercoles =
    !entries.includes("X") && entries.filter((entry) => entry === "M").length > 1;
  if (hasLegacyMiercoles) {
    parsed.push("X");
  }

  return CANONICAL_ORDER.filter((dia) => parsed.includes(dia));
};

/**
 * `true` cuando la cadena guardada tiene contenido pero NADA de lo que trae es
 * un código conocido. El formulario lo usa para avisar en vez de fingir que el
 * turno no tiene días asignados.
 */
export const isUnparsedDiasLaborales = (value: string | null | undefined): boolean =>
  Boolean(value?.trim()) && parseDiasLaborales(value).length === 0;
