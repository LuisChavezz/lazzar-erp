"use client";

import { useRouter } from "next/navigation";
import { DropdownMenu } from "@radix-ui/themes";
import { GoogleIcon } from "@/src/components/Icons";
import { useGoogleConnect } from "../hooks/useGoogleConnect";
import { useGoogleStatus } from "../hooks/useGoogleStatus";

/* Skeleton con las mismas dimensiones que un DropdownMenu.Item */
function GoogleMenuItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg animate-pulse" aria-hidden>
      <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-32" />
    </div>
  );
}

/**
 * Opción del menú de usuario para la integración con Google.
 *
 * - Mientras carga el status: muestra un skeleton.
 * - Desconectado: ícono + "Conectar con Google" → inicia el flujo OAuth.
 * - Conectado: ícono + "Google" + pill verde "Conectado" → navega a /settings/security.
 */
export const GoogleMenuOption = () => {
  const { data: status, isLoading } = useGoogleStatus();
  const { mutate: connectGoogle, isPending: isConnecting } = useGoogleConnect();
  const router = useRouter();

  /* Estado de carga inicial */
  if (isLoading) {
    return <GoogleMenuItemSkeleton />;
  }

  /* Conectado: indicativo visual + redirige a la página de seguridad */
  if (status?.connected) {
    return (
      <DropdownMenu.Item
        onSelect={() => router.push("/settings/security")}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out"
      >
        <GoogleIcon className="w-4 h-4 shrink-0" />
        <span className="flex-1">Google</span>
        {/* Pill de estado conectado */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Conectado
        </span>
      </DropdownMenu.Item>
    );
  }

  /* Desconectado: mismo flujo OAuth que antes */
  return (
    <DropdownMenu.Item
      onSelect={() => connectGoogle(window.location.href)}
      disabled={isConnecting}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 disabled:opacity-50 disabled:cursor-not-allowed!"
    >
      <GoogleIcon className="w-4 h-4 shrink-0" />
      {isConnecting ? "Conectando…" : "Conectar con Google"}
    </DropdownMenu.Item>
  );
};
