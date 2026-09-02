"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * Tarjeta de sección del formulario de empleados.
 *
 * Es una extracción LITERAL del markup que ya repetían en línea las secciones
 * "Datos Personales" y "Datos Laborales": mismas clases, misma cabecera con el
 * icono en cuadro redondeado y mismo contenedor de rejilla. Al pasar de 2 a 7
 * secciones, repetirlo siete veces convertía el archivo en ruido.
 *
 * Vive dentro de la feature y no en `src/components/` a propósito: el resto de
 * formularios del proyecto (CustomerForm, SupplierForm...) siguen con su markup
 * en línea, y migrarlos es una decisión aparte.
 */
interface FormSectionProps {
  title: string;
  subtitle: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
}

const sectionClassName =
  "bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8";

export const FormSection = ({ title, subtitle, icon: Icon, children }: FormSectionProps) => (
  <section className={sectionClassName}>
    <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
          {title}
        </h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>

    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>
    </div>
  </section>
);
