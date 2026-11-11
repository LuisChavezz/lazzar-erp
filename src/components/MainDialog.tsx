'use client';

import { Dialog, Flex } from '@radix-ui/themes';
import React from 'react';
import { Button } from './Button';
import { XIcon } from './Icons';

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
        onCloseAutoFocus={onCloseAutoFocus}
        className="bg-white! dark:bg-zinc-900! dark:text-white!"
      >
        {/* Botón X de cierre en la esquina superior derecha */}
        <Dialog.Close
          aria-label="Cerrar diálogo"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <XIcon className="w-8 h-8" aria-hidden="true" />
        </Dialog.Close>

        {headerAction ? (
          // El título y la acción en una fila; `pr-10` deja libre la X de
          // cierre (absoluta, arriba a la derecha). Al angostarse, la acción
          // baja debajo del título. La acción va FUERA de `Dialog.Title` para
          // no entrar en el nombre accesible del diálogo.
          <Flex align="start" justify="between" gap="3" wrap="wrap" mb="3" className="pr-10">
            <Dialog.Title mb="0" className="min-w-0">
              {title}
            </Dialog.Title>
            <div className="shrink-0">{headerAction}</div>
          </Flex>
        ) : (
          <Dialog.Title>{title}</Dialog.Title>
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
      </Dialog.Content>
    </Dialog.Root>
  );
}
