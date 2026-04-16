import { QuoteById } from "../interfaces/quote.interface";

type QuoteDetail = QuoteById["detalles"][number];
export type QuoteDetailSize = QuoteDetail["tallas"][number];

export interface EmbroideryGroup {
  key: string;
  label: string;
  notes: string;
  hasEmbroidery: boolean;
  sizes: QuoteDetailSize[];
  locations: {
    codigo: string;
    ancho_cm: number;
    alto_cm: number;
    color_hilo: string | null;
    imagen: string;
  }[];
}

const WITHOUT_EMBROIDERY_KEY = "__without_embroidery__";

// Get a unique key for each embroidery group
const getEmbroideryKey = (size: QuoteDetailSize) => {
  if (!size.lleva_bordado || !size.bordado_config) {
    return WITHOUT_EMBROIDERY_KEY;
  }

  // Create a unique key based on notes and locations
  return JSON.stringify({
    notas: size.bordado_config.notas?.trim() ?? "",
    ubicaciones: size.bordado_config.ubicaciones.map((location) => ({
      codigo: location.codigo,
      ancho_cm: Number(location.ancho_cm),
      alto_cm: Number(location.alto_cm),
      color_hilo: location.color_hilo ?? "",
      imagen: location.imagen ?? "",
    })),
  });
};

export const buildEmbroideryGroups = (sizes: QuoteDetailSize[]): EmbroideryGroup[] => { // Build embroidery groups
  const groups = new Map<string, EmbroideryGroup>();
  let embroideryCounter = 0;

  sizes.forEach((size) => { // Iterate over each size
    const key = getEmbroideryKey(size);
    const hasEmbroidery = key !== WITHOUT_EMBROIDERY_KEY;
    const embroideryConfig = size.bordado_config;
    const currentGroup = groups.get(key);

    if (currentGroup) { // If group already exists
      currentGroup.sizes.push(size);
      return;
    }

    if (!hasEmbroidery || !embroideryConfig) { // If no embroidery
      groups.set(key, {
        key,
        label: "Sin bordado",
        notes: "",
        hasEmbroidery: false,
        sizes: [size],
        locations: [],
      });
      return;
    }


    // If embroidery
    embroideryCounter += 1;
    groups.set(key, {
      key,
      label: `Bordado ${embroideryCounter}`,
      notes: embroideryConfig.notas?.trim() ?? "",
      hasEmbroidery: true,
      sizes: [size],
      locations: embroideryConfig.ubicaciones,
    });
  });

  return [...groups.values()].sort((a, b) => Number(b.hasEmbroidery) - Number(a.hasEmbroidery));
};
