"use client";

import { useState } from "react";
import Image from "next/image";
import { Popover } from "@radix-ui/themes";
import { InfoIcon } from "@/src/components/Icons";
import type { EmbroideryOnboardingUbicacion } from "../interfaces/embroidery.interface";

/**
 * `loader` de identidad + `unoptimized`: la imagen vive en el servidor de
 * archivos externo (`NEXT_PUBLIC_NGROK_BASE_URL`), que NO está en
 * `images.remotePatterns` de `next.config.ts`. Devolver el `src` tal cual y
 * marcar `unoptimized` saca al optimizador de Next del camino —es él quien
 * valida `remotePatterns`—, así que la etiqueta sale con la URL original y no
 * hace falta tocar la configuración. Mismo recurso, mismo host y misma técnica
 * que `QuoteProductEmbroideryView`/`StepEmbroidery` en cotizaciones.
 */
const externalImageLoader = ({ src }: { src: string }) => src;

/**
 * Las CINCO banderas booleanas de la ubicación, y nada más.
 *
 * El tipo se cierra a esta unión en vez de a `keyof
 * EmbroideryOnboardingUbicacion`: el filtro de abajo compara con `=== true`, así
 * que una clave que no sea booleana —`codigo`, `pantones`…— compilaría sin
 * quejarse y su distintivo simplemente no aparecería nunca, sin ninguna pista de
 * por qué. Con la unión explícita ese error es de compilación.
 */
type EmbroideryTechniqueKey =
  | "dtf"
  | "sublimado"
  | "serigrafia"
  | "revelado"
  | "nuevo_ponchado";

/**
 * Técnicas de la ubicación. Solo se pintan las que llegan en `true`: una lista
 * con "DTF: No · Sublimado: No · …" ocuparía el doble para comunicar lo mismo
 * que su ausencia. En los datos actuales las cinco llegan en `false`, así que lo
 * normal hoy es que esta sección no aparezca.
 */
const TECHNIQUE_LABELS: {
  key: EmbroideryTechniqueKey;
  label: string;
}[] = [
  { key: "dtf", label: "DTF" },
  { key: "sublimado", label: "Sublimado" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "revelado", label: "Revelado" },
  { key: "nuevo_ponchado", label: "Nuevo ponchado" },
];

/** Texto presente y no vacío, ya recortado. `null` si no hay nada que pintar. */
const cleanText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * UNA ubicación del bordado. Se extrajo a su propio componente al pasar el
 * popover de una a N: el estado de imagen fallida tiene que ser POR ENTRADA
 * —con una sola bandera compartida, la caída de una imagen tachaba también a
 * las que sí habían cargado— y montarlo por entrada lo resuelve sin llevar la
 * cuenta de índices fallidos.
 *
 * Todos los campos se comprueban antes de pintarse: esto es la captura libre de
 * una cotización, no un contrato del serializer, y cualquier clave puede faltar
 * o llegar en blanco (`color_hilo` y `pantones` son `""` en el 100% de los
 * registros actuales, y por eso hoy no se ven).
 */
