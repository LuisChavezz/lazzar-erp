"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import { useSession } from "next-auth/react";
import { DotsVerticalIcon } from "./Icons";
import { hasPermission } from "@/src/utils/permissions";
import Link from "next/link";

const ITEM_CLASS =
  "flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 data-disabled:opacity-50 data-disabled:cursor-not-allowed transition-colors ease-in-out";

export type ActionMenuItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onSelect?: () => void;
  disabled?: boolean;
  permission?: string;
  visible?: boolean;
  /** Evita que Radix cierre el menú al seleccionar — usar en acciones async cuyo label refleja un estado pendiente. */
  keepOpenOnSelect?: boolean;
  /**
   * Opcional: el item ES un enlace (`<Link>` de Next vía `asChild`), así que
   * clic medio y Ctrl+clic abren una pestaña nueva. Sin él, el item es el de
   * siempre (`onSelect`).
   */
  href?: string;
  /**
   * Opcional: texto secundario bajo la etiqueta, p. ej. el motivo de un item
   * deshabilitado. Sin él, el item se pinta exactamente como antes.
   */
  description?: string;
};

/**
 * Clases del item. Con `description` el item crece a su contenido: Radix Themes
 * fija `height: var(--base-menu-item-height)` (32px) en `.rt-BaseMenuItem`, una
 * regla sin capa que gana a las utilidades de Tailwind, así que se anula con
 * `!`. Sin descripción queda exactamente como antes.
 */
const itemClassName = (description?: string) =>
  description ? `${ITEM_CLASS} h-auto! min-h-8 py-1.5!` : ITEM_CLASS;

/** Etiqueta del item y, si la trae, su descripción debajo. */
const ItemText = ({ label, description }: { label: string; description?: string }) =>
  description ? (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span>{label}</span>
      <span className="max-w-64 whitespace-normal text-[11px] leading-snug text-slate-400 dark:text-slate-500">
        {description}
      </span>
    </span>
  ) : (
    <span>{label}</span>
  );

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  align?: "start" | "center" | "end";
  /**
   * Disparador personalizado que reemplaza el botón "⋮" por defecto — p. ej.
   * el folio/id de la fila, cuando ese dato ya funciona como la acción
   * principal ("ver detalle") y el resto del menú cuelga de él. Debe ser un
   * único elemento (Radix `DropdownMenu.Trigger` le reenvía sus props, igual
   * que al botón por defecto). Por defecto (`undefined`) conserva el botón
   * de puntos verticales de siempre.
   */
  trigger?: ReactNode;
}

export const ActionMenu = ({
  items,
  ariaLabel = "Abrir menú de acciones",
  align = "end",
  trigger,
}: ActionMenuProps) => {
  const { data: session } = useSession();
  const visibleItems = items.filter(
    (item) =>
      (item.visible ?? true) &&
      (!item.permission || hasPermission(item.permission, session?.user))
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    // `modal={false}` a propósito: los items suelen abrir un `MainDialog` en el
    // MISMO tick en que el menú se cierra. Con el menú modal, su
    // DismissableLayer y la del diálogo se traslapan sobre el mismo
    // `originalBodyPointerEvents` compartido y, al cerrar el diálogo con Escape,
    // el `body` se quedaba en `pointer-events: none` (página muerta al mouse).
    // Bug conocido de Radix: radix-ui/primitives#3317. No modal, el menú no toca
    // ese bloqueo y solo el diálogo lo gestiona.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger>
        {trigger ?? (
          <button
            type="button"
            aria-label={ariaLabel}
            className="p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-sky-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <DotsVerticalIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align={align}
        className="bg-white! dark:bg-zinc-900! min-w-48 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          if (item.href) {
            return (
              <DropdownMenu.Item
                key={index}
                asChild
                onSelect={() => item.onSelect?.()}
                disabled={item.disabled}
                className={itemClassName(item.description)}
              >
                <Link href={item.href}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <ItemText label={item.label} description={item.description} />
                </Link>
              </DropdownMenu.Item>
            );
          }
          return (
            <DropdownMenu.Item
              key={index}
              onSelect={(event) => {
                if (item.keepOpenOnSelect) event.preventDefault();
                item.onSelect?.();
              }}
              disabled={item.disabled}
              className={itemClassName(item.description)}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <ItemText label={item.label} description={item.description} />
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
