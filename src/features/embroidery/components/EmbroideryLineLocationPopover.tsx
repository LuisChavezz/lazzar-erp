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

interface EmbroideryLineLocationPopoverProps {
  ubicacion: EmbroideryOnboardingUbicacion;
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
 * Se pinta SIEMPRE `ubicaciones[0]`: en los datos reales ninguna talla tiene más
 * de una ubicación, así que no se construye lista ni carrusel para un caso que
 * no existe. Quien lo llame ya garantiza que el arreglo no viene vacío.
 *
 * Todos los campos se comprueban antes de pintarse: esto es la captura libre de
 * una cotización, no un contrato del serializer, y cualquier clave puede faltar
 * o llegar en blanco (`color_hilo` y `pantones` son `""` en el 100% de los
 * registros actuales, y por eso hoy no se ven).
 */
export function EmbroideryLineLocationPopover({
  ubicacion,
  productoNombre,
  tallaNombre,
  colorNombre,
  posicionLabel,
}: EmbroideryLineLocationPopoverProps) {
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
   * Texto visible del disparador, reutilizado como PREFIJO de su nombre
   * accesible. Va literal y al principio por WCAG 2.5.3 (Label in Name): si el
   * `aria-label` no contiene la etiqueta visible, quien maneja el equipo por voz
   * dice "clic en Posición A" y no encuentra nada. Detrás se añaden talla y
   * color, que son lo único que distingue una fila de otra cuando todas
   * comparten producto.
   */
  const triggerText = posicionLabel
    ? `Posición: ${posicionLabel}`
    : "Detalle del bordado";
  const triggerAriaLabel = [
    `${triggerText}.`,
    `Ver detalle del bordado de ${productoNombre}`,
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

      <Popover.Content size="1" width="280px" side="top" align="start">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
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
              /* La imagen SÍ está capturada pero no se pudo traer: el archivo
                 vive en un túnel externo que se cae, y la URL es la que guardó
                 la cotización. Sin este aviso el usuario ve un marco roto y no
                 distingue "este bordado no tiene imagen" de "el servidor de
                 archivos no responde". Mismo criterio que el respaldo "Sin
                 imagen" de `QuoteProductEmbroideryView`. */
              <p className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                No se pudo cargar la imagen del bordado.
              </p>
            ) : (
              <Image
                loader={externalImageLoader}
                unoptimized
                src={imagen}
                alt={`Bordado de ${productoNombre}`}
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
      </Popover.Content>
    </Popover.Root>
  );
}
