"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiscalAddressSchema, FiscalAddressFormValues } from "../schemas/fiscal-address.schema";
import { useSatStore } from "../stores/sat.store";
import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MapPinIcon } from "@/src/components/Icons";

interface FiscalAddressFormProps {
  onSuccess: () => void;
}

export default function FiscalAddressForm({ onSuccess }: FiscalAddressFormProps) {
  const { fiscalAddress, setFiscalAddress } = useSatStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FiscalAddressFormValues>({
    resolver: zodResolver(FiscalAddressSchema),
    defaultValues: {
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      colonia: "",
      localidad: "",
      municipio: "",
      estado: "",
      pais: "México",
      codigo_postal: "",
    },
    values: fiscalAddress || undefined,
  });

  const onSubmit = async (data: FiscalAddressFormValues) => {
    // Simular retraso de red
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setFiscalAddress(data);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-8">
        {/* Encabezado e Información Principal */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Ubicación
              </h3>
              <p className="text-xs text-slate-500">Detalles de la dirección fiscal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="Calle"
                placeholder="Ej. Av. Reforma"
                {...register("calle")}
                error={errors.calle}
              />
            </div>
            
            <FormInput
              label="Número Exterior"
              placeholder="Ej. 123"
              {...register("numero_exterior")}
              error={errors.numero_exterior}
            />

            <FormInput
              label="Número Interior"
              placeholder="Ej. Depto 4B (Opcional)"
              {...register("numero_interior")}
              error={errors.numero_interior}
            />

            <FormInput
              label="Colonia"
              placeholder="Ej. Centro"
              {...register("colonia")}
              error={errors.colonia}
            />

            <FormInput
              label="Código Postal"
              placeholder="Ej. 06000"
              maxLength={5}
              {...register("codigo_postal")}
              error={errors.codigo_postal}
            />
          </div>
        </section>

        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Localidad"
              placeholder="Ej. Ciudad de México (Opcional)"
              {...register("localidad")}
              error={errors.localidad}
            />

            <FormInput
              label="Municipio / Alcaldía"
              placeholder="Ej. Cuauhtémoc"
              {...register("municipio")}
              error={errors.municipio}
            />

            <FormInput
              label="Estado"
              placeholder="Ej. Ciudad de México"
              {...register("estado")}
              error={errors.estado}
            />

            <FormInput
              label="País"
              placeholder="Ej. México"
              {...register("pais")}
              error={errors.pais}
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <FormCancelButton onClick={() => reset()} disabled={isSubmitting} />
          <FormSubmitButton
            isPending={isSubmitting}
            loadingLabel="Guardando..."
          >
            Guardar Dirección
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
