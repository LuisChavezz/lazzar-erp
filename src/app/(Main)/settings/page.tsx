import { settingSections } from "@/src/features/settings/constants/settingSections";
import Link from "next/link";



export default function SettingsPage() {
  return (
    <section className="w-full space-y-6">
      <header className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Cuenta</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Ajustes</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Ajusta tu perfil y seguridad en un mismo módulo. Este es el punto de entrada para las
          configuraciones de cuenta.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {settingSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950 p-5 transition-colors hover:border-sky-300 dark:hover:border-sky-500/40"
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{section.description}</p>
            <span className="mt-4 inline-flex text-sm font-medium text-sky-600 dark:text-sky-300">Abrir sección</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950 p-5 space-y-3 h-fit">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Estado de cuenta</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3">
              <p className="text-slate-500 dark:text-slate-400">Último acceso</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">Hoy, 09:24</p>
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3">
              <p className="text-slate-500 dark:text-slate-400">Sesiones activas</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">3 dispositivos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950 p-5 space-y-3 h-fit">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sugerencias de configuración</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3">Completa tu perfil para mejorar auditoría.</li>
            <li className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3">Activa 2FA para reforzar seguridad.</li>
            <li className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3">Revisa dispositivos activos periódicamente.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
