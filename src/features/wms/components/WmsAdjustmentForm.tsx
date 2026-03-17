"use client";

import { useMemo, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { Loader } from "@/src/components/Loader";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { useLocations } from "@/src/features/locations/hooks/useLocations";
import {
  WmsAdjustmentFormValues,
  WmsAdjustmentSchema,
} from "../schemas/wms-adjustment.schema";
import { WmsAdjustmentReason } from "../interfaces/wms-adjustment.interface";
import { useWmsAdjustmentStore } from "../stores/wms-adjustment.store";

const motivoOptions: { value: WmsAdjustmentReason; label: string }[] = [
  { value: "Conteo físico", label: "Conteo físico" },
  { value: "Merma", label: "Merma" },
  { value: "Error sistema", label: "Error sistema" },
  { value: "Producto dañado", label: "Producto dañado" },
];

export const WmsAdjustmentForm = () => {
  const addAdjustment = useWmsAdjustmentStore((state) => state.addAdjustment);
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";
  const { products = [], isLoading: productsLoading } = useProducts();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const isLoadingFormData = productsLoading || locationsLoading;

  const productoOptions = useMemo(
    () => {
      if (products.length > 0) {
        return Array.from(new Set(products.map((product) => product.nombre))).map(
          (producto) => ({
            value: producto,
            label: producto,
          })
        );
      }
      return [];
    },
    [products]
  );

  const ubicacionOptions = useMemo(
    () =>
      locations
        .filter((location) => location.estatus === "ACTIVO")
        .map((location) => ({
          value: String(location.id_ubicacion),
          label: `Ubicación ${location.id_ubicacion} · P${location.pasillo} · R${location.rack}`,
        })),
    [locations]
  );

  const defaultProducto = productoOptions[0]?.value ?? "";
  const defaultUbicacion = ubicacionOptions[0]?.value ?? "";
  const defaultCantidadActual = 0;

  const defaultValues: WmsAdjustmentFormValues = {
    producto: defaultProducto,
    ubicacion: defaultUbicacion,
    cantidadActual: defaultCantidadActual,
    cantidadCorrecta: defaultCantidadActual,
    motivo: "Conteo físico",
  };
  const [cantidadActualView, setCantidadActualView] = useState(defaultCantidadActual);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WmsAdjustmentFormValues>({
    resolver: zodResolver(WmsAdjustmentSchema) as Resolver<WmsAdjustmentFormValues>,
    defaultValues,
  });

  const onSubmit = async (values: WmsAdjustmentFormValues) => {
    addAdjustment({
      ...values,
      usuario: userName,
    });
    toast.success("Ajuste guardado correctamente");
    reset(defaultValues);
    setCantidadActualView(defaultCantidadActual);
  };

  const productoField = register("producto", {
    onChange: (e) => {
      if (e.target.value) {
        setValue("cantidadActual", 0, { shouldValidate: true });
        setCantidadActualView(0);
      }
    },
  });
  const ubicacionField = register("ubicacion", {
    onChange: (e) => {
      if (e.target.value) {
        setValue("cantidadActual", 0, { shouldValidate: true });
        setCantidadActualView(0);
      }
    },
  });
  const motivoField = register("motivo");

  if (isLoadingFormData) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6">
        <Loader className="py-12" title="Cargando datos" message="Cargando productos y ubicaciones..." />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Ajustes de inventario
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Motivo obligatorio
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <FormSelect
              label="Producto"
              options={productoOptions}
              {...productoField}
              error={errors.producto}
            />
          </div>

          <div className="w-full">
            <FormSelect
              label="Ubicación"
              options={ubicacionOptions}
              {...ubicacionField}
              error={errors.ubicacion}
            />
          </div>

          <div className="w-full">
            <FormInput
              label="Cantidad actual"
              type="number"
              readOnly
              disabled
              value={String(cantidadActualView)}
              {...register("cantidadActual", { valueAsNumber: true })}
              error={errors.cantidadActual}
            />
          </div>

          <div className="w-full">
            <FormInput
              label="Cantidad correcta"
              type="number"
              placeholder="Ej: 120"
              {...register("cantidadCorrecta", {
                valueAsNumber: true,
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
              error={errors.cantidadCorrecta}
            />
          </div>
        </div>

        <div className="w-full">
          <FormSelect
            label="Motivo"
            options={motivoOptions}
            {...motivoField}
            error={errors.motivo}
          />
        </div>

        <div className="flex justify-end">
          <FormSubmitButton isPending={isSubmitting}>Guardar ajuste</FormSubmitButton>
        </div>
      </form>
    </div>
  );
};
