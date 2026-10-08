"use client";

import { Popover } from "@radix-ui/themes";
import { InfoIcon } from "./Icons";

/**
 * Icono ⓘ que muestra un texto largo en un popover (Radix Themes, mismo
 * componente que `EmbroideryLineLocationPopover`). Se abre con clic o toque en
 * cualquier dispositivo —un tooltip de hover no se abre en táctil— y desde el
 * teclado con Enter/Espacio; Escape o un clic fuera lo cierran y el foco vuelve
 * al botón.
 *
 * Archivo cliente aparte porque `KpiGrid` no lleva `"use client"` (lo pueden
 * montar Server Components) y el popover necesita estado.
 */
export function KpiInfoPopover({ label, text }: { label: string; text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={`Más información: ${label}`}
          className="shrink-0 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <InfoIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Content size="1" maxWidth="280px" side="bottom" align="end">
        <p className="text-xs text-slate-600 dark:text-slate-300">{text}</p>
      </Popover.Content>
    </Popover.Root>
  );
}
