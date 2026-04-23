"use client";

import { GoogleCalendarIcon, GoogleDriveIcon, GoogleIcon, GmailIcon } from "@/src/components/Icons";
import { useGoogleConnect } from "../hooks/useGoogleConnect";
import { useGoogleDisconnect } from "../hooks/useGoogleDisconnect";
import { useGoogleStatus } from "../hooks/useGoogleStatus";
import { hasScope } from "../utils/google-scope.utils";
import { GoogleCardSkeleton } from "./GoogleCardSkeleton";
import { PermissionBadge } from "./PermissionBadge";

// ─── Componente principal ─────────────────────────────────────────────────────

export const GoogleAccountCard = () => {
  const { data: status, isLoading } = useGoogleStatus();
  const { mutate: disconnect, isPending: isDisconnecting } = useGoogleDisconnect();
  const { mutate: connect, isPending: isConnecting } = useGoogleConnect();

  const scope = status?.scope;
  const hasDrive = hasScope(scope, "drive");
  const hasGmail = hasScope(scope, "gmail");
  const hasCalendar = hasScope(scope, "calendar");

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 overflow-hidden h-fit">

      {/* Cuerpo de la tarjeta */}
      <div className="p-6 space-y-4">
        {isLoading ? (
          <GoogleCardSkeleton />
        ) : (
          <>
            {/* Encabezado: logo + título + badge de estado */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm shrink-0">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Servicios integrados</p>
                </div>
              </div>

              {/* Badge de estado de conexión */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${
                  status?.connected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    status?.connected ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {status?.connected ? "Conectado" : "Desconectado"}
              </span>
            </div>

            {/* Contenido según el estado */}
            {status?.connected ? (
              /* Estado: conectado — muestra email y botón desconectar */
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {status.account_email && (
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {status.account_email}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cuenta enlazada correctamente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  disabled={isDisconnecting}
                  className="shrink-0 rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium cursor-pointer text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? "Desconectando…" : "Desconectar"}
                </button>
              </div>
            ) : (
              /* Estado: desconectado — muestra descripción y botón conectar */
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conecta tu cuenta para acceder a Drive, Gmail y Calendar desde la app.
                </p>
                <button
                  type="button"
                  onClick={() => connect(window.location.href)}
                  disabled={isConnecting}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon className="w-3.5 h-3.5" />
                  {isConnecting ? "Conectando…" : "Conectar"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: permisos concedidos (solo cuando está conectado) */}
      {!isLoading && status?.connected && (
        <div className="px-5 py-3 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 mr-1 shrink-0">Permisos:</span>
          <PermissionBadge
            icon={<GoogleDriveIcon className="w-4 h-4" />}
            label="Drive"
            granted={hasDrive}
          />
          <PermissionBadge
            icon={<GmailIcon className="w-4 h-4" />}
            label="Gmail"
            granted={hasGmail}
          />
          <PermissionBadge
            icon={<GoogleCalendarIcon className="w-4 h-4" />}
            label="Calendar"
            granted={hasCalendar}
          />
        </div>
      )}
    </div>
  );
};
