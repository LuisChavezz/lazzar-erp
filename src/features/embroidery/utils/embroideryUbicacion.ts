/**
 * Reglas de presentación de UNA ubicación de bordado, compartidas por el
 * popover de la pantalla (`EmbroideryLineLocationPopover`) y el PDF de la orden
 * de bordado (`embroideryOrderPdf`), para que ambos digan lo mismo. Sin React.
 */
import type { EmbroideryOnboardingUbicacion } from "../interfaces/embroidery.interface";

/**
 * Las CINCO banderas booleanas de la ubicación, y nada más.
 *
 * El tipo se cierra a esta unión en vez de a `keyof
 * EmbroideryOnboardingUbicacion`: el filtro compara con `=== true`, así que una
 * clave que no sea booleana —`codigo`, `pantones`…— compilaría sin quejarse y
 * su distintivo simplemente no aparecería nunca, sin ninguna pista de por qué.
 * Con la unión explícita ese error es de compilación.
 */
export type EmbroideryTechniqueKey = "dtf" | "sublimado" | "serigrafia" | "revelado" | "nuevo_ponchado";

/**
 * Técnicas de la ubicación. Solo se muestran las que llegan en `true`: una lista
 * con "DTF: No · Sublimado: No · …" ocuparía el doble para comunicar lo mismo
 * que su ausencia. En los datos actuales las cinco llegan en `false`, así que lo
 * normal hoy es que no aparezca ninguna.
 */
export const EMBROIDERY_TECHNIQUE_LABELS: readonly { key: EmbroideryTechniqueKey; label: string }[] = [
  { key: "dtf", label: "DTF" },
  { key: "sublimado", label: "Sublimado" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "revelado", label: "Revelado" },
  { key: "nuevo_ponchado", label: "Nuevo ponchado" },
];

/** Técnicas activas (`=== true`) de una ubicación, en el orden de la lista. */
export const embroideryTechniques = (ubicacion: EmbroideryOnboardingUbicacion) =>
  EMBROIDERY_TECHNIQUE_LABELS.filter(({ key }) => ubicacion[key] === true);

/**
 * Medidas de la ubicación como "9 × 4.1 cm", o `null`.
 *
 * Se muestran como par —una sola dimensión no describe nada— y ambas tienen que
 * ser POSITIVAS. Un `0` no es una medida: es el valor que deja un campo numérico
 * sin capturar, y el propio formulario de captura lo rechaza
 * (`Number.isFinite(alto) && alto > 0` en `useEmbroideryState`). Aceptarlo
 * mostraría "0 × 0 cm" como si fuera un dato real, el mismo criterio por el que
 * `cleanText` descarta las cadenas vacías.
 */
export const embroideryMedidas = (ubicacion: EmbroideryOnboardingUbicacion): string | null =>
  typeof ubicacion.ancho_cm === "number" &&
  typeof ubicacion.alto_cm === "number" &&
  ubicacion.ancho_cm > 0 &&
  ubicacion.alto_cm > 0
    ? `${ubicacion.ancho_cm} × ${ubicacion.alto_cm} cm`
    : null;
