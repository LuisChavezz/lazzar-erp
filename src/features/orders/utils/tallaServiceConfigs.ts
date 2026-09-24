import type { EmbroideryOnboardingUbicacion } from "@/src/features/embroidery/interfaces/embroidery.interface";
import type { ReflectiveLineConfigEntry } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";

/**
 * Lectura segura de los `*_config` de JSON libre de una talla de pedido.
 *
 * Los consumen el detalle 360° del pedido (`PedidoDetailContent`) y el detalle
 * de pedidos especiales de Producción (`special-orders`). Reciben `unknown` y no
 * el tipo de cada contrato porque son el MISMO `JSONField` visto desde dos
 * serializers distintos: lo que importa es la forma real, que se comprueba aquí.
 *
 * Solo EXTRAEN: nunca deciden si el servicio aplica. Eso lo dicen únicamente
 * las banderas `lleva_*` —`bordado_config` llega como cascarón vacío aunque
 * `lleva_bordado` sea `false`—, así que quien llame debe filtrar por ellas antes.
 */

/**
 * Ubicaciones del `bordado_config` de una talla — el config es un OBJETO
 * `{ notas, ubicaciones[] }` de JSON libre, así que se extrae `.ubicaciones` con
 * doble guard (objeto, luego arreglo). Devuelve `[]` cuando falta o viene con
 * otra forma; el popover solo se abre si hay al menos una.
 */
export function bordadoUbicaciones(config: unknown): EmbroideryOnboardingUbicacion[] {
  if (config && !Array.isArray(config)) {
    const ubic = (config as Record<string, unknown>).ubicaciones;
    if (Array.isArray(ubic)) return ubic as EmbroideryOnboardingUbicacion[];
  }
  return [];
}

/**
 * Entradas del `reflejante_config` — aquí el config ES el arreglo directamente
 * (no un objeto que lo envuelva, a diferencia de bordado). `[]` si no es arreglo.
 */
export function reflejanteEntries(config: unknown): ReflectiveLineConfigEntry[] {
  return Array.isArray(config) ? (config as ReflectiveLineConfigEntry[]) : [];
}
