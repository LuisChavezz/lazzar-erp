"use client";

import { Popover } from "@radix-ui/themes";
import { InfoIcon } from "@/src/components/Icons";
import { cleanText } from "@/src/utils/cleanText";
import type { ReflectiveLineConfigEntry } from "../interfaces/reflective-order.interface";

/** Posiciones no vacías, en el orden en que llegan. */
const configPositions = (configs: ReflectiveLineConfigEntry[]): string[] =>
  configs
    .map((config) => cleanText(config.posicion))
    .filter((posicion): posicion is string => posicion !== null);

/**
 * Materiales DISTINTOS del arreglo, en orden de aparición. Es el dato que más
 * cambia el trabajo de taller —un material es un insumo físico distinto, no solo
 * una ubicación—, así que se cuenta aparte para poder anunciarlo en el
 * distintivo de la fila. En P-00027 son dos (`ignifuga-plata-1`,
 * `costurable-plata-1`).
 */
const configMaterials = (configs: ReflectiveLineConfigEntry[]): string[] => {
  const seen = new Set<string>();
  const materiales: string[] = [];
  for (const config of configs) {
    const tipo = cleanText(config.tipo);
    if (tipo && !seen.has(tipo)) {
      seen.add(tipo);
      materiales.push(tipo);
    }
  }
  return materiales;
};

/**
 * UN reflejante de la línea (material, opción y posición). El análogo de
 * `UbicacionDetail` de bordado, MÁS SIMPLE: `reflejante_config` no trae imagen
 * ni medidas ni banderas de técnica —solo `tipo`/`opcion`/`posicion`—, así que
 * no se copia el andamiaje de imagen fallida ni el de dimensiones.
 *
 * Diverge de bordado en QUÉ encabeza la entrada: allá manda el `codigo` de la
 * ubicación (dónde va el estampado); aquí manda el MATERIAL (`tipo`), porque es
 * el insumo físico que hay que surtir. La posición va debajo. Todo campo se
 * comprueba antes de pintarse: es captura libre de una cotización, cualquier
 * clave puede faltar.
 */
