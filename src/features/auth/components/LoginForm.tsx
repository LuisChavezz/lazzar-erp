"use client";

import { useState } from "react";
import { EmailIcon, EyeIcon, EyeOffIcon, LockIcon, LoadingSpinnerIcon } from "../../../components/Icons";
import { useLogin } from "../hooks/useLogin";

export default function LoginForm() {
  const { formData, loading, handleChange, handleSubmit } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="md:w-96 w-80 flex flex-col items-center justify-center">
      <h2 className="text-4xl text-slate-900 dark:text-white font-medium transition-colors brand-font">
        Iniciar sesión
      </h2>
      <p className="text-sm text-center text-slate-500/90 dark:text-slate-400 mt-3 transition-colors">
        ¡Bienvenido de nuevo! Por favor, inicia sesión para continuar
      </p>
      
      <div className="flex items-center mt-8 w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <EmailIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-300 transition-colors" />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Correo electrónico"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors [--input-current-color:var(--color-slate-900)] dark:[--input-current-color:white]"
          required
          disabled={loading}
        />
      </div>

      <div className="flex items-center mt-6 w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 pr-4 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <LockIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-300 transition-colors" />
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Contraseña"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors"
          required
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {showPassword ? (
            <EyeOffIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="w-full flex items-center justify-center mt-8 text-slate-500/80 dark:text-slate-400 transition-colors">
        <a className="text-sm underline hover:text-sky-500" href="#">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-8 w-full h-11 rounded-full cursor-pointer text-white bg-sky-500 hover:opacity-90 transition-opacity font-medium shadow-lg shadow-sky-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <LoadingSpinnerIcon className="w-5 h-5 animate-spin" />
        ) : (
          "Iniciar sesión"
        )}
      </button>
    </form>
  );
}
