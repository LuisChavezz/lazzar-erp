"use client";

import Link from "next/link";
import { EmailIcon, LockIcon, LoadingSpinnerIcon } from "../../../components/Icons";
import { useLogin } from "../hooks/useLogin";

export default function LoginForm() {
  const { formData, loading, handleChange, handleSubmit } = useLogin();

  return (
    <form onSubmit={handleSubmit} className="md:w-96 w-80 flex flex-col items-center justify-center">
      <h2 className="text-4xl text-slate-900 dark:text-white font-medium transition-colors brand-font">
        Iniciar sesión
      </h2>
      <p className="text-sm text-center text-slate-500/90 dark:text-slate-400 mt-3 transition-colors">
        ¡Bienvenido de nuevo! Por favor, inicia sesión para continuar
      </p>
      
      <div className="flex items-center mt-8 w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <EmailIcon className="fill-slate-500 dark:fill-slate-300 transition-colors" width="16" height="11" />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Correo electrónico"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors [&:-webkit-autofill]:bg-transparent! [&:-webkit-autofill]:shadow-[0_0_0_1000px_transparent_inset]!"
          required
          disabled={loading}
        />
      </div>

      <div className="flex items-center mt-6 w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <LockIcon className="fill-slate-500 dark:fill-slate-300 transition-colors" width="13" height="17" />
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Contraseña"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors [&:-webkit-autofill]:bg-transparent! [&:-webkit-autofill]:shadow-[0_0_0_1000px_transparent_inset]!"
          required
          disabled={loading}
        />
      </div>

      <div className="w-full flex items-center justify-between mt-8 text-slate-500/80 dark:text-slate-400 transition-colors">
        <div className="flex items-center gap-2">
          <input
            className="h-5 w-5 text-sky-500 focus:ring-sky-400 border-slate-300 dark:border-white/10 rounded bg-transparent"
            type="checkbox"
            id="checkbox"
            disabled={loading}
          />
          <label className="text-sm cursor-pointer" htmlFor="checkbox">
            Recuérdame
          </label>
        </div>
        {/* <a className="text-sm underline hover:text-sky-500" href="#">
          ¿Olvidaste tu contraseña?
        </a> */}
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

      <p className="text-slate-500/90 dark:text-slate-400 text-sm mt-4 transition-colors">
        ¿No tienes una cuenta?{" "}
        <Link className="text-sky-400 hover:underline" href="/auth/register">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
