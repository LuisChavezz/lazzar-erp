"use client";

import { useSession } from "next-auth/react";
import { DropdownMenu } from "@radix-ui/themes";
// import { SettingsIcon } from "./Icons";

// Local icons for this component
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const HelpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const UserMenu = () => {
  const { data: session } = useSession();

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";
  const userEmail = session?.user?.email || "usuario@ejemplo.com";
  const userName = session?.user?.name || "Usuario";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-sky-500 to-cyan-500 ring-2 ring-white dark:ring-slate-800 cursor-pointer shadow-lg shadow-sky-500/20 flex items-center justify-center text-white font-bold text-sm select-none hover:opacity-90 transition-opacity">
          {userInitial}
        </div>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Content align="end" className="bg-white! dark:bg-zinc-900! min-w-55 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
        </div>

        <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400">
          <UserIcon className="w-4 h-4" />
          Perfil
        </DropdownMenu.Item>
        
        {/* <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400">
          <SettingsIcon className="w-4 h-4" />
          Configuración
        </DropdownMenu.Item> */}
        
        <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400">
          <HelpIcon className="w-4 h-4" />
          Ayuda
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
