/**
 * Mapa de nombres de color (en español, según los valores que devuelve la API)
 * a valores hexadecimales aproximados. Se usa para mostrar swatches de color
 * en la columna "Color" de la tabla de existencias.
 */
const COLOR_HEX_MAP: Record<string, string> = {
  rojo:          "#ef4444",
  rosa:          "#ec4899",
  morado:        "#a855f7",
  violeta:       "#8b5cf6",
  azul:          "#3b82f6",
  "azul marino": "#1e3a5f",
  "azul cielo":  "#38bdf8",
  cyan:          "#06b6d4",
  verde:         "#22c55e",
  "verde oliva": "#65a30d",
  "verde menta": "#34d399",
  amarillo:      "#eab308",
  naranja:       "#f97316",
  café:          "#92400e",
  marrón:        "#78350f",
  gris:          "#6b7280",
  "gris claro":  "#d1d5db",
  "gris oscuro": "#374151",
  negro:         "#111111",
  blanco:        "#ffffff",
  beige:         "#f5f5dc",
  crema:         "#fef3c7",
  burdeos:       "#7f1d1d",
  vino:          "#7f1d1d",
  mostaza:       "#ca8a04",
  turquesa:      "#14b8a6",
  coral:         "#fb7185",
  salmón:        "#fdba74",
  lila:          "#c084fc",
};

/**
 * Convierte un nombre de color a un valor hexadecimal aproximado para mostrarlo
 * como swatch. Útil cuando la API devuelve nombres ("ROJO", "AZUL MARINO", …).
 * Si el color no está reconocido, devuelve un gris neutro por defecto.
 */
export function colorToHex(color: string): string {
  return COLOR_HEX_MAP[color.toLowerCase().trim()] ?? "#94a3b8";
}
