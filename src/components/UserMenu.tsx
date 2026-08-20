"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DropdownMenu } from "@radix-ui/themes";
import { LogoutIcon, SettingsIcon } from "./Icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { GoogleMenuOption } from "@/src/features/google/components/GoogleMenuOption";
import { useSettingsModal } from "@/src/features/settings/hooks/useSettingsModal";
import { useLogout } from "@/src/features/auth/hooks/useLogout";

export const UserMenu = () => {
  const { data: session } = useSession();
  const { open: openSettings } = useSettingsModal();
  const { handleLogout, isPending: isLoggingOut } = useLogout();
  /* El diálogo se controla por estado porque su trigger vivía dentro del
   * DropdownMenu, que se desmonta al seleccionar un item */
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";
  const userEmail = session?.user?.email || "usuario@ejemplo.com";
  const userName = session?.user?.name || "Usuario";

  return (
    <>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          aria-label="Abrir menú de usuario"
          className="w-8 h-8 rounded-full cursor-pointer bg-linear-to-tr from-sky-500 to-cyan-500 ring-2 ring-white dark:ring-slate-800 shadow-lg shadow-sky-500/20 flex items-center justify-center text-white font-bold text-sm select-none hover:opacity-90 transition-opacity"
        >
          {userInitial}
        </button>
      </DropdownMenu.Trigger>

      
      <DropdownMenu.Content align="end" className="bg-white! dark:bg-zinc-900! min-w-55 rounded-xl shadow-xl  z-50">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 mb-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
        </div>

        <DropdownMenu.Item
          onSelect={() => openSettings("general")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out"
        >
          <SettingsIcon className="w-4 h-4" />
          Ajustes
        </DropdownMenu.Item>

        {/* Opción dinámica de Google (skeleton / conectar / conectado) */}
        <GoogleMenuOption />

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

        <DropdownMenu.Item
          onSelect={() => setIsLogoutConfirmOpen(true)}
          disabled={isLoggingOut}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg cursor-pointer! outline-none data-highlighted:bg-red-50 dark:data-highlighted:bg-red-900/10 data-highlighted:text-red-600 dark:data-highlighted:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed! transition-colors ease-in-out"
        >
          <LogoutIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
        </DropdownMenu.Item>

      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <ConfirmDialog
      open={isLogoutConfirmOpen}
      onOpenChange={setIsLogoutConfirmOpen}
      title="Cerrar sesión"
      description="¿Estás seguro de que deseas cerrar sesión?"
      onConfirm={handleLogout}
      confirmText="Cerrar sesión"
    />
    </>
  );
};