function ConfigDetail({
  config,
  ordinalLabel,
}: {
  config: ReflectiveLineConfigEntry;
  /** Rótulo de la entrada. `null` con una sola, donde el encabezado ya la nombra. */
  ordinalLabel: string | null;
}) {
  const tipo = cleanText(config.tipo);
  const posicion = cleanText(config.posicion);
  const opcion = cleanText(config.opcion);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words">
        {ordinalLabel && (
          <span className="text-slate-400 dark:text-slate-500">{ordinalLabel} </span>
        )}
        {tipo ?? "Reflejante"}
      </p>

      {(posicion || opcion) && (
        <dl className="space-y-0.5 text-[11px]">
          {posicion && (
            <div className="flex gap-1">
              <dt className="text-slate-400 dark:text-slate-500">Posición:</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-200 break-words">
                {posicion}
              </dd>
            </div>
          )}
          {opcion && (
            <div className="flex gap-1">
              <dt className="text-slate-400 dark:text-slate-500">Opción:</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-200 break-words">
                {opcion}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

interface ReflectiveLineConfigPopoverProps {
  /**
   * TODOS los reflejantes de la línea, en el orden del `reflejante_config`.
   * Quien lo llame ya garantiza que el arreglo no viene vacío (sin config no hay
   * popover que abrir).
   */
  configs: ReflectiveLineConfigEntry[];
  /** Nombre del producto — para el nombre accesible del disparador. */
  productoNombre: string;
  /**
   * Talla y color de la línea. NO son decorativos: todas las líneas de un pedido
   * suelen compartir producto, así que sin ellos los disparadores de cada fila
   * quedarían con un nombre accesible idéntico.
   */
  tallaNombre: string | null;
  colorNombre: string | null;
}

/**
 * Detalle del reflejante de una línea, en un POPOVER anclado a su disparador.
 * El análogo de `EmbroideryLineLocationPopover`, adaptado a reflejante: sin
 * imagen ni medidas, con el material al frente.
 *
 * Pinta TODOS los elementos del `reflejante_config`, apilados. El arreglo trae
 * de uno a tres reflejantes (`{1: 49, 2: 6, 3: 4}`), y P-00027 mezcla DOS
 * MATERIALES en la misma prenda; quedarse con `[0]` escondía el resto. Una
 * prenda con varios reflejantes sigue siendo UNA línea de la orden: se apilan
 * DENTRO del popover, nunca convierten la fila en varias.
 */
export function ReflectiveLineConfigPopover({
  configs,
  productoNombre,
  tallaNombre,
  colorNombre,
}: ReflectiveLineConfigPopoverProps) {
  const posiciones = configPositions(configs);
  const materiales = configMaterials(configs);
  const multiples = configs.length > 1;

  /**
   * Texto visible del disparador, reutilizado como PREFIJO del nombre accesible
   * (WCAG 2.5.3, Label in Name). Enumera las POSICIONES —no los materiales—
   * porque son las que distinguen una entrada de otra (HOMBROS/BRAZOS/TIRANTES),
   * mientras que el material se repite (`ignifuga-plata-1` ×2); el conteo de
   * materiales viaja en el distintivo de la fila, ver `ReflectiveConfigCountBadge`.
   *
   * Igual que bordado, se enumeran las posiciones SOLO si TODAS las entradas
   * traen una: `posiciones` descarta las vacías, así que con "3 reflejantes, 2
   * con posición" listar dos diría "dos" mientras el distintivo y el `aria-label`
   * dicen "tres". Cuando falta alguna se cae al conteo, que concuerda con ambos.
   *
   * Con UNA entrada NO hay distintivo de conteo (`ReflectiveConfigCountBadge`
   * solo aparece con varias) ni columna "Tipo" en el Paso 2, así que el material
   * quedaría invisible en la fila si el disparador mostrara solo la posición.
   * Por eso el caso de una entrada ANTEPONE el material —el insumo físico que
   * hay que surtir— y añade la posición cuando la trae.
   */
  const soloTipo = materiales[0];
  const soloPosicion = posiciones[0];
  const triggerText = multiples
    ? posiciones.length === configs.length
      ? `Posiciones: ${posiciones.join(", ")}`
      : `${configs.length} reflejantes`
    : soloTipo
      ? soloPosicion
        ? `${soloTipo} · ${soloPosicion}`
        : `Material: ${soloTipo}`
      : soloPosicion
        ? `Posición: ${soloPosicion}`
        : "Detalle del reflejante";
  const triggerAriaLabel = [
    `${triggerText}.`,
    multiples
      ? `Ver detalle de los ${configs.length} reflejantes de ${productoNombre}`
      : `Ver detalle del reflejante de ${productoNombre}`,
    tallaNombre ? `talla ${tallaNombre}` : null,
    colorNombre ? `color ${colorNombre}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Popover.Root>
      <Popover.Trigger>
        {/* `max-w-*` + texto truncado: el disparador enumera posiciones, que en
            reflejante son palabras largas ("HOMBROS, BRAZOS, TIRANTES") y podían
            ensanchar la celda "Producto" del diálogo de detalle —`LineItemsTable`
            no tiene scroll horizontal—. Se acota el ancho y el texto se recorta
            con elipsis; la lista completa vive en el popover y en el
            `aria-label`, así que no se pierde información. */}
        <button
          type="button"
          className="inline-flex max-w-[18rem] items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:border-sky-300 hover:text-sky-700 dark:hover:border-sky-500/40 dark:hover:text-sky-300 transition-colors cursor-pointer"
          aria-label={triggerAriaLabel}
        >
          <InfoIcon className="w-3 h-3 shrink-0" />
          <span className="min-w-0 truncate">{triggerText}</span>
        </button>
      </Popover.Trigger>

      {/* 300px con varios y 280px con uno, igual que bordado. */}
      <Popover.Content
        size="1"
        width={multiples ? "300px" : "280px"}
        side="top"
        align="start"
      >
        {/* Alto acotado a `--radix-popover-content-available-height` (el hueco
            real que Radix calcula para el disparador) y NO a un `60vh` fijo: el
            mismo popover se abre desde el Paso 2 y desde el diálogo de detalle,
            con espacio muy distinto, así que cualquier número fijo acierta en uno
            y falla en el otro —el bug de layout que bordado ya sufrió—. Se
            restan los 12px de padding de `Popover.Content`. Con UNA sola entrada
            no se pone tope, para no meter scroll donde no hace falta. Mismo
            recurso que `LineItemsTable`. */}
        <div
          className={
            multiples
              ? "max-h-[calc(var(--radix-popover-content-available-height,60vh)-1.5rem)] overflow-y-auto divide-y divide-slate-100 dark:divide-white/10"
              : undefined
          }
        >
          {multiples && (
            <p className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {configs.length} reflejantes
              {materiales.length > 1 && ` · ${materiales.length} materiales`}
            </p>
          )}

          {configs.map((config, index) => (
            <div
              // `index` como llave: el `reflejante_config` es JSON libre, no trae
              // id por elemento y `posicion` puede repetirse o faltar. El arreglo
              // no se reordena ni se filtra aquí, así que la posición es estable.
              key={index}
              // `pt-2` en TODAS las entradas: el `divide-y` también dibuja el
              // separador entre el encabezado de conteo y la primera.
              className={multiples ? "pt-2" : undefined}
            >
              <ConfigDetail
                config={config}
                ordinalLabel={multiples ? `${index + 1}.` : null}
              />
            </div>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

/**
 * Distintivo para la fila, junto al disparador. Anuncia cuántos MATERIALES
 * distintos hay —el dato que cambia el trabajo del taller y que la lista de
 * posiciones del disparador no lleva— y, cuando aporta algo, el conteo de
 * reflejantes.
 *
 * El conteo se muestra SOLO cuando el disparador no lo muestra ya. El disparador
 * enumera posiciones cuando TODAS las traen y, si no, cae a "N reflejantes"
 * (mismo criterio que `triggerText`). En ese segundo caso repetir "N
 * reflejantes" aquí lo pintaría dos veces seguidas, así que el distintivo se
 * queda solo con los materiales —y desaparece si tampoco hay varios—. El conteo
 * que llegue a mostrar es el mismo `configs.length` que el `aria-label`, para
 * que nunca discrepen.
 */
export function ReflectiveConfigCountBadge({
  configs,
}: {
  configs: ReflectiveLineConfigEntry[];
}) {
  if (configs.length <= 1) return null;
  const materiales = configMaterials(configs);
  const disparadorEnumeraPosiciones = configPositions(configs).length === configs.length;

  // El disparador ya muestra "N reflejantes": el distintivo no lo repite.
  if (!disparadorEnumeraPosiciones) {
    if (materiales.length <= 1) return null;
    return (
      <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
        {materiales.length} materiales
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
      {configs.length} reflejantes
      {materiales.length > 1 && ` · ${materiales.length} materiales`}
    </span>
  );
}
