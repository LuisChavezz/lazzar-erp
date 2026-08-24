/**
 * Deriva `bordado_config.tipos_servicio` de las banderas booleanas que el
 * formulario ya captura por ubicación.
 *
 * POR QUÉ EXISTE: la captura y el contrato viven en formas distintas. El
 * asistente de cotización pregunta las técnicas como cinco casillas dentro de
 * CADA ubicación del bordado (`bordado_config.ubicaciones[i].serigrafia`…),
 * mientras que Producción lee un arreglo de claves a nivel de la talla
 * (`bordado_config.tipos_servicio`). Son el mismo dato con dos granularidades,
 * así que en vez de preguntarlo dos veces al usuario se traduce al serializar.
 *
 * Las banderas SIGUEN VIAJANDO: hay cinco consumidores que las leen una por una
 * (PDF y correo de la cotización, detalle del pedido, agrupador de bordados y el
 * onboarding de Producción). Esto añade una vista agregada, no la sustituye.
 *
 * Este archivo es el ÚNICO lugar del frontend donde vive la correspondencia
 * bandera → clave del enum; los hooks de serialización solo llaman a la función.
 */

/**
 * Correspondencia bandera del payload → clave de `TipoServicioBordado`
 * (el `TextChoices` de Ventas, verificado contra `ventas/servicios_bordado.py`:
 * `NUEVO_PONCHADO`, `SERIGRAFIA`, `SUBLIMADO`, `DTF`, `REVELADO`).
 *
 * Las claves de este objeto son los nombres del payload —snake_case, tal cual
 * viajan al API—, no los del estado del formulario (`nuevoPonchado`…): se
 * deriva de lo que REALMENTE se envía, para que el arreglo agregado no pueda
 * contradecir a las banderas que lo acompañan en el mismo JSON.
 */
const FLAG_TO_TIPO_SERVICIO = {
  nuevo_ponchado: "NUEVO_PONCHADO",
  serigrafia: "SERIGRAFIA",
  sublimado: "SUBLIMADO",
  dtf: "DTF",
  revelado: "REVELADO",
} as const;

/** Nombre de bandera en el payload — las llaves del mapa de arriba. */
type EmbroideryServiceFlag = keyof typeof FLAG_TO_TIPO_SERVICIO;

const SERVICE_FLAGS = Object.keys(FLAG_TO_TIPO_SERVICIO) as EmbroideryServiceFlag[];

/**
 * Lo mínimo que necesita una ubicación para poder derivar de ella. Se tipa
 * ESTRUCTURALMENTE en vez de importar el tipo del payload: así la función queda
 * autocontenida y, si alguien renombrara una bandera en `QuoteCreate`, el error
 * saltaría en el punto de llamada en vez de pasar inadvertido aquí.
 */
export type EmbroideryUbicacionFlags = {
  [Flag in EmbroideryServiceFlag]: boolean;
};

/**
 * Unión de las técnicas activas en TODAS las ubicaciones del renglón.
 *
 * Ubicación 1 con `serigrafia` y ubicación 2 con `dtf` dan
 * `["SERIGRAFIA", "DTF"]`; la misma bandera repetida en dos ubicaciones aparece
 * UNA vez. Devuelve `[]` cuando no hay ubicaciones (el caso de un renglón sin
 * bordado) o cuando ninguna casilla está marcada — el vacío es un resultado
 * normal, no un fallo.
 *
 * El orden es el del mapa de arriba, estable entre llamadas; el backend no lo
 * usa para nada.
 */
export const deriveTiposServicio = (
  ubicaciones: readonly EmbroideryUbicacionFlags[],
): string[] => {
  const tipos = new Set<string>();
  for (const ubicacion of ubicaciones) {
    for (const flag of SERVICE_FLAGS) {
      if (ubicacion[flag]) tipos.add(FLAG_TO_TIPO_SERVICIO[flag]);
    }
  }
  return [...tipos];
};
