"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CompanyFormSchema, CompanyFormValues } from "../schemas/companiesFormSchema";
import { PhotoIcon, BuildingIcon, SettingsIcon } from "../../../components/Icons";
import { useRegisterCompany } from "../hooks/useRegisterCompany";

export const CompanyRegistrationForm = () => {


  const { mutate: registerCompany, isPending } = useRegisterCompany();


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: {
      // codigo: "",
      // razon_social: "",
      // nombre_comercial: "",
      // rfc: "",
      // email_contacto: "",
      // telefono: "",
      // sitio_web: "",
      // moneda_base: "MXN",
      // timezone: "America/Mexico_City",
      // idioma: "es-MX",
      // estatus: "activo",
      // logo_url: "",

      // ? Filled fields
      codigo: "ABC123",
      razon_social: "Empresa XYZ",
      nombre_comercial: "Empresa XYZ",
      rfc: "XAXX010101000",
      email_contacto: "contacto@empresaxyz.com",
      telefono: "5551234567",
      sitio_web: "https://www.empresaxyz.com",
      moneda_base: "MXN",
      timezone: "America/New_York",
      idioma: "en-US",
      estatus: "activo",
      logo_url: "https://www.empresaxyz.com/logo.png",
    },
  });

  // Handle form submission
  const onSubmit = (values: CompanyFormValues) => {
    registerCompany(values); // Mutation to register company
  };

  return (
    <form id="company-registration-form" onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        {/* 1. Identificación del Cliente (Hero Card) */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-4xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-soft dark:shadow-none group hover:border-brand-200 dark:hover:border-brand-900 transition-colors duration-300">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
            {/* Logo Upload (mapped to logo_url) */}
            <div className="shrink-0 relative group/logo">
              <div className="w-36 h-36 rounded-3xl bg-slate-50 dark:bg-black/20 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 transition-all hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 cursor-pointer overflow-hidden shadow-inner relative">
                <PhotoIcon className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Logotipo
                </span>
                {/* Actual input overlay */}
                <input
                  type="text"
                  placeholder="URL del Logo"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  {...register("logo_url")}
                />
              </div>
              {/* Show URL if entered? Or just leave it hidden for now as it's a mock upload UI */}
              {/* We can show a small input below if needed */}
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="URL del Logo"
                  className="w-36 text-xs bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-brand-500 outline-none"
                  {...register("logo_url")}
                />
              </div>
            </div>

            {/* Main Info Inputs */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2 lg:col-span-3 group/field">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500 px-1 py-2 text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 outline-none transition-colors"
                  placeholder="Empresa S.A. de C.V."
                  {...register("razon_social")}
                />
                {errors.razon_social && (
                  <p className="text-xs text-red-600 mt-1">{errors.razon_social.message}</p>
                )}
              </div>

              <div className="group/field">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
                  Código
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:focus:bg-black/40 transition-all placeholder-slate-400"
                  placeholder="Código"
                  {...register("codigo")}
                />
                {errors.codigo && (
                  <p className="text-xs text-red-600 mt-1">{errors.codigo.message}</p>
                )}
              </div>

              <div className="md:col-span-2 lg:col-span-3 group/field">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
                  Nombre Comercial
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:focus:bg-black/40 transition-all placeholder-slate-400"
                  placeholder="Mi Empresa"
                  {...register("nombre_comercial")}
                />
                {errors.nombre_comercial && (
                  <p className="text-xs text-red-600 mt-1">{errors.nombre_comercial.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Left Column: Fiscal, Contact */}
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-4xl border border-slate-200 dark:border-white/5 shadow-soft dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
                  <BuildingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Información General
                  </h3>
                  <p className="text-xs text-slate-500">Datos fiscales y de contacto</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Datos Fiscales */}
                <div>
                  <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                    </span>
                    Datos Fiscales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                        RFC
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder-slate-300"
                        placeholder="XAXX010101000"
                        {...register("rfc")}
                      />
                      {errors.rfc && (
                        <p className="text-xs text-red-600 mt-1">{errors.rfc.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-white/5"></div>

                {/* Contacto */}
                <div>
                  <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-brand-500"></span>
                    Contacto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                        Email de Contacto
                      </label>
                      <input
                        type="email"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        {...register("email_contacto")}
                      />
                      {errors.email_contacto && (
                        <p className="text-xs text-red-600 mt-1">{errors.email_contacto.message}</p>
                      )}
                    </div>
                    <div className="group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        {...register("telefono")}
                      />
                      {errors.telefono && (
                        <p className="text-xs text-red-600 mt-1">{errors.telefono.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                        Sitio Web
                      </label>
                      <input
                        type="url"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        placeholder="https://..."
                        {...register("sitio_web")}
                      />
                      {errors.sitio_web && (
                        <p className="text-xs text-red-600 mt-1">{errors.sitio_web.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Config */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-4xl border border-slate-200 dark:border-white/5 shadow-soft dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Configuración
                  </h3>
                  <p className="text-xs text-slate-500">Preferencias del sistema</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                    Moneda Base
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    {...register("moneda_base")}
                  >
                    <option value="MXN">Peso Mexicano (MXN)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                  {errors.moneda_base && (
                    <p className="text-xs text-red-600 mt-1">{errors.moneda_base.message}</p>
                  )}
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                    Zona Horaria
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    {...register("timezone")}
                  >
                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                  </select>
                  {errors.timezone && (
                    <p className="text-xs text-red-600 mt-1">{errors.timezone.message}</p>
                  )}
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                    Idioma
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    {...register("idioma")}
                  >
                    <option value="es-MX">Español (México)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español (España)</option>
                  </select>
                  {errors.idioma && (
                    <p className="text-xs text-red-600 mt-1">{errors.idioma.message}</p>
                  )}
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-brand-500">
                    Estatus
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    {...register("estatus")}
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                  {errors.estatus && (
                    <p className="text-xs text-red-600 mt-1">{errors.estatus.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            disabled={isPending}
            className={`rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 ${isPending ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={() => reset()}
          >
            Limpiar
          </button>
        </div>
      </fieldset>
    </form>
  );
};
