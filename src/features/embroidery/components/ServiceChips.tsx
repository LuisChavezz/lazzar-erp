"use client";

import { StatusBadge } from "@/src/components/StatusBadge";
import type { TipoServicioDisplay } from "../interfaces/embroidery.interface";

/**
 * Estilo de los chips de tipo de servicio. Tono NEUTRO a propósito: no son un
 * estatus ni una alerta, solo las técnicas que lleva el renglón, y darles color
 * los pondría a competir con los badges que sí significan algo en pantalla.
 */
const SERVICE_CHIP_CFG = {
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
  dot: "bg-slate-400",
};

interface ServiceChipsProps {
  /**
   * `tipos_servicio_display` del renglón. Se recibe ya extraído —y no el
   * renglón entero— porque los dos consumidores traen formas distintas: la
   * ficha lo saca de `EmbroideryOrderDetailLine` (cruzando por id, así que
   * puede no haber renglón) y el alta de `EmbroideryOnboardingDetalle`.
   */
  servicios: TipoServicioDisplay[];
}

/**
 * Técnicas de un renglón, como chips. ÚNICA implementación: la usan la ficha de
 * la orden (columna "Servicios" del avance por talla) y el paso 2 del alta.
 *
 * El texto sale SIEMPRE de `label` —lo resuelve el backend, con acentos— y
 * `value` se usa solo como llave de React: no hay mapa clave→etiqueta en el
 * cliente, que es justo lo que `tipos_servicio_display` viene a evitar. Por eso
 * el `config` de cada `StatusBadge` se arma con el propio elemento que se está
 * pintando en vez de con un catálogo local.
 *
 * El arreglo vacío es el caso NORMAL hoy —la captura vive en Ventas y apenas
 * empieza a existir—, así que se pinta con el guion largo del módulo y nunca
 * como aviso ni como error.
 */
export function ServiceChips({ servicios }: ServiceChipsProps) {
  // El `?? []` NO relaja el contrato —el campo sigue tipado como obligatorio,
  // que es lo que el backend promete—: cubre la ventana de despliegue. El
  // frontend y el API se publican por separado, así que puede haber minutos en
  // los que esta versión hable con un backend anterior al campo. Sin el
  // guardia, ese desfase no daría un hueco sino un `TypeError` que tumba el
  // diálogo de alta entero y el resumen de la ficha.
  const items = servicios ?? [];
  if (items.length === 0) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  return (
    // `flex-wrap`: un renglón con varias técnicas baja de línea dentro de su
    // contenedor en vez de estirarlo y empujar el layout al scroll.
    <span className="flex flex-wrap gap-1">
      {items.map((servicio) => (
        <StatusBadge
          key={servicio.value}
          status={servicio.value}
          config={{ [servicio.value]: { ...SERVICE_CHIP_CFG, label: servicio.label } }}
        />
      ))}
    </span>
  );
}
