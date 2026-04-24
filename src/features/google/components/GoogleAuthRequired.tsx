"use client";

import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { GoogleIcon } from "@/src/components/Icons";
import { useGoogleStatus } from "../hooks/useGoogleStatus";
import { useGoogleConnect } from "../hooks/useGoogleConnect";

// --- Props ---

interface GoogleAuthRequiredProps {
  /** Contenido que se renderiza únicamente cuando la conexión está activa. */
  children: React.ReactNode;
  /**
   * Nombre de la funcionalidad que requiere la conexión con Google.
   * Se muestra en el título del estado desconectado.
   * @example "Correos de Gmail", "Tareas de Google"
   */
  featureName?: string;
  /**
   * Descripción adicional que explica qué habilita la conexión.
   * Si no se especifica, se usa un mensaje genérico.
   */
  description?: string;
  /**
   * Ícono representativo de la funcionalidad, renderizado sobre el logo de Google.
   * Se espera un nodo de React (ej. un componente SVG de Icons.tsx).
   */
  icon?: React.ReactNode;
}

// --- Sub-componente: estado desconectado ---

interface GoogleNotConnectedProps {
  featureName: string;
  description: string;
  icon?: React.ReactNode;
  onConnect: () => void;
  isConnecting: boolean;
}

/**
 * Estado visual que se presenta cuando el usuario no tiene su cuenta de
 * Google conectada. Incluye el logo de Google, una descripción de la
 * funcionalidad bloqueada y un botón para iniciar el flujo OAuth.
 */
const GoogleNotConnected = ({
  featureName,
  description,
  icon,
  onConnect,
  isConnecting,
}: GoogleNotConnectedProps) => (
  <div
    role="status"
    aria-label={`Se requiere conexión con Google para acceder a ${featureName}`}
    className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
  >
    {/* Fondo con patrón de puntos sutil */}
    <div
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
      style={{
        backgroundImage:
          "radial-gradient(circle, currentColor 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      aria-hidden="true"
    />

    {/* Contenido centrado */}
    <div className="relative flex flex-col items-center justify-center gap-6 px-8 py-14 text-center">
      {/* Grupo de íconos: logo Google + ícono de funcionalidad */}
      <div className="relative flex items-end justify-center" aria-hidden="true">
        {/* Ícono de funcionalidad (opcional) — posicionado en la parte superior */}
        {icon && (
          <div className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {icon}
          </div>
        )}

        {/* Logo de Google con anillo suave */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md ring-4 ring-brand-100/60 dark:border-slate-600 dark:bg-slate-800 dark:ring-slate-700/80">
          <GoogleIcon className="w-10 h-10" />
        </div>
      </div>

      {/* Encabezado y descripción */}
      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Conecta tu cuenta de Google
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Botón para iniciar el flujo OAuth */}
      <button
        type="button"
        onClick={onConnect}
        disabled={isConnecting}
        className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 ease-in-out hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-slate-700 dark:hover:text-brand-300"
      >
        {isConnecting ? (
          <>
            {/* Spinner de carga con la forma de Google */}
            <span
              className="w-4 h-4 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin shrink-0"
              aria-hidden="true"
            />
            Conectando…
          </>
        ) : (
          <>
            <GoogleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            Conectar con Google
          </>
        )}
      </button>

      {/* Texto de privacidad */}
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
        Solo se solicitan los permisos necesarios para{" "}
        <span className="font-medium text-slate-500 dark:text-slate-400">
          {featureName}
        </span>
        . Puedes desconectar tu cuenta en cualquier momento desde{" "}
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Ajustes → Seguridad
        </span>
        .
      </p>
    </div>
  </div>
);

// --- Componente principal ---

/**
 * Guardia de autenticación de Google.
 *
 * Verifica si el usuario tiene su cuenta de Google conectada antes de
 * renderizar el contenido protegido (`children`).
 *
 * Flujo de renderizado:
 * 1. **Cargando** — muestra un skeleton mientras se consulta el estado.
 * 2. **No conectado** — muestra `GoogleNotConnected` con el botón de conexión OAuth.
 * 3. **Conectado** — renderiza `children` directamente.
 *
 * @example
 * 
 * En la página de correos:
 * <GoogleAuthRequired
 *   featureName="Correos de Gmail"
 *   description="Conecta tu cuenta para leer y enviar correos desde el ERP."
 *   icon={<GmailIcon className="w-4 h-4" />}
 * >
 *   <EmailInbox />
 * </GoogleAuthRequired>
 */
export const GoogleAuthRequired = ({
  children,
  featureName = "esta funcionalidad",
  description = "Conecta tu cuenta de Google para acceder a los servicios integrados desde el ERP.",
  icon,
}: GoogleAuthRequiredProps) => {
  const { data: status, isLoading } = useGoogleStatus();
  const { mutate: connect, isPending: isConnecting } = useGoogleConnect();

  /* Estado: verificando conexión */
  if (isLoading) {
    return <LoadingSkeleton className="h-64 rounded-2xl" />;
  }

  /* Estado: no conectado */
  if (!status?.connected) {
    return (
      <GoogleNotConnected
        featureName={featureName}
        description={description}
        icon={icon}
        onConnect={() => connect(window.location.href)}
        isConnecting={isConnecting}
      />
    );
  }

  /* Estado: conectado — renderiza el contenido protegido */
  return <>{children}</>;
};
