import Image from "next/image";
import { EmailIcon, LockIcon } from "../../../components/Icons";

export default function LoginForm() {
  return (
    <form className="md:w-96 w-80 flex flex-col items-center justify-center">
      <h2 className="text-4xl text-slate-900 dark:text-white font-medium transition-colors brand-font">
        Iniciar sesión
      </h2>
      <p className="text-sm text-slate-500/90 dark:text-slate-400 mt-3 transition-colors">
        ¡Bienvenido de nuevo! Por favor, inicia sesión para continuar
      </p>
      <button
        type="button"
        className="w-full mt-8 bg-slate-500/10 dark:bg-white/5 flex items-center justify-center h-12 rounded-full cursor-pointer hover:bg-slate-500/20 dark:hover:bg-white/10 transition-colors border border-transparent dark:border-white/5"
      >
        <Image
          src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/login/googleLogo.svg"
          alt="googleLogo"
          width={78}
          height={78}
        />
      </button>
      <div className="flex items-center gap-4 w-full my-5">
        <div className="w-full h-px bg-slate-300/90 dark:bg-white/10 transition-colors"></div>
        <p className="w-full text-nowrap text-sm text-slate-500/90 dark:text-slate-500 transition-colors">
          o inicia sesión con tu correo
        </p>
        <div className="w-full h-px bg-slate-300/90 dark:bg-white/10 transition-colors"></div>
      </div>
      <div className="flex items-center w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <EmailIcon className="fill-slate-500 dark:fill-slate-400 transition-colors" width="16" height="11" />
        <input
          type="email"
          placeholder="Correo electrónico"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors"
          required
        />
      </div>
      <div className="flex items-center mt-6 w-full bg-transparent border border-slate-300/60 dark:border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <LockIcon className="fill-slate-500 dark:fill-slate-400 transition-colors" width="13" height="17" />
        <input
          type="password"
          placeholder="Contraseña"
          className="bg-transparent text-slate-500/80 dark:text-slate-200 placeholder-slate-500/80 dark:placeholder-slate-500 outline-none text-sm w-full h-full transition-colors"
          required
        />
      </div>
      <div className="w-full flex items-center justify-between mt-8 text-slate-500/80 dark:text-slate-400 transition-colors">
        <div className="flex items-center gap-2">
          <input
            className="h-5 w-5 text-sky-500 focus:ring-sky-400 border-slate-300 dark:border-white/10 rounded bg-transparent"
            type="checkbox"
            id="checkbox"
          />
          <label className="text-sm" htmlFor="checkbox">
            Recuérdame
          </label>
        </div>
        <a className="text-sm underline hover:text-sky-500" href="#">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
      <button
        type="submit"
        className="mt-8 w-full h-11 rounded-full cursor-pointer text-white bg-sky-500 hover:opacity-90 transition-opacity font-medium shadow-lg shadow-sky-500/30"
      >
        Iniciar sesión
      </button>
      <p className="text-slate-500/90 dark:text-slate-400 text-sm mt-4 transition-colors">
        ¿No tienes una cuenta?{" "}
        <a className="text-sky-400 hover:underline" href="#">
          Regístrate
        </a>
      </p>
    </form>
  );
}
