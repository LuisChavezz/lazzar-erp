"use client";

import type { ComponentType, SVGProps } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import { useSession } from "next-auth/react";
import { DotsVerticalIcon } from "./Icons";
import { hasPermission } from "@/src/utils/permissions";

export type ActionMenuItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onSelect?: () => void;
  disabled?: boolean;
  permission?: string;
  visible?: boolean;
};

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  align?: "start" | "center" | "end";
}

export const ActionMenu = ({
  items,
  ariaLabel = "Abrir menú de acciones",
  align = "end",
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          aria-label={ariaLabel}
          className="p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-sky-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <DotsVerticalIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align={align}
        className="bg-white! dark:bg-zinc-900! min-w-48 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenu.Item
              key={item.label}
              onClick={item.onSelect}
              disabled={item.disabled}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 data-disabled:opacity-50 data-disabled:cursor-not-allowed"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{item.label}</span>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
