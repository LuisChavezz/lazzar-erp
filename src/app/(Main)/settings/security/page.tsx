import { ChangePasswordForm } from "@/src/features/settings/components/ChangePasswordForm";
import { GoogleAccountCard } from "@/src/features/google/components/GoogleAccountCard";

export default function SettingsSecurityPage() {
  return (
    <section className="w-full space-y-4">
      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Seguridad</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Protección de la cuenta</h1>
      </header>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <ChangePasswordForm />

        <div className="space-y-4">
          {/* Tarjeta de conexión con Google */}
          <GoogleAccountCard />

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-6 space-y-4 h-fit">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Autenticación adicional</h2>
            <div className="space-y-3">
              <div className="rounded-xl bg-white/70 dark:bg-slate-900 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">MFA por aplicación</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Protección recomendada para accesos remotos.</p>
                </div>
                <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                  Activar
                </button>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-slate-900 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Cierre forzado de sesiones</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Cierra todos los dispositivos excepto el actual.</p>
                </div>
                <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                  Cerrar sesiones
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