function UbicacionDetail({
  ubicacion,
  productoNombre,
  /** Rótulo de la entrada. `null` en el caso de una sola, donde el título del
   *  popover ya la nombra y repetirlo sería ruido. */
  ordinalLabel,
}: {
  ubicacion: EmbroideryOnboardingUbicacion;
  productoNombre: string;
  ordinalLabel: string | null;
}) {
  // Una imagen rota no debe leerse igual que "esta ubicación no tiene imagen":
  // el archivo vive tras un túnel que puede estar caído. Se reinicia solo en
  // cada apertura, porque Radix desmonta el contenido al cerrar el popover.
  const [imageFailed, setImageFailed] = useState(false);

  const imagen = cleanText(ubicacion.imagen);
  const descripcion = cleanText(ubicacion.descripcion_posicion);
  const colorHilo = cleanText(ubicacion.color_hilo);
  const pantones = cleanText(ubicacion.pantones);
  const codigo = cleanText(ubicacion.codigo);

  /**
   * Las medidas se muestran como par —una sola dimensión no describe nada— y
   * ambas tienen que ser POSITIVAS. Un `0` no es una medida: es el valor que
   * deja un campo numérico sin capturar, y el propio formulario de captura lo
   * rechaza (`Number.isFinite(alto) && alto > 0` en `useEmbroideryState`).
   * Aceptarlo pintaría "Medidas: 0 × 0 cm" como si fuera un dato real, el mismo
   * criterio por el que `cleanText` descarta las cadenas vacías.
   */
  const medidas =
    typeof ubicacion.ancho_cm === "number" &&
    typeof ubicacion.alto_cm === "number" &&
    ubicacion.ancho_cm > 0 &&
    ubicacion.alto_cm > 0
      ? `${ubicacion.ancho_cm} × ${ubicacion.alto_cm} cm`
      : null;

  const tecnicas = TECHNIQUE_LABELS.filter(({ key }) => ubicacion[key] === true);

  /**
   * Texto alternativo de la imagen. Incluye el código cuando lo hay: con varias
   * ubicaciones del mismo producto, un `alt` idéntico en todas dejaría a quien
   * usa lector de pantalla sin saber cuál está describiendo.
   */
  const imagenAlt = codigo
    ? `Bordado de ${productoNombre}, ubicación ${codigo}`
    : `Bordado de ${productoNombre}`;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {/* Con varias entradas el ordinal va delante para que el orden del
              arreglo sea visible: los códigos reales llegan como ["B", "A"] —no
              alfabéticos—, así que sin él "Ubicación A" arriba de "Ubicación B"
              se leería como un error de ordenamiento en vez de como el orden en
              que se capturaron. */}
          {ordinalLabel && (
            <span className="text-slate-400 dark:text-slate-500">{ordinalLabel} </span>
          )}
          {codigo ? `Ubicación ${codigo}` : "Ubicación del bordado"}
        </p>
        {descripcion && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
            {descripcion}
          </p>
        )}
      </div>

      {imagen &&
        (imageFailed ? (
          /* La imagen SÍ está capturada pero no se pudo traer: el archivo vive
             en un túnel externo que se cae, y la URL es la que guardó la
             cotización. Sin este aviso el usuario ve un marco roto y no
             distingue "este bordado no tiene imagen" de "el servidor de
             archivos no responde". Mismo criterio que el respaldo "Sin imagen"
             de `QuoteProductEmbroideryView`. */
          <p className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            No se pudo cargar la imagen del bordado.
          </p>
        ) : (
          <Image
            loader={externalImageLoader}
            unoptimized
            src={imagen}
            alt={imagenAlt}
            width={256}
            height={144}
            onError={() => setImageFailed(true)}
            className="w-full h-32 object-contain rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20"
          />
        ))}

      {(medidas || colorHilo || pantones) && (
        <dl className="space-y-0.5 text-[11px]">
          {medidas && (
            <div className="flex gap-1">
              <dt className="text-slate-400 dark:text-slate-500">Medidas:</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                {medidas}
              </dd>
            </div>
          )}
          {colorHilo && (
            <div className="flex gap-1">
              <dt className="text-slate-400 dark:text-slate-500">Hilo:</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-200 break-words">
                {colorHilo}
              </dd>
            </div>
          )}
          {pantones && (
            <div className="flex gap-1">
              <dt className="text-slate-400 dark:text-slate-500">Pantones:</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-200 break-words">
                {pantones}
              </dd>
            </div>
          )}
        </dl>
      )}

      {tecnicas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tecnicas.map(({ key, label }) => (
            <span
              key={key}
              className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Códigos de las ubicaciones, en el orden en que llegan y sin los vacíos.
 * Alimenta el texto del disparador: en datos reales son `["B", "A"]`, así que
 * enseñarlos hace visible desde la fila —sin abrir el popover— cuántos bordados
 * lleva la prenda y cuáles son.
 */
const ubicacionCodes = (ubicaciones: EmbroideryOnboardingUbicacion[]): string[] =>
  ubicaciones
    .map((ubicacion) => cleanText(ubicacion.codigo))
    .filter((codigo): codigo is string => codigo !== null);

interface EmbroideryLineLocationPopoverProps {
  /**
   * TODAS las ubicaciones de la línea, en el orden del `bordado_config`. Quien
   * lo llame ya garantiza que el arreglo no viene vacío (sin ubicaciones no hay
   * popover que abrir, ver los dos consumidores).
   */
  ubicaciones: EmbroideryOnboardingUbicacion[];
  /** Nombre del producto — para el nombre accesible del disparador. */
  productoNombre: string;
  /**
   * Talla y color de la línea. NO son decorativos: todas las líneas de un
   * pedido suelen compartir producto, así que sin ellos los disparadores de
   * cada fila quedarían con un nombre accesible idéntico y quien navega por
   * teclado o lector de pantalla no podría distinguirlos.
   */
  tallaNombre: string | null;
  colorNombre: string | null;
  /**
   * Código de posición ya resuelto (`posicion_sugerida`). Puede ser `null`: el
   * backend lo deriva del `codigo`/`nombre` de la ubicación y una captura sin
   * ninguno de los dos lo deja vacío, en cuyo caso el disparador se rotula solo
   * con "Detalle del bordado" en vez de con un "Posición:" colgando.
   */
  posicionLabel: string | null;
}

/**
 * Detalle del bordado de una línea, en un POPOVER anclado a su disparador.
 *
 * Popover y no un segundo `MainDialog`: el Paso 2 ya vive dentro de un diálogo
 * modal, y apilar otro encima pelea por el foco, por la tecla Escape y por el
 * bloqueo de scroll del primero. `Popover` de Radix Themes resuelve eso solo
 * (capas anidadas de `DismissableLayer`): Escape cierra ESTE popover sin cerrar
 * el diálogo, el foco vuelve al disparador al cerrarse y el disparador es
 * navegable por teclado sin manejar nada a mano. Se usa el mismo paquete que ya
 * provee `DropdownMenu`/`Tabs` en el proyecto — sin librería nueva.
 *
 * Pinta TODAS las ubicaciones de la línea, apiladas. Antes pintaba siempre
 * `ubicaciones[0]`, apoyado en que ninguna talla real traía más de una: eso ya
 * no es cierto. La distribución actual de `PedidoDetalleTalla.bordado_config
 * .ubicaciones` entre las tallas CON bordado es `{0: 1, 1: 47, 2: 4}` —las
 * cuatro de dos son de P-00027-2026, con códigos `["B", "A"]` e imagen distinta
 * cada una—, así que quedarse con la primera escondía un bordado entero.
 *
 * Una prenda con varios bordados sigue siendo UNA línea de la orden: las
 * ubicaciones se apilan DENTRO del popover, nunca convierten la fila en varias.
 *
 * Se apilan en vertical (no pestañas ni carrusel): con dos o tres entradas,
 * verlas juntas permite compararlas de un vistazo, y cualquier chrome de
 * navegación sería ruido permanente para el caso dominante —47 de 52 líneas
 * traen una sola—. El alto se acota con scroll interno, el mismo recurso que
 * `LineItemsTable` usa para las tablas incrustadas en diálogos.
 */
export function EmbroideryLineLocationPopover({
  ubicaciones,
  productoNombre,
  tallaNombre,
  colorNombre,
  posicionLabel,
}: EmbroideryLineLocationPopoverProps) {
  const codigos = ubicacionCodes(ubicaciones);
  const multiples = ubicaciones.length > 1;

  /**
   * Texto visible del disparador, reutilizado como PREFIJO de su nombre
   * accesible. Va literal y al principio por WCAG 2.5.3 (Label in Name): si el
   * `aria-label` no contiene la etiqueta visible, quien maneja el equipo por voz
   * dice "clic en Posición A" y no encuentra nada. Detrás se añaden talla y
   * color, que son lo único que distingue una fila de otra cuando todas
   * comparten producto.
   *
   * Con UNA ubicación el texto es exactamente el de antes —`posicionLabel` lo
   * deriva el backend del `codigo` de esa misma ubicación—, así que el caso
   * dominante no cambia de aspecto. Con VARIAS se listan los códigos, de modo
   * que la fila comunica que hay más de un bordado sin tener que abrir el
   * popover.
   *
   * Se listan los códigos SOLO si TODAS las ubicaciones traen uno: `codigos`
   * descarta los vacíos, así que con "2 ubicaciones, 1 con código" un
   * `Posiciones: B` diría "una" mientras el distintivo «N bordados» y el
   * `aria-label` dicen "dos". Cuando falta algún código se cae al conteo, que
   * concuerda con ambos.
   */
  const triggerText = multiples
    ? codigos.length === ubicaciones.length
      ? `Posiciones: ${codigos.join(", ")}`
      : `${ubicaciones.length} ubicaciones`
    : posicionLabel
      ? `Posición: ${posicionLabel}`
      : "Detalle del bordado";
  const triggerAriaLabel = [
    `${triggerText}.`,
    multiples
      ? `Ver detalle de los ${ubicaciones.length} bordados de ${productoNombre}`
      : `Ver detalle del bordado de ${productoNombre}`,
    tallaNombre ? `talla ${tallaNombre}` : null,
    colorNombre ? `color ${colorNombre}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:border-sky-300 hover:text-sky-700 dark:hover:border-sky-500/40 dark:hover:text-sky-300 transition-colors cursor-pointer"
          aria-label={triggerAriaLabel}
        >
          <InfoIcon className="w-3 h-3" />
          {triggerText}
        </button>
      </Popover.Trigger>

      {/* 300px con varias ubicaciones y los 280px de siempre con una: el ancho
          extra solo hace falta cuando hay que separar entradas, y ensanchar
          también el caso dominante movería una tarjeta que hoy está bien. */}
      <Popover.Content
        size="1"
        width={multiples ? "300px" : "280px"}
        side="top"
        align="start"
      >
        {/* Alto acotado con scroll interno SOLO cuando hay varias: dos entradas
            con imagen miden ~419px y el hueco encima del disparador dentro del
            diálogo del asistente es de ~331px, así que sin tope el popover se
            sale por ARRIBA de la pantalla (medido: `top: -78px`) y la primera
            ubicación queda inalcanzable — no basta con que el contenido tenga
            scroll si su borde superior está fuera del viewport.

            El tope es `--radix-popover-content-available-height`, la variable
            que Radix calcula para el hueco real del disparador, y NO un `60vh`
            fijo: el mismo popover se abre desde dos sitios con espacio muy
            distinto (la tabla del Paso 2 y el diálogo de detalle), así que
            cualquier número fijo acierta en uno y falla en el otro. Se le
            restan los `12px` de padding que `Popover.Content` pone arriba y
            abajo. El `60vh` queda solo como respaldo por si la variable no
            estuviera definida.

            Es el mismo recurso (`max-h-* overflow-y-auto`) que `LineItemsTable`
            aplica a las tablas incrustadas en diálogos. Con UNA sola entrada no
            se pone tope, para no introducir una barra de scroll donde hoy no la
            hay. */}
        <div
          className={
            multiples
              ? "max-h-[calc(var(--radix-popover-content-available-height,60vh)-1.5rem)] overflow-y-auto divide-y divide-slate-100 dark:divide-white/10"
              : undefined
          }
        >
          {/* Encabezado de conteo, solo con varias. Es lo primero que se lee al
              abrir y evita que quien vea la primera entrada crea que es todo lo
              que hay —justo el error que este cambio viene a corregir—. */}
          {multiples && (
            <p className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {ubicaciones.length} ubicaciones
            </p>
          )}

          {ubicaciones.map((ubicacion, index) => (
            <div
              // `index` como llave: el `bordado_config` es JSON libre y no trae
              // ningún id por ubicación —ni `codigo` sirve, puede faltar o
              // repetirse—. El arreglo no se reordena ni se filtra en esta
              // pantalla, así que la posición es estable mientras el popover
              // está abierto.
              key={index}
              // `pt-2` en TODAS las entradas (no solo a partir de la segunda):
              // el `divide-y` del contenedor también dibuja el separador entre
              // el encabezado de conteo y la primera, así que sin el padding
              // esa entrada quedaría pegada a la línea.
              className={multiples ? "pt-2" : undefined}
            >
              <UbicacionDetail
                ubicacion={ubicacion}
                productoNombre={productoNombre}
                ordinalLabel={multiples ? `${index + 1}.` : null}
              />
            </div>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
