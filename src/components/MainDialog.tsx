'use client';

import { Dialog, Flex } from '@radix-ui/themes';
import React from 'react';
import { Button } from './Button';
import { XIcon } from './Icons';
import { isEscapeFromSelect } from '../utils/dialogEscape';

interface MainDialogProps {
  trigger?: React.ReactNode; // El botón o elemento que abre el modal
  title: React.ReactNode | string;
  description?: string;
  children: React.ReactNode; // El contenido dinámico (form, lista, etc.)
  maxWidth?: string;
  actionButton?: React.ReactNode; // Botón de acción principal opcional (ej: Guardar)
  actionButtonClose?: boolean;
  /** Muestra u oculta el botón rojo "Cerrar" en el pie del diálogo. Por defecto: true. */
  showCloseButton?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Se pasa tal cual a `Dialog.Content`. Corre cuando el diálogo YA se
   * desmontó, así que es el único punto seguro para abrir otro diálogo a
   * continuación (encadenar dos `Dialog.Root` en el mismo commit deja el
   * bloqueo de foco/scroll de Radix a medias). Mismo recurso que usa
   * `GlobalSearchPalette` para abrir el detalle de cotización al cerrarse.
   */
  onCloseAutoFocus?: (event: Event) => void;
  /**
   * Acción del encabezado, junto al título (p. ej. `DocumentPdfButton` en el
   * detalle de un documento). Sin ella, el encabezado es el de siempre.
   */
  headerAction?: React.ReactNode;
}

export function MainDialog({
  trigger,
  title,
  description,
  children,
  maxWidth = "450px",
  actionButton,
  actionButtonClose = true,
  showCloseButton = true,
  open,
  onOpenChange,
  onCloseAutoFocus,
  headerAction,
}: MainDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <Dialog.Trigger>
          {trigger}
        </Dialog.Trigger>
      )}

      <Dialog.Content
        maxWidth={maxWidth}
        onPointerDownOutside={(event) => event.preventDefault()}
        // Escape desde un `<select>` (su lista abierta, en Firefox) no cierra el
        // diálogo ni pierde lo capturado (EC-922). Desde cualquier otro lado,
        // Escape sigue cerrándolo.
        onEscapeKeyDown={(event) => {
          if (isEscapeFromSelect(event)) event.preventDefault();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
        className="bg-white! dark:bg-zinc-900! dark:text-white!"
      >
        {headerAction ? (
          // El título y la acción en una fila. Al angostarse, la acción baja
          // debajo del título. La acción va FUERA de `Dialog.Title` para no
          // entrar en el nombre accesible del diálogo.
          //
          // Con un `DialogHeader` como título, el divisor lo dibuja la FILA (a
          // todo lo ancho, debajo del título y de la acción) y `DialogHeader`
          // apaga el suyo, que solo medía la columna del título. El espacio de
          // la X pasa de la fila a la acción, y al texto del título vía
          // `--dialog-close-clearance` (por si la acción baja y el título queda
          // solo bajo la X). `mb-7` = el `mb-4` de `DialogHeader` + el `mb-3`
          // de la fila, para que el contenido quede donde estaba.
          //
          // Con cualquier otro título no hay divisor: la fila conserva su
          // `pr-10` y su `mb-3` de siempre. El margen va como clase y no como
          // prop `mb` de `Flex`: el CSS de Radix no está en una capa y le
          // ganaría a la variante `has-*`.
          <Flex
            align="start"
            justify="between"
            gap="3"
            wrap="wrap"
            data-dialog-header-row=""
            className="group/header-row mb-3 pr-10 has-[[data-dialog-header]]:mb-7 has-[[data-dialog-header]]:pr-0 has-[[data-dialog-header]]:pb-4 has-[[data-dialog-header]]:border-b has-[[data-dialog-header]]:border-slate-200 dark:has-[[data-dialog-header]]:border-white/10"
          >
            <Dialog.Title mb="0" className="min-w-0 [--dialog-close-clearance:2.5rem]">
              {title}
            </Dialog.Title>
            {/* `min-w-0` y no `shrink-0`: si la acción no cabe ni en su propia
                línea (varios botones en un teléfono), se encoge al ancho de la
                fila y sus botones bajan, en vez de salirse del diálogo. En
                escritorio no cambia nada: la fila parte en líneas antes de
                encoger a nadie. */}
            <div className="min-w-0 group-has-[[data-dialog-header]]/header-row:pr-10">{headerAction}</div>
          </Flex>
        ) : (
          // La X ocupa de 12 a 56 px del borde y el relleno de Radix solo deja
          // 24: un título largo ("Nueva Nota de Crédito" a 375 px) corría bajo
          // ella. Se aparta solo el TEXTO, no el título entero, para que el
          // divisor de `DialogHeader` siga llegando a la orilla: un título de
          // texto lleva el `pr-10` en su propio bloque, y `DialogHeader` lee
          // `--dialog-close-clearance` en su columna de texto.
          <Dialog.Title className="[--dialog-close-clearance:2.5rem]">
            {typeof title === "string" ? <span className="block pr-10">{title}</span> : title}
          </Dialog.Title>
        )}

        {description && (
          <Dialog.Description size="2" mb="4">
            {description}
          </Dialog.Description>
        )}

        {/* Contenido dinámico. `contain: inline-size`: el ancho mínimo del
            contenido (p. ej. una tabla con celdas sin salto de línea) ya no
            sube hasta el relleno de Radix (`.rt-BaseDialogScrollPadding`, un
            hijo flex con `min-width: auto`), que antes crecía a ese ancho y
            sacaba el diálogo —y su encabezado— del viewport en un teléfono.
            El diálogo conserva su ancho (100% hasta `maxWidth`) y lo ancho
            hace scroll dentro de su propio contenedor (`LineItemsTable`) o del
            diálogo. Va aquí y no en CSS global para no tocar los diálogos de
            Radix que no usan `MainDialog` (la paleta de búsqueda). */}
        <div className="[contain:inline-size]">{children}</div>

        <Flex gap="3" mt="4" justify="end">
          {showCloseButton && (
            <Dialog.Close>
              <Button variant="danger">
                Cerrar
              </Button>
            </Dialog.Close>
          )}
          {actionButton &&
            (actionButtonClose ? (
              <Dialog.Close>{actionButton}</Dialog.Close>
            ) : (
              actionButton
            ))}
        </Flex>

        {/* X de cierre, arriba a la derecha. `Dialog.Close` de Radix Themes no
            pinta un elemento propio: fusiona sus props sobre su único hijo, así
            que el hijo tiene que ser el `<button>` (con el icono SOLO como
            adorno) para que reciba foco, se active con Enter/Espacio y se
            anuncie como botón. Va al FINAL del contenido, aunque se vea arriba:
            al abrir, Radix enfoca el primer elemento tabulable, y con la X
            primero el foco dejaría de caer en el primer campo del diálogo. Si
            el diálogo no tiene NINGÚN otro control enfocable (sin "Cerrar" en
            el pie, sin `actionButton` y con un cuerpo de solo lectura), el foco
            inicial cae en la X: es a propósito, y el título se sigue anunciando
            porque nombra al diálogo. */}
        <Dialog.Close>
          <button
            type="button"
            aria-label="Cerrar diálogo"
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <XIcon className="w-8 h-8" aria-hidden="true" />
          </button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}
