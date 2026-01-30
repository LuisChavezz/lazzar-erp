"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type SidebarItem as SidebarItemType } from "../constants/sidebarItems";

interface SidebarItemProps {
  item: SidebarItemType;
  variant?: "desktop" | "mobile";
  setIsMobileOpen?: (isOpen: boolean) => void;
}

export default function SidebarItem({
  item,
  variant = "desktop",
  setIsMobileOpen,
}: SidebarItemProps) {
  const pathname = usePathname();

  // Determine if the item is active based on the current path
  // We handle the root path "/" specifically to avoid matching everything
  const isActive =
    (item.href === "/")
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  if (variant === "mobile") {
    return (
      <Link
        href={item.href}
        className={`block px-4 py-3 rounded-xl font-medium ${
          isActive
            ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300"
            : "text-slate-600 dark:text-white hover:bg-sky-50 dark:hover:bg-white/5"
        }`}
        onClick={() => setIsMobileOpen?.(false)}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors group relative ${
        isActive
          ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300"
          : "hover:bg-sky-50 dark:hover:bg-sky-500/10 text-slate-500 dark:text-white hover:text-sky-600 dark:hover:text-sky-300"
      }`}
    >
      <item.icon className="w-6 h-6 shrink-0" />
      <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 absolute left-14">
        {item.label}
      </span>
    </Link>
  );
}
