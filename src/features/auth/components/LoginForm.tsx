"use client";

import { useState } from "react";
import { CheckCircleIcon, EmailIcon, EyeIcon, EyeOffIcon, LockIcon, LoadingSpinnerIcon } from "../../../components/Icons";
import { useLoginForm } from "../hooks/useLoginForm";
import type { LoginSuccessResponse } from "../interfaces/auth.interface";

interface LoginFormProps {
  onShowMfaOptIn: (data: LoginSuccessResponse) => void;
  onMfaRequired: (data: LoginSuccessResponse) => void;
  showMfaConfirmedBanner?: boolean;
  onDismissBanner?: () => void;
}

export default function LoginForm({
  onShowMfaOptIn,
  onMfaRequired,
  showMfaConfirmedBanner,
  onDismissBanner,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    form,
    isPending,
    clearFieldErrors,
    validateField,
    getError,
    handleFormSubmit,
  } = useLoginForm({
    onShowMfaOptIn,
    onMfaRequired,
  });

  return (
    <form onSubmit={handleFormSubmit} className="w-full flex flex-col items-center justify-center">
            <h2 className="text-4xl text-slate-900 dark:text-white font-medium transition-colors brand-font">
              Iniciar sesión
            </h2>
            <p className="text-sm text-center text-slate-500/90 dark:text-slate-400 mt-3 transition-colors">
              ¡Bienvenido de nuevo! Por favor, inicia sesión para continuar
            </p>

            {/* Banner: autenticación MFA confirmada */}
            {showMfaConfirmedBanner && (
              <div className="mt-6 w-full flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="flex-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                  Autenticación en dos pasos activada correctamente. Ingresa tus credenciales para continuar.
                </p>
                {onDismissBanner && (
                  <button
                    type="button"
                    onClick={onDismissBanner}
                    aria-label="Cerrar aviso"
                    className="shrink-0 cursor-pointer text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <form.Field name="email">
              {(field) => (
                <div className="mt-8 w-full">
                  <div
                    className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 transition-colors ${
                      getError("email")
                        ? "border-red-400/90 dark:border-red-500/70"
                        : "border-slate-300/60 dark:border-white/10 focus-within:border-sky-500 dark:focus-within:border-sky-500"
                    }`}
                  >
                    <EmailIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-300 transition-colors" />
                    <input
                      type="email"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("email");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("email", field.state.value);
                      }}
                      placeholder="Correo electrónico"
                      autoComplete="email"
                      aria-invalid={Boolean(getError("email"))}
                      className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors [--input-current-color:var(--color-slate-900)] dark:[--input-current-color:white]"
                      disabled={isPending}
                    />
                  </div>
                  {getError("email") && (
                    <p className="mt-2 px-2 text-xs text-red-500 dark:text-red-400">
                      {getError("email")?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="mt-6 w-full">
                  <div
                    className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 pr-4 gap-2 transition-colors ${
                      getError("password")
                        ? "border-red-400/90 dark:border-red-500/70"
                        : "border-slate-300/60 dark:border-white/10 focus-within:border-sky-500 dark:focus-within:border-sky-500"
                    }`}
                  >
                    <LockIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-300 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("password");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("password", field.state.value);
                      }}
                      placeholder="Contraseña"
                      autoComplete="current-password"
                      aria-invalid={Boolean(getError("password"))}
                      className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-50"
                      disabled={isPending}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {getError("password") && (
                    <p className="mt-2 px-2 text-xs text-red-500 dark:text-red-400">
                      {getError("password")?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="w-full flex items-center justify-center mt-8 text-slate-500/80 dark:text-slate-400 transition-colors">
              <a className="text-sm underline hover:text-sky-500" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-8 w-full h-11 rounded-full cursor-pointer text-white bg-sky-500 hover:opacity-90 transition-opacity font-medium shadow-lg shadow-sky-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <LoadingSpinnerIcon className="w-5 h-5 animate-spin" />
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>
  );
}
