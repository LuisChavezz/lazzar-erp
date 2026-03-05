"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClientesIcon, EmbarquesIcon, TaxIcon } from "@/src/components/Icons";
import { useCustomerStore } from "../stores/customer.store";
import { CustomerFormSchema, CustomerFormValues } from "../schemas/customer.schema";
import { CustomerItem } from "../interfaces/customer.interface";
import toast from "react-hot-toast";

interface CustomerFormProps {
  onCreated: (customer: CustomerItem) => void;
  sellerName: string;
}

const defaultValues: CustomerFormValues = {
  razonSocial: "",
  contacto: "",
  telefono: "",
  correo: "",
  rfc: "",
  regimenFiscal: "601",
  direccionFiscal: "",
  coloniaFiscal: "",
  codigoPostalFiscal: "",
  ciudadFiscal: "",
  estadoFiscal: "",
  giroEmpresa: "",
  destinatario: "",
  empresaEnvio: "",
  telefonoEnvio: "",
  celularEnvio: "",
  direccionEnvio: "",
  coloniaEnvio: "",
  codigoPostalEnvio: "",
  ciudadEnvio: "",
  estadoEnvio: "",
  referenciasEnvio: "",
};

const formatDate = (value: Date) =>
  value.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function CustomerForm({ onCreated, sellerName }: CustomerFormProps) {
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema),
    defaultValues,
  });

  const onSubmit = (data: CustomerFormValues) => {
    setIsLoading(true);
    try {
      const createdCustomer: CustomerItem = {
        razonSocial: data.razonSocial,
        contacto: data.contacto,
        telefono: data.telefono,
        correo: data.correo,
        ultimaCompra: formatDate(new Date()),
        ultimoPedido: "—",
        vendedor: sellerName,
        orderProfile: {
          clienteNombre: data.contacto,
          razonSocial: data.razonSocial,
          rfc: data.rfc,
          regimenFiscal: data.regimenFiscal,
          direccionFiscal: data.direccionFiscal,
          coloniaFiscal: data.coloniaFiscal,
          codigoPostalFiscal: data.codigoPostalFiscal,
          ciudadFiscal: data.ciudadFiscal,
          estadoFiscal: data.estadoFiscal,
          giroEmpresa: data.giroEmpresa,
          destinatario: data.destinatario,
          empresaEnvio: data.empresaEnvio,
          telefonoEnvio: data.telefonoEnvio,
          celularEnvio: data.celularEnvio,
          direccionEnvio: data.direccionEnvio,
          coloniaEnvio: data.coloniaEnvio,
          codigoPostalEnvio: data.codigoPostalEnvio,
          ciudadEnvio: data.ciudadEnvio,
          estadoEnvio: data.estadoEnvio,
          referenciasEnvio: data.referenciasEnvio?.trim() || "",
        },
      };
      addCustomer(createdCustomer);
      toast.success("Cliente registrado correctamente");
      onCreated(createdCustomer);
      reset(defaultValues);
    } catch {
      toast.error("No se pudo guardar el cliente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <ClientesIcon className="w-4 h-4" />
              Información General
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                label="Razón social"
                placeholder="Razón social"
                {...register("razonSocial")}
                error={errors.razonSocial}
              />
              <FormInput
                label="Nombre"
                placeholder="Nombre de cliente"
                {...register("contacto")}
                error={errors.contacto}
              />
              <FormInput
                label="Teléfono"
                placeholder="Teléfono"
                {...register("telefono")}
                error={errors.telefono}
              />
              <FormInput
                label="Correo"
                placeholder="correo@empresa.com"
                {...register("correo")}
                error={errors.correo}
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <TaxIcon className="w-4 h-4" />
              Datos Fiscales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                label="RFC"
                placeholder="RFC"
                {...register("rfc")}
                error={errors.rfc}
              />
              <FormSelect
                label="Régimen Fiscal"
                options={[
                  { value: "601", label: "601 - General de Ley" },
                  { value: "603", label: "603 - Personas Morales" },
                  { value: "605", label: "605 - Sueldos y Salarios" },
                ]}
                {...register("regimenFiscal")}
                error={errors.regimenFiscal}
              />
              <FormInput
                label="Dirección fiscal"
                placeholder="Dirección fiscal"
                {...register("direccionFiscal")}
                error={errors.direccionFiscal}
              />
              <FormInput
                label="Colonia"
                placeholder="Colonia"
                {...register("coloniaFiscal")}
                error={errors.coloniaFiscal}
              />
              <FormInput
                label="Código Postal"
                placeholder="C.P."
                {...register("codigoPostalFiscal")}
                error={errors.codigoPostalFiscal}
              />
              <FormInput
                label="Ciudad"
                placeholder="Ciudad"
                {...register("ciudadFiscal")}
                error={errors.ciudadFiscal}
              />
              <FormInput
                label="Estado"
                placeholder="Estado"
                {...register("estadoFiscal")}
                error={errors.estadoFiscal}
              />
              <FormInput
                label="Giro de la empresa"
                placeholder="Giro de la empresa"
                {...register("giroEmpresa")}
                error={errors.giroEmpresa}
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <EmbarquesIcon className="w-4 h-4" />
              Datos de Envío
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                label="Destinatario"
                placeholder="Destinatario"
                {...register("destinatario")}
                error={errors.destinatario}
              />
              <FormInput
                label="Empresa de envío"
                placeholder="Empresa de envío"
                {...register("empresaEnvio")}
                error={errors.empresaEnvio}
              />
              <FormInput
                label="Teléfono de envío"
                placeholder="Teléfono"
                {...register("telefonoEnvio")}
                error={errors.telefonoEnvio}
              />
              <FormInput
                label="Celular de envío"
                placeholder="Celular"
                {...register("celularEnvio")}
                error={errors.celularEnvio}
              />
              <FormInput
                label="Dirección de envío"
                placeholder="Dirección"
                {...register("direccionEnvio")}
                error={errors.direccionEnvio}
              />
              <FormInput
                label="Colonia de envío"
                placeholder="Colonia"
                {...register("coloniaEnvio")}
                error={errors.coloniaEnvio}
              />
              <FormInput
                label="Código Postal"
                placeholder="C.P."
                {...register("codigoPostalEnvio")}
                error={errors.codigoPostalEnvio}
              />
              <FormInput
                label="Ciudad"
                placeholder="Ciudad"
                {...register("ciudadEnvio")}
                error={errors.ciudadEnvio}
              />
              <FormInput
                label="Estado"
                placeholder="Estado"
                {...register("estadoEnvio")}
                error={errors.estadoEnvio}
              />
              <FormInput
                label="Referencias"
                placeholder="Referencias"
                {...register("referenciasEnvio")}
                error={errors.referenciasEnvio}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset(defaultValues)} disabled={isLoading} />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            Guardar Cliente
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
