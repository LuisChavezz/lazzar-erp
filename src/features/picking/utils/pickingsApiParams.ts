import { getMexicoTodayDate } from "@/src/utils/mexicoTime";

/** "AAAA-MM-DD" + n días (calendario, sin zona). */
export const addDays = (key: string, days: number): string => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Traduce los filtros de la URL que el backend no conoce (`periodo`, `entrega`)
 * a sus rangos de fecha, contra el día de México de `now`. El resto pasa igual.
 * La lista y el resumen usan esta misma traducción, así cuentan lo mismo.
 */
export function pickingsApiParams(
  params: Record<string, string | number>,
  now: Date = new Date(),
): Record<string, string | number> {
  const { periodo, entrega, ...rest } = params;
  const hoy = getMexicoTodayDate(now);
  const out: Record<string, string | number> = { ...rest };

  switch (periodo) {
    case "hoy":
      out.fecha_desde = hoy;
      out.fecha_hasta = hoy;
      break;
    case "7d":
      out.fecha_desde = addDays(hoy, -6);
      out.fecha_hasta = hoy;
      break;
    case "mes":
      out.fecha_desde = `${hoy.slice(0, 7)}-01`;
      out.fecha_hasta = hoy;
      break;
    case "mes_pasado": {
      const primeroDeEste = `${hoy.slice(0, 7)}-01`;
      const ultimoDelPasado = addDays(primeroDeEste, -1);
      out.fecha_desde = `${ultimoDelPasado.slice(0, 7)}-01`;
      out.fecha_hasta = ultimoDelPasado;
      break;
    }
  }

  switch (entrega) {
    case "vencida":
      out.pedido_fecha_entrega_hasta = addDays(hoy, -1);
      break;
    case "3d":
      out.pedido_fecha_entrega_desde = hoy;
      out.pedido_fecha_entrega_hasta = addDays(hoy, 3);
      break;
    case "7d":
      out.pedido_fecha_entrega_desde = hoy;
      out.pedido_fecha_entrega_hasta = addDays(hoy, 7);
      break;
  }
  return out;
}
