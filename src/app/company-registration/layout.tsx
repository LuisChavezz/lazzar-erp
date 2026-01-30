import React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "../../components/Icons";
import { SaveButton } from "@/src/features/company-registration-form/components/SaveButton";


export const metadata = {
  title: "Alta de Empresa | Registro Nuevo",
  description: "Formulario de alta para registrar una nueva empresa en el sistema.",
};


export default function CompanyRegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50/80 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 min-h-screen pb-32 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/90 dark:bg-black/80 border-b border-slate-200/80 dark:border-white/10 supports-backdrop-filter:bg-white/60">
        <div className="max-w-480 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 sm:h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-brand-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-glow"
              >
                <ArrowLeftIcon className="w-5 h-5 transform group-hover:-translate-x-0.5 transition-transform" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                  Alta de Empresa
                </h1>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Registro Nuevo
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SaveButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-480 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {children}
      </main>
    </div>
  );
}
