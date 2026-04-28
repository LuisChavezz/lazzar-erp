/**
 * reflective-labels.ts
 * Constantes de catálogo para configuraciones de reflejante.
 * Usadas tanto en el formulario (`StepReflective`) como en la
 * vista de detalle (`QuoteProductReflectiveView`).
 */

// ---------------------------------------------------------------------------
// Opciones de tipo de fabricación
// ---------------------------------------------------------------------------

export const OPCION_OPTIONS = [
  {
    value: "catalogo",
    badge: "Del inventario",
    label:
      "Elige una prenda del catálogo y agrega cinta reflejante. Se entrega más rápido. (Máximo 50 piezas)",
  },
  {
    value: "fabricacion",
    badge: "Fabricación especial",
    label:
      "Podemos realizar una fabricación bajo pedido a tu medida (Mínimo 50 prendas), el costo es más bajo",
  },
] as const;

/** Mapa value → label para render rápido en vistas de solo lectura. */
export const OPCION_LABEL: Record<string, string> = Object.fromEntries(
  OPCION_OPTIONS.map((opt) => [opt.value, opt.badge])
);

// ---------------------------------------------------------------------------
// Opciones de posición
// ---------------------------------------------------------------------------

export const POSICION_OPTIONS = [
  { value: "BRAZOS", label: "Brazos" },
  { value: "FRENTE", label: "Frente" },
  { value: "ESPALDA", label: "Espalda" },
  { value: "RODILLAS", label: "Rodillas" },
  { value: "HOMBROS", label: "Hombros" },
  { value: "TIRANTES", label: "Tirantes" },
  { value: "X_FRENTE", label: "X en Frente" },
  { value: "X_ESPALDA", label: "X en Espalda" },
] as const;

/** Mapa value → label para render rápido en vistas de solo lectura. */
export const POSICION_LABEL: Record<string, string> = Object.fromEntries(
  POSICION_OPTIONS.map((opt) => [opt.value, opt.label])
);

// ---------------------------------------------------------------------------
// Categorías de tipo de cinta con sus opciones anidadas
// ---------------------------------------------------------------------------

export const TIPO_CATEGORIES = [
  {
    value: "reflejante-cat-1",
    label: "Cinta Costurable",
    subtitle: "LAZZAR-RT",
    image: "/images/reflejante-cat-costurable.png",
    opciones: [
      { value: "costurable-plata-1", label: "PLATA 1 PULGADA" },
      { value: "costurable-plata-1.5", label: "PLATA 1 1/2 PULGADAS" },
      { value: "costurable-plata-2", label: "PLATA 2 PULGADAS" },
      { value: "costurable-dual-naranja-1.5", label: 'DUAL NARANJA 1 1/2" CON PLATA 1/2"' },
      { value: "costurable-dual-amarillo-1.5", label: 'DUAL AMARILLO 1 1/2" CON PLATA 1/2"' },
      { value: "costurable-dual-naranja-2", label: 'DUAL NARANJA 2" CON PLATA 3/4"' },
      { value: "costurable-dual-amarillo-2", label: 'DUAL AMARILLO 2" CON PLATA 3/4"' },
    ],
  },
  {
    value: "reflejante-cat-2",
    label: "Cinta Ignífuga",
    subtitle: "3M",
    image: "/images/reflejante-cat-ignifuga.png",
    opciones: [
      { value: "ignifuga-plata-1", label: "PLATA 1 PULGADA IGNÍFUGO" },
      { value: "ignifuga-plata-2", label: "PLATA 2 PULGADAS IGNÍFUGO" },
      { value: "ignifuga-dual-naranja-2", label: 'DUAL NARANJA 2" CON PLATA 3/4" IGNÍFUGO' },
      { value: "ignifuga-dual-amarillo-2", label: 'DUAL AMARILLO 2" CON PLATA 3/4" IGNÍFUGO' },
    ],
  },
  {
    value: "reflejante-cat-3",
    label: "Termofijable (Planchadas)",
    subtitle: "3M",
    image: "/images/reflejante-cat-planchada.png",
    opciones: [
      { value: "termofijable-h510c-1", label: 'H510C SEGMENTADA PLATA 1"' },
      { value: "termofijable-h510c-2", label: 'H510C SEGMENTADA PLATA 2"' },
      { value: "termofijable-h656c-1.5", label: 'H656C SEGMENTADA AMARILLO/PLATA 1.5" con 0.5 Plata' },
      { value: "termofijable-h656c-2", label: 'H656C SEGMENTADA AMARILLO/PLATA 2" con 0.75 Plata' },
      { value: "termofijable-h712s-1", label: 'H712S REFLEJANTE PLATA STRETCH 1"' },
      { value: "termofijable-h712s-2", label: 'H712S REFLEJANTE PLATA STRETCH 2"' },
    ],
  },
] as const;

/** Mapa value → label aplanado desde todas las categorías para render rápido. */
export const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPO_CATEGORIES.flatMap((cat) => cat.opciones.map((op) => [op.value, op.label]))
);
